document.addEventListener('DOMContentLoaded', async function() {
    const eventsContainer = document.getElementById('events-feed');
    const notificationBtn = document.getElementById('notification-btn');
    const notificationPopup = document.getElementById('notification-popup');
    const notificationList = document.getElementById('notification-list');
    let events = [];
    let user = null;
    let filteredEvents = [];
    let notifications = [];

    // Custom red marker icon
    const redMarkerIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    // Create filter section with styling
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    filterSection.innerHTML = `
        <div class="filter-group">
            <label for="filter-search">Поиск по названию:</label>
            <input type="text" id="filter-search" class="filter-input" placeholder="Введите название">
        </div>
        <div class="filter-group">
            <label for="filter-date-from">Дата (от):</label>
            <input type="date" id="filter-date-from" value="2025-05-04" class="filter-input">
        </div>
        <div class="filter-group">
            <label for="filter-date-to">Дата (до):</label>
            <input type="date" id="filter-date-to" value="2025-12-31" class="filter-input">
        </div>
        <div class="filter-group">
            <label for="filter-time">Время (от):</label>
            <input type="time" id="filter-time" value="00:00" class="filter-input">
        </div>
        <div class="filter-group">
            <label for="filter-min-distance">Мин. длина (км):</label>
            <input type="number" id="filter-min-distance" min="0" value="0" step="0.1" class="filter-input">
        </div>
        <div class="filter-group">
            <label for="filter-max-distance">Макс. длина (км):</label>
            <input type="number" id="filter-max-distance" min="0" value="1000" step="0.1" class="filter-input">
        </div>
        <div class="filter-group">
            <label for="filter-past-events">Прошедшие:</label>
            <input type="checkbox" id="filter-past-events" class="filter-input checkbox">
        </div>
    `;
    eventsContainer.parentNode.insertBefore(filterSection, eventsContainer);

    // Debounce function to limit re-rendering frequency
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Apply filters and render
    function applyFilters() {
        const filterSearch = document.getElementById('filter-search').value.toLowerCase();
        const filterDateFrom = document.getElementById('filter-date-from').value;
        const filterDateTo = document.getElementById('filter-date-to').value;
        const filterTime = document.getElementById('filter-time').value;
        const minDistance = parseFloat(document.getElementById('filter-min-distance').value) || 0;
        const maxDistance = parseFloat(document.getElementById('filter-max-distance').value) || Infinity;
        const includePast = document.getElementById('filter-past-events').checked;

        const currentDateTimeFrom = filterDateFrom ? new Date(filterDateFrom + 'T' + filterTime) : new Date('2025-01-01T00:00');
        const currentDateTimeTo = filterDateTo ? new Date(filterDateTo + 'T' + filterTime) : new Date('2025-12-31T23:59');
        const now = new Date('2025-06-08T11:16:00-04:00'); // Current date and time

        filteredEvents = events.filter(event => {
            try {
                // Parse event date
                const eventDateParts = event.date.split('-');
                const eventDate = new Date(eventDateParts[0], eventDateParts[1] - 1, eventDateParts[2]);
                if (isNaN(eventDate.getTime())) {
                    console.warn(`Некорректная дата у события ${event.id}: ${event.date}`);
                    return false;
                }

                // Parse event time, default to 00:00 if not specified
                let eventDateTime = new Date(eventDate);
                if (event.time) {
                    const [hours, minutes] = event.time.split(':').map(Number);
                    eventDateTime.setHours(hours, minutes, 0, 0);
                } else {
                    eventDateTime.setHours(0, 0, 0, 0);
                }

                // Apply date range filter
                const dateMatches = (!filterDateFrom || eventDateTime >= currentDateTimeFrom) &&
                                  (!filterDateTo || eventDateTime <= currentDateTimeTo);

                // Apply distance filter
                const distance = event.distance || 0;
                const distanceMatches = distance >= minDistance && distance <= maxDistance;

                // Apply search filter
                const titleMatches = !filterSearch || event.title.toLowerCase().includes(filterSearch);

                // Apply past/upcoming filter
                const isPast = eventDateTime < now;
                const timeMatches = includePast ? isPast : !isPast;

                console.log(`Событие ${event.id} (${event.date} ${event.time || '00:00'}, ${distance} км): Дата совпадает=${dateMatches}, Длина совпадает=${distanceMatches}, Название совпадает=${titleMatches}, Время совпадает=${timeMatches}`);
                return dateMatches && distanceMatches && titleMatches && timeMatches;
            } catch (e) {
                console.warn(`Ошибка при парсinge даты/времени для события ${event.id}:`, e);
                return false;
            }
        });
        console.log('После фильтрации осталось мероприятий:', filteredEvents.length);
        renderEvents(filteredEvents);
    }

    // Debounced version of applyFilters
    const debouncedApplyFilters = debounce(applyFilters, 300);

    // Check user session
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            user = { id: result.userId, login: result.login };
            console.log('Пользователь авторизован:', user);
        } else {
            console.log('Пользователь не авторизован');
            notificationBtn.style.display = 'none'; // Hide notification button if not logged in
        }
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
        notificationBtn.style.display = 'none'; // Hide notification button if session check fails
    }

    // Fetch all events
    try {
        const response = await fetch('http://localhost:3000/api/all-events', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            events = result.events || [];
            console.log('Получено мероприятий:', events.length);
            applyFilters(); // Initial call to load events
        } else {
            throw new Error(result.error || 'Ошибка при загрузке мероприятий');
        }
    } catch (e) {
        console.error('Ошибка при загрузке мероприятий:', e);
        const errorEl = document.createElement('p');
        errorEl.className = 'no-events';
        errorEl.textContent = 'Не удалось загрузить мероприятия';
        eventsContainer.appendChild(errorEl);
    }

    // Fetch notifications
    async function fetchNotifications() {
        if (!user) return;
        try {
            const response = await fetch('http://localhost:3000/api/notifications', {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                notifications = result.notifications || [];
                console.log('Получено уведомлений:', notifications.length);
                renderNotifications();
                updateNotificationButton();
            } else {
                console.error('Ошибка при получении уведомлений:', result.error);
            }
        } catch (e) {
            console.error('Ошибка при получении уведомлений:', e);
        }
    }

    // Check for upcoming events (within 1 hour) and create notifications
    async function checkUpcomingEvents() {
        if (!user) return;
        const now = new Date('2025-06-08T11:16:00-04:00'); // Current date and time
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Load dismissed notification IDs from localStorage
        let dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
        if (!dismissedNotifications[user.id]) {
            dismissedNotifications[user.id] = new Set();
        }

        const upcomingEvents = events.filter(event => {
            try {
                const eventDateParts = event.date.split('-');
                const eventDate = new Date(eventDateParts[0], eventDateParts[1] - 1, eventDateParts[2]);
                if (isNaN(eventDate.getTime())) return false;

                let eventDateTime = new Date(eventDate);
                if (event.time) {
                    const [hours, minutes] = event.time.split(':').map(Number);
                    eventDateTime.setHours(hours, minutes, 0, 0);
                } else {
                    eventDateTime.setHours(0, 0, 0, 0);
                }

                // Check if the user is the creator or a participant
                const isInvolved = event.user_id === user.id || event.participants.includes(user.login);
                const isWithinHour = eventDateTime >= now && eventDateTime <= oneHourFromNow;
                return isInvolved && isWithinHour;
            } catch (e) {
                console.warn(`Ошибка при парсinge даты/времени для события ${event.id}:`, e);
                return false;
            }
        });

        for (const event of upcomingEvents) {
            const message = `Напоминание: мероприятие "${event.title}" начнется через час!`;
            const notificationKey = `${event.id}_${eventDateTime.toISOString().split('T')[0]}`; // Unique key based on event ID and date

            // Check if this notification has been dismissed
            if (!dismissedNotifications[user.id].has(notificationKey)) {
                // Check if a similar notification already exists and is unread
                const existingNotification = notifications.find(n => n.message === message && !n.is_read);
                if (!existingNotification) {
                    try {
                        const response = await fetch('http://localhost:3000/api/notifications', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include',
                            body: JSON.stringify({
                                user_id: user.id,
                                message: message
                            })
                        });
                        const result = await response.json();
                        if (result.success) {
                            await fetchNotifications();
                        }
                    } catch (e) {
                        console.error('Ошибка при создании уведомления о предстоящем мероприятии:', e);
                    }
                }
            }
        }
    }

    // Render notifications in the popup
    function renderNotifications() {
        notificationList.innerHTML = '';
        if (notifications.length === 0) {
            const emptyEl = document.createElement('p');
            emptyEl.className = 'no-notifications';
            emptyEl.textContent = 'Нет уведомлений';
            notificationList.appendChild(emptyEl);
            return;
        }

        notifications.forEach(notification => {
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification-item';
            if (!notification.is_read) {
                notificationEl.classList.add('unread');
            }
            notificationEl.textContent = notification.message;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-btn';
            deleteBtn.innerHTML = '×';
            deleteBtn.addEventListener('click', async (e) => {
                e.stopPropagation();
                try {
                    const response = await fetch(`http://localhost:3000/api/notifications/${notification.id}`, {
                        method: 'DELETE',
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (result.success) {
                        // Mark as dismissed in localStorage
                        let dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
                        if (!dismissedNotifications[user.id]) {
                            dismissedNotifications[user.id] = new Set();
                        }
                        const eventMatch = notification.message.match(/мероприятие "([^"]+)"/);
                        if (eventMatch) {
                            const eventTitle = eventMatch[1];
                            const event = events.find(e => e.title === eventTitle);
                            if (event) {
                                const notificationKey = `${event.id}_${new Date(event.date).toISOString().split('T')[0]}`;
                                dismissedNotifications[user.id].add(notificationKey);
                                localStorage.setItem('dismissedNotifications', JSON.stringify(dismissedNotifications));
                            }
                        }
                        notifications = notifications.filter(n => n.id !== notification.id);
                        renderNotifications();
                        updateNotificationButton();
                    } else {
                        console.error('Ошибка при удалении уведомления:', result.error);
                    }
                } catch (e) {
                    console.error('Ошибка при удалении уведомления:', e);
                }
            });

            notificationEl.appendChild(deleteBtn);
            notificationList.appendChild(notificationEl);
        });
    }

    // Update notification button highlight
    function updateNotificationButton() {
        const hasUnread = notifications.some(n => !n.is_read);
        if (hasUnread) {
            notificationBtn.classList.add('unread');
        } else {
            notificationBtn.classList.remove('unread');
        }
    }

    // Mark notifications as read when popup is opened
    async function markNotificationsAsRead() {
        const unreadNotifications = notifications.filter(n => !n.is_read);
        for (const notification of unreadNotifications) {
            try {
                const response = await fetch(`http://localhost:3000/api/notifications/${notification.id}/read`, {
                    method: 'PUT',
                    credentials: 'include'
                });
                const result = await response.json();
                if (result.success) {
                    notification.is_read = 1;
                }
            } catch (e) {
                console.error('Ошибка при пометке уведомления как прочитанного:', e);
            }
        }
        renderNotifications();
        updateNotificationButton();
    }

    // Toggle notification popup
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling up unnecessarily
        const isVisible = notificationPopup.style.display === 'flex';
        if (isVisible) {
            notificationPopup.style.display = 'none';
        } else {
            notificationPopup.style.display = 'flex';
            markNotificationsAsRead();
        }
    });

    // Ensure the icon click also triggers the button
    const notificationIcon = document.querySelector('.notification-icon');
    if (notificationIcon) {
        notificationIcon.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            notificationBtn.click(); // Trigger the button's click event
        });
    }

    // Close popup when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationPopup.contains(e.target) && e.target !== notificationBtn && e.target !== notificationIcon) {
            notificationPopup.style.display = 'none';
        }
    });

    // Periodically fetch notifications and check upcoming events
    if (user) {
        await fetchNotifications();
        await checkUpcomingEvents();
        setInterval(async () => {
            await fetchNotifications();
            await checkUpcomingEvents();
        }, 60000); // Check every minute
    }

    // Add event listeners for real-time filtering
    ['filter-search', 'filter-date-from', 'filter-date-to', 'filter-time', 'filter-min-distance', 'filter-max-distance', 'filter-past-events'].forEach(id => {
        document.getElementById(id).addEventListener('input', debouncedApplyFilters);
    });

    // Render events
    function renderEvents(events) {
        eventsContainer.innerHTML = '';
        if (!Array.isArray(events) || events.length === 0) {
            const noEventsEl = document.createElement('p');
            noEventsEl.className = 'no-events';
            noEventsEl.textContent = 'Нет подходящих мероприятий';
            eventsContainer.appendChild(noEventsEl);
            return;
        }

        events.forEach(event => {
            const eventEl = document.createElement('div');
            eventEl.className = 'event-card';

            const titleEl = document.createElement('h3');
            titleEl.textContent = event.title || 'Без названия';
            eventEl.appendChild(titleEl);

            const dateEl = document.createElement('p');
            dateEl.className = 'event-date';
            const eventDate = new Date(event.date);
            dateEl.textContent = `Дата: ${eventDate.getDate()}.${eventDate.getMonth() + 1}.${eventDate.getFullYear()}`;
            eventEl.appendChild(dateEl);

            const timeEl = document.createElement('p');
            timeEl.className = 'event-time';
            timeEl.textContent = `Время: ${event.time || 'Не указано'}`;
            eventEl.appendChild(timeEl);

            const creatorEl = document.createElement('p');
            creatorEl.className = 'event-creator';
            creatorEl.textContent = `Организатор: ${event.creator || 'Неизвестный пользователь'}`;
            eventEl.appendChild(creatorEl);

            const participantsEl = document.createElement('p');
            participantsEl.className = 'event-participants';
            const participants = Array.isArray(event.participants) ? event.participants : [];
            participantsEl.textContent = `Участники: ${participants.length}`;
            eventEl.appendChild(participantsEl);

            const descriptionEl = document.createElement('div');
            descriptionEl.className = 'event-description-container';
            const descriptionText = event.description || 'Нет описания';
            if (descriptionText.length > 100) {
                const shortText = descriptionText.substring(0, 100) + '...';
                descriptionEl.innerHTML = `
                    <span class="event-description short">${shortText}</span>
                    <span class="event-description full" style="display: none;">${descriptionText}</span>
                    <button class="toggle-description-btn">Развернуть</button>
                `;
                descriptionEl.querySelector('.toggle-description-btn').addEventListener('click', function() {
                    const short = descriptionEl.querySelector('.event-description.short');
                    const full = descriptionEl.querySelector('.event-description.full');
                    const btn = this;
                    if (full.style.display === 'none') {
                        short.style.display = 'none';
                        full.style.display = 'block';
                        btn.textContent = 'Свернуть';
                    } else {
                        short.style.display = 'block';
                        full.style.display = 'none';
                        btn.textContent = 'Развернуть';
                    }
                });
            } else {
                descriptionEl.innerHTML = `<span class="event-description">${descriptionText}</span>`;
            }
            eventEl.appendChild(descriptionEl);

            const distanceEl = document.createElement('p');
            distanceEl.className = 'event-distance';
            distanceEl.textContent = `Длина маршрута: ${event.distance ? event.distance.toFixed(2) + ' км' : 'Не указана'}`;
            eventEl.appendChild(distanceEl);

            if (event.route_data) {
                console.log(`Попытка отобразить карту для события ${event.id} с route_data:`, event.route_data);
                // Create map container
                const mapContainer = document.createElement('div');
                mapContainer.className = 'event-map-container';
                mapContainer.id = `map-container-${event.id}`;
                mapContainer.style.display = 'block';

                // Create map element
                const mapEl = document.createElement('div');
                mapEl.className = 'event-map';
                mapEl.id = `map-${event.id}`; // Unique ID for each event
                mapContainer.appendChild(mapEl);

                eventEl.appendChild(mapContainer);

                // Render map directly with Leaflet
                setTimeout(() => {
                    try {
                        // Parse route_data
                        const routeData = typeof event.route_data === 'string' ? JSON.parse(event.route_data) : event.route_data;
                        if (!routeData.paths || !routeData.paths[0] || !routeData.paths[0].points) {
                            throw new Error('Некорректный формат route_data');
                        }

                        // Initialize Leaflet map
                        const map = L.map(`map-${event.id}`, {
                            zoomControl: true // Убедимся, что управление зумом включено
                        }).setView([56.8375, 60.5975], 13);

                        // Add tile layer
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                            zIndex: 1 // Устанавливаем z-index для слоя карты
                        }).addTo(map);

                        // Decode and render route
                        const path = routeData.paths[0];
                        const points = polyline.decode(path.points).map(coord => [coord[0], coord[1]]);
                        console.log(`Декодировано ${points.length} точек для события ${event.id}`);

                        if (points.length < 2) {
                            throw new Error('Недостаточно точек для построения маршрута');
                        }

                        const routePolyline = L.polyline(points, {
                            color: '#4a6fa5',
                            weight: 5,
                            opacity: 0.7,
                            zIndex: 2 // Устанавливаем z-index для маршрута
                        }).addTo(map);

                        // Render waypoints if available
                        if (path.snapped_waypoints) {
                            const waypointPoints = polyline.decode(path.snapped_waypoints).map(coord => [coord[0], coord[1]]);
                            waypointPoints.forEach((point, index) => {
                                const markerOptions = {
                                    zIndexOffset: 10
                                };
                                if (index === 0) {
                                    markerOptions.icon = redMarkerIcon; // Red icon for first waypoint
                                }
                                const marker = L.marker(point, markerOptions).addTo(map);
                            });
                            console.log(`Добавлено ${waypointPoints.length} путевых точек для события ${event.id}`);
                        }

                        const distanceKm = (path.distance / 1000).toFixed(2);
                        const timeMin = Math.round(path.time / 60000);
                        routePolyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

                        // Center map on route
                        const bounds = routePolyline.getBounds();
                        if (bounds.isValid()) {
                            map.fitBounds(bounds, { padding: [50, 50] });
                            console.log(`Карта для события ${event.id} отцентрирована по маршруту`);
                        } else {
                            console.warn(`Некорректные границы маршрута для события ${event.id}, используется первая точка`);
                            if (points.length > 0) {
                                map.setView([points[0][0], points[0][1]], 13);
                            }
                        }

                        console.log(`Карта успешно отображена для события ${event.id}`);
                    } catch (e) {
                        console.error(`Ошибка при отображении карты для события ${event.id}:`, e);
                        mapContainer.style.display = 'none';
                    }
                }, 100);
            } else {
                console.log(`Нет route_data для события ${event.id}`);
            }

            // Add Participate button for authenticated non-creators
            if (user && user.id !== event.user_id && !event.participants.includes(user.login)) {
                const joinBtn = document.createElement('button');
                joinBtn.className = 'join-btn';
                joinBtn.textContent = 'Участвовать';
                joinBtn.addEventListener('click', async () => {
                    try {
                        const response = await fetch(`http://localhost:3000/api/events/${event.id}/join`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            credentials: 'include'
                        });
                        const result = await response.json();
                        if (result.success) {
                            event.participants = result.participants;
                            participantsEl.textContent = `Участники: ${result.participants.length}`;
                            joinBtn.disabled = true;
                            joinBtn.textContent = 'Вы участвуете';
                            joinBtn.classList.add('join-btn-disabled');
                            // Fetch notifications again to include the new one
                            await fetchNotifications();
                        } else {
                            alert(result.error || 'Ошибка при присоединении к мероприятию');
                        }
                    } catch (e) {
                        console.error('Ошибка при присоединении:', e);
                        alert('Ошибка при присоединении к мероприятию');
                    }
                });
                eventEl.appendChild(joinBtn);
            } else if (user && event.participants.includes(user.login)) {
                const joinedLabel = document.createElement('p');
                joinedLabel.className = 'joined-label';
                joinedLabel.textContent = 'Вы участвуете';
                eventEl.appendChild(joinedLabel);
            }

            eventsContainer.appendChild(eventEl);
        });
    }
});
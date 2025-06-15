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
        const now = new Date('2025-06-15T11:19:00-04:00'); // Updated to current time

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
                const timeMatches = includePast ? true : !isPast;

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
            notificationBtn.style.display = 'none';
        }
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
        notificationBtn.style.display = 'none';
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
            applyFilters();
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
        const now = new Date('2025-06-15T11:19:00-04:00');
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

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
            const notificationKey = `${event.id}_${event.date}`;
            if (!dismissedNotifications[user.id].has(notificationKey)) {
                const existingNotification = notifications.find(n => n.message === message && !n.is_read && n.type === 'reminder');
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
                                message: message,
                                type: 'reminder',
                                event_id: event.id
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

    // Handle invitation response
    async function handleInvitationResponse(notification, action) {
        if (!notification.event_id) {
            console.error('No event_id in notification:', notification);
            return;
        }
        try {
            const response = await fetch(`http://localhost:3000/api/events/${notification.event_id}/${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                // Update event in local state
                const event = events.find(e => e.id === notification.event_id);
                if (event) {
                    event.participants = result.participants || [];
                    applyFilters(); // Re-render events to reflect participant changes
                }
                // Mark notification as handled locally and delete
                notification.is_handled = true; // Local flag to trigger UI update
                await fetch(`http://localhost:3000/api/notifications/${notification.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                notifications = notifications.filter(n => n.id !== notification.id);
                renderNotifications(); // Immediate re-render
                await fetchNotifications(); // Refresh notifications
            } else if (action === 'join' && result.error && result.error.includes('already participating')) {
                // Handle case where user is already a participant
                console.log(`User ${user.login} is already a participant, deleting invitation notification ${notification.id}`);
                notification.is_handled = true; // Set handled flag for UI update
                await fetch(`http://localhost:3000/api/notifications/${notification.id}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                notifications = notifications.filter(n => n.id !== notification.id);
                renderNotifications(); // Immediate re-render
                await fetchNotifications(); // Refresh notifications
            } else {
                console.error(`Ошибка при ${action === 'join' ? 'присоединении' : 'отказе'}:`, result.error);
            }
        } catch (e) {
            console.error(`Ошибка при ${action === 'join' ? 'присоединении' : 'отказе'}:`, e);
        }
    }

    // Render notifications in the popup
    function renderNotifications() {
        console.log('Rendering notifications:', notifications);
        notificationList.innerHTML = '';
        if (notifications.length === 0) {
            const emptyEl = document.createElement('p');
            emptyEl.className = 'no-notifications';
            emptyEl.textContent = 'Нет уведомлений';
            notificationList.appendChild(emptyEl);
            return;
        }

        notifications.forEach(notification => {
            console.log(`Processing notification: ID=${notification.id}, Type=${notification.type}, EventID=${notification.event_id}, IsRead=${notification.is_read}, Message="${notification.message}"`);
            const notificationEl = document.createElement('div');
            notificationEl.className = 'notification-item';
            if (!notification.is_read) {
                notificationEl.classList.add('unread');
            }

            const messageEl = document.createElement('span');
            messageEl.textContent = notification.message;
            notificationEl.appendChild(messageEl);

            // Check if notification is an invitation and not handled
            const isInvitation = notification.type === 'invitation' || 
                                notification.message.includes('приглашены на мероприятие') ||
                                notification.message.includes('добавлены в мероприятие');
            if (isInvitation && notification.event_id && !notification.is_read && !notification.is_handled) {
                console.log(`Rendering invitation buttons for notification ID=${notification.id}`);
                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'notification-buttons';

                const acceptBtn = document.createElement('button');
                acceptBtn.className = 'accept-btn';
                acceptBtn.textContent = 'Принять';
                acceptBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await handleInvitationResponse(notification, 'join');
                });

                const refuseBtn = document.createElement('button');
                refuseBtn.className = 'refuse-btn';
                refuseBtn.textContent = 'Отказать';
                refuseBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    await handleInvitationResponse(notification, 'leave');
                });

                buttonContainer.appendChild(acceptBtn);
                buttonContainer.appendChild(refuseBtn);
                notificationEl.appendChild(buttonContainer);
            } else {
                console.log(`Rendering delete button for notification ID=${notification.id}`);
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
                            let dismissedNotifications = JSON.parse(localStorage.getItem('dismissedNotifications') || '{}');
                            if (!dismissedNotifications[user.id]) {
                                dismissedNotifications[user.id] = new Set();
                            }
                            if (notification.type === 'reminder' && notification.event_id) {
                                const event = events.find(e => e.id === notification.event_id);
                                if (event) {
                                    const notificationKey = `${event.id}_${event.date}`;
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
            }

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
        const unreadNotifications = notifications.filter(n => !n.is_read && n.type !== 'invitation');
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
        e.stopPropagation();
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
            notificationBtn.click();
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
        }, 60000);
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
            let participants = Array.isArray(event.participants) ? event.participants : [];
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
                const mapContainer = document.createElement('div');
                mapContainer.className = 'event-map-container';
                mapContainer.id = `map-container-${event.id}`;
                mapContainer.style.display = 'block';

                const mapEl = document.createElement('div');
                mapEl.className = 'event-map';
                mapEl.id = `map-${event.id}`;
                mapContainer.appendChild(mapEl);

                eventEl.appendChild(mapContainer);

                setTimeout(() => {
                    try {
                        const routeData = typeof event.route_data === 'string' ? JSON.parse(event.route_data) : event.route_data;
                        if (!routeData.paths || !routeData.paths[0] || !routeData.paths[0].points) {
                            throw new Error('Некорректный формат route_data');
                        }

                        const map = L.map(`map-${event.id}`, {
                            zoomControl: true
                        }).setView([56.8375, 60.5975], 13);

                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                            zIndex: 1
                        }).addTo(map);

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
                            zIndex: 2
                        }).addTo(map);

                        if (path.snapped_waypoints) {
                            const waypointPoints = polyline.decode(path.snapped_waypoints).map(coord => [coord[0], coord[1]]);
                            waypointPoints.forEach((point, index) => {
                                const markerOptions = {
                                    zIndexOffset: 10
                                };
                                if (index === 0) {
                                    markerOptions.icon = redMarkerIcon;
                                }
                                const marker = L.marker(point, markerOptions).addTo(map);
                            });
                            console.log(`Добавлено ${waypointPoints.length} путевых точек для события ${event.id}`);
                        }

                        const distanceKm = (path.distance / 1000).toFixed(2);
                        const timeMin = Math.round(path.time / 60000);
                        routePolyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`);

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

            if (user && user.id !== event.user_id) {
                const joinBtn = document.createElement('button');
                joinBtn.className = 'join-btn';
                let isParticipant = event.participants.includes(user.login);
                joinBtn.textContent = isParticipant ? 'Отказаться' : 'Участвовать';
                joinBtn.style.backgroundColor = isParticipant ? '#e74c3c' : '#4285f4';
                if (isParticipant) {
                    joinBtn.classList.add('join-btn-disabled');
                }

                joinBtn.addEventListener('click', async () => {
                    try {
                        const url = `http://localhost:3000/api/events/${event.id}/${isParticipant ? 'leave' : 'join'}`;
                        console.log(`Sending request to ${url}, isParticipant: ${isParticipant}`);
                        const response = await fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            credentials: 'include'
                        });
                        const result = await response.json();
                        console.log('Server response:', result);

                        event.participants = result.participants || [];
                        participantsEl.textContent = `Участники: ${event.participants.length}`;
                        isParticipant = event.participants.includes(user.login);
                        joinBtn.textContent = isParticipant ? 'Отказаться' : 'Участвовать';
                        joinBtn.style.backgroundColor = isParticipant ? '#e74c3c' : '#4285f4';
                        joinBtn.classList.toggle('join-btn-disabled', isParticipant);
                        await fetchNotifications();
                        console.log('Updated participants:', event.participants);
                    } catch (e) {
                        console.error(`Ошибка при ${isParticipant ? 'отказе' : 'присоединении'}:`, e);
                        await fetchEventData(event.id, joinBtn, participantsEl);
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

    // Function to refetch event data and update UI
    async function fetchEventData(eventId, joinBtn, participantsEl) {
        try {
            const response = await fetch(`http://localhost:3000/api/events/${user.id}`, {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                const updatedEvent = result.events.find(e => e.id === eventId);
                if (updatedEvent) {
                    const event = events.find(e => e.id === eventId);
                    if (event) {
                        event.participants = updatedEvent.participants || [];
                        participantsEl.textContent = `Участники: ${event.participants.length}`;
                        const isParticipant = event.participants.includes(user.login);
                        joinBtn.textContent = isParticipant ? 'Отказаться' : 'Участвовать';
                        joinBtn.style.backgroundColor = isParticipant ? '#e74c3c' : '#4285f4';
                        joinBtn.classList.toggle('join-btn-disabled', isParticipant);
                        await fetchNotifications();
                        console.log('Refetched participants:', event.participants);
                    }
                }
            }
        } catch (e) {
            console.error('Error refetching event data:', e);
        }
    }
});
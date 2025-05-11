document.addEventListener('DOMContentLoaded', async function() {
    const eventsContainer = document.getElementById('events-feed');
    let events = [];
    let user = null;
    let filteredEvents = [];

    // Create filter section with styling
    const filterSection = document.createElement('div');
    filterSection.className = 'filter-section';
    filterSection.innerHTML = `
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
        const filterDateFrom = document.getElementById('filter-date-from').value;
        const filterDateTo = document.getElementById('filter-date-to').value;
        const filterTime = document.getElementById('filter-time').value;
        const minDistance = parseFloat(document.getElementById('filter-min-distance').value) || 0;
        const maxDistance = parseFloat(document.getElementById('filter-max-distance').value) || Infinity;

        const currentDateTimeFrom = filterDateFrom ? new Date(filterDateFrom + 'T' + filterTime) : new Date('2025-01-01T00:00');
        const currentDateTimeTo = filterDateTo ? new Date(filterDateTo + 'T' + filterTime) : new Date('2025-12-31T23:59');
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

                console.log(`Событие ${event.id} (${event.date} ${event.time || '00:00'}, ${distance} км): Дата совпадает=${dateMatches}, Длина совпадает=${distanceMatches}`);
                return dateMatches && distanceMatches;
            } catch (e) {
                console.warn(`Ошибка при парсинге даты/времени для события ${event.id}:`, e);
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
        }
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
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

    // Add event listeners for real-time filtering
    ['filter-date-from', 'filter-date-to', 'filter-time', 'filter-min-distance', 'filter-max-distance'].forEach(id => {
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

            const descriptionEl = document.createElement('p');
            descriptionEl.className = 'event-description';
            descriptionEl.textContent = event.description || 'Нет описания';
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
                            waypointPoints.forEach(point => {
                                L.marker(point, { zIndexOffset: 10 }).addTo(map); // Устанавливаем z-index для маркеров
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
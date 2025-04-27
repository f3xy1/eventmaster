document.addEventListener('DOMContentLoaded', async function() {
    const eventsContainer = document.getElementById('events-feed');

    async function fetchAllEvents() {
        try {
            const response = await fetch('http://localhost:3000/api/all-events');
            const result = await response.json();
            if (result.success) {
                return result.events.map(event => ({
                    ...event,
                    date: new Date(event.date)
                }));
            } else {
                console.error('Ошибка при загрузке мероприятий:', result.error);
                return [];
            }
        } catch (e) {
            console.error('Ошибка при загрузке мероприятий:', e);
            return [];
        }
    }

    async function fetchParticipantName(login) {
        try {
            const response = await fetch(`http://localhost:3000/api/check-user-login/${login}`);
            const result = await response.json();
            if (result.success) {
                const name = result.user.name || '';
                const secondname = result.user.secondname || '';
                return `${name} ${secondname}`.trim() || login;
            }
            return login;
        } catch (err) {
            console.error(`Ошибка при получении имени для ${login}:`, err);
            return login;
        }
    }

    function showRouteOnEventMap(routeData, mapContainerId) {
        if (!routeData) {
            console.warn(`Нет данных маршрута для карты ${mapContainerId}`);
            return;
        }

        try {
            const data = typeof routeData === 'string' ? JSON.parse(routeData) : routeData;
            if (!data.paths || !data.paths[0] || !data.paths[0].points) {
                console.warn(`Некорректные данные маршрута для карты ${mapContainerId}:`, data);
                return;
            }

            const map = L.map(mapContainerId).setView([56.8375, 60.5975], 13);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(map);

            const path = data.paths[0];
            // Decode the route points using @mapbox/polyline
            const points = polyline.decode(path.points).map(coord => [coord[0], coord[1]]);

            if (!points || points.length === 0) {
                console.warn(`Не удалось декодировать точки маршрута для карты ${mapContainerId}`);
                return;
            }

            const routePolyline = L.polyline(points, {
                color: '#4a6fa5',
                weight: 5,
                opacity: 0.7
            }).addTo(map);

            // Add waypoints if available
            if (path.snapped_waypoints) {
                // Decode waypoints using @mapbox/polyline
                const waypointPoints = polyline.decode(path.snapped_waypoints).map(coord => [coord[0], coord[1]]);
                waypointPoints.forEach(point => {
                    L.marker(point).addTo(map);
                });
            }

            const distanceKm = (path.distance / 1000).toFixed(2);
            const timeMin = Math.round(path.time / 60000);
            routePolyline.bindPopup(`Расстояние: ${distanceKm} км<br>Время: ${timeMin} мин`).openPopup();

            map.fitBounds(routePolyline.getBounds(), { padding: [50, 50] });
        } catch (error) {
            console.error(`Ошибка отображения маршрута на карте ${mapContainerId}:`, error);
        }
    }

    async function renderEvents() {
        const events = await fetchAllEvents();
        eventsContainer.innerHTML = '';

        if (events.length === 0) {
            const noEvents = document.createElement('p');
            noEvents.classList.add('no-events');
            noEvents.textContent = 'Нет доступных мероприятий';
            eventsContainer.appendChild(noEvents);
            return;
        }

        for (const event of events) {
            const eventEl = document.createElement('div');
            eventEl.classList.add('event-card');

            const eventDate = new Date(event.date);
            const formattedDate = `${eventDate.getDate()}.${eventDate.getMonth() + 1}.${eventDate.getFullYear()}`;
            const distanceText = event.distance ? `${event.distance.toFixed(2)} км` : 'Не указан';

            // Fetch participant names
            let participantNames = [];
            if (event.participants && event.participants.length > 0) {
                participantNames = await Promise.all(
                    event.participants.map(login => fetchParticipantName(login))
                );
            }

            // Create unique map ID for this event
            const mapId = `event-map-${event.id}`;

            eventEl.innerHTML = `
                <h3>${event.title}</h3>
                <p class="event-date">Дата: ${formattedDate}</p>
                <p class="event-time">Время: ${event.time || 'Не указано'}</p>
                <p class="event-creator">Организатор: ${event.creator || 'Неизвестный пользователь'}</p>
                <p class="event-participants">Участники: ${participantNames.length > 0 ? participantNames.join(', ') : 'Нет участников'}</p>
                <p class="event-distance">Длина маршрута: ${distanceText}</p>
                <p class="event-description">${event.description || 'Нет описания'}</p>
                ${event.route_data ? `<div class="event-map" id="${mapId}"></div>` : ''}
            `;

            eventsContainer.appendChild(eventEl);

            // Initialize map if route data exists
            if (event.route_data) {
                showRouteOnEventMap(event.route_data, mapId);
            }
        }
    }

    // Initial render
    await renderEvents();
});
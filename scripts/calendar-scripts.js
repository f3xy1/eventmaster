document.addEventListener('DOMContentLoaded', async function() {
    const calendarEl = document.querySelector('.calendar');
    const weekdayGridEl = document.querySelector('.weekday-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    
    // Check user session
    let userId;
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const result = await response.json();
        if (!result.success) {
            userId = null;
        } else {
            userId = result.userId;
        }
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
        userId = null;
    }

    // Load user events
    let events = [];
    if (userId) {
        try {
            const response = await fetch(`http://localhost:3000/api/events/${userId}`, {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                events = result.events.map(event => ({
                    ...event,
                    date: new Date(event.date)
                }));
            } else {
                console.error('Ошибка при загрузке мероприятий:', result.error);
            }
        } catch (e) {
            console.error('Ошибка при загрузке мероприятий:', e);
        }
    }
    
    function renderWeekdayHeaders() {
        weekdayGridEl.innerHTML = '';
        days.forEach(day => {
            const dayHeaderEl = document.createElement('div');
            dayHeaderEl.classList.add('weekday-header');
            dayHeaderEl.textContent = day;
            weekdayGridEl.appendChild(dayHeaderEl);
        });
    }
    
    function truncateTitle(title, maxLength = 30) {
        if (title.length > maxLength) {
            return title.substring(0, maxLength - 3) + '...';
        }
        return title;
    }
    
    function renderCalendar() {
        const today = new Date();
        const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                           'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
        currentMonthEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;
        
        calendarEl.innerHTML = '';
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        let firstDayOfWeek = firstDay.getDay();
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        const prevMonthDays = firstDayOfWeek;
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        const prevMonthLastDate = new Date(currentYear, currentMonth, 0);
        const prevMonth = prevMonthLastDate.getMonth();
        const prevYear = prevMonthLastDate.getFullYear();
        
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const dayEl = createDayElement(dayNum, true);
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === dayNum && 
                       eventDate.getMonth() === prevMonth && 
                       eventDate.getFullYear() === prevYear;
            });
            
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.classList.add('event');
                eventEl.textContent = truncateTitle(event.title);
                eventEl.dataset.eventId = event.id;
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventDetails(event);
                });
                eventsContainer.appendChild(eventEl);
            });
            
            dayEl.addEventListener('click', () => openModal(dayNum, prevMonth, prevYear));
            calendarEl.appendChild(dayEl);
        }
        
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const isToday = today.getDate() === day && 
                           today.getMonth() === currentMonth && 
                           today.getFullYear() === currentYear;
            const dayEl = createDayElement(day, false, isToday);
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === day && 
                       eventDate.getMonth() === currentMonth && 
                       eventDate.getFullYear() === currentYear;
            });
            
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.classList.add('event');
                eventEl.textContent = truncateTitle(event.title);
                eventEl.dataset.eventId = event.id;
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventDetails(event);
                });
                eventsContainer.appendChild(eventEl);
            });
            
            dayEl.addEventListener('click', () => openModal(day, currentMonth, currentYear));
            calendarEl.appendChild(dayEl);
        }
        
        const totalDaysShown = prevMonthDays + lastDay.getDate();
        const rows = Math.ceil(totalDaysShown / 7);
        const totalCells = rows * 7;
        const nextMonthDays = totalCells - totalDaysShown;
        const nextMonthFirstDate = new Date(currentYear, currentMonth + 1, 1);
        const nextMonth = nextMonthFirstDate.getMonth();
        const nextYear = nextMonthFirstDate.getFullYear();
        
        for (let day = 1; day <= nextMonthDays; day++) {
            const dayEl = createDayElement(day, true);
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            const dayEvents = events.filter(event => {
                const eventDate = new Date(event.date);
                return eventDate.getDate() === day && 
                       eventDate.getMonth() === nextMonth && 
                       eventDate.getFullYear() === nextYear;
            });
            
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.classList.add('event');
                eventEl.textContent = truncateTitle(event.title);
                eventEl.dataset.eventId = event.id;
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openEventDetails(event);
                });
                eventsContainer.appendChild(eventEl);
            });
            
            dayEl.addEventListener('click', () => openModal(day, nextMonth, nextYear));
            calendarEl.appendChild(dayEl);
        }
        
        calendarEl.className = 'calendar';
        calendarEl.classList.add(`calendar-rows-${rows}`);
    }
    
    function createDayElement(day, isInactive, isToday = false) {
        const dayEl = document.createElement('div');
        dayEl.classList.add('calendar-day');
        if (isInactive) {
            dayEl.classList.add('inactive');
        }
        if (isToday) {
            dayEl.classList.add('today');
        }
        const dayNumberEl = document.createElement('div');
        dayNumberEl.classList.add('day-number');
        dayNumberEl.textContent = day;
        dayEl.appendChild(dayNumberEl);
        return dayEl;
    }
    
    prevMonthBtn.addEventListener('click', function() {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', function() {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        renderCalendar();
    });
    
    function openModal(day, month, year) {
        if (!userId) {
            alert('Пожалуйста, войдите в аккаунт, чтобы создать мероприятие');
            window.location.href = 'login.html';
            return;
        }

        const modal = document.getElementById('modalOverlay');
        const dateInput = document.getElementById('eventDate');
        const timeInput = document.getElementById('eventTime');
        const titleInput = document.getElementById('eventTitle');
        const descriptionInput = document.getElementById('eventDescription');
        const participantsInput = document.getElementById('eventParticipants');
        const routeDistance = document.getElementById('routeDistance');
        
        timeInput.value = '';
        titleInput.value = '';
        descriptionInput.value = '';
        participantsInput.value = '';
        document.getElementById('routeData').value = '';
        routeDistance.textContent = 'Маршрут не задан';
        document.getElementById('participantsFeedback').innerHTML = '';
        participantMap.clear(); // Clear previous selections
        
        dateInput.value = `${day}.${month + 1}.${year}`;
        modal.style.display = 'flex';
    }
    
    async function openEventDetails(event) {
        const detailsModal = document.getElementById('eventDetailsModal');
        const detailsTitle = document.getElementById('detailsTitle');
        await toggleEventDetailsMode('view', event);
        detailsTitle.textContent = 'Информация о мероприятии';
        detailsModal.style.display = 'flex';
    }
    
    let originalRouteData = null;
    let originalRouteDistance = null;
    
    async function toggleEventDetailsMode(mode, event) {
        const detailsContent = document.querySelector('.event-details');
        const detailsTitle = document.getElementById('detailsTitle');
        
        if (mode === 'view') {
            originalRouteData = null;
            originalRouteDistance = null;
            const participantNames = await getParticipantNames(event.participants);

            let isOrganizer = false;
            if (userId) {
                try {
                    const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
                        credentials: 'include'
                    });
                    const result = await response.json();
                    if (result.success) {
                        const name = result.user.name || '';
                        const secondname = result.user.secondname || '';
                        const fullName = `${name} ${secondname}`.trim() || result.user.login;
                        isOrganizer = fullName === event.creator;
                    }
                } catch (e) {
                    console.error('Ошибка при проверке организатора:', e);
                }
            }

            const currentLogin = userId ? (await (await fetch(`http://localhost:3000/api/check-session`, { credentials: 'include' })).json()).login : null;

            detailsContent.innerHTML = `
                <div class="form-group">
                    <label>Дата:</label>
                    <p id="detailsDate">${new Date(event.date).getDate()}.${new Date(event.date).getMonth() + 1}.${new Date(event.date).getFullYear()}</p>
                </div>
                <div class="form-group">
                    <label>Время:</label>
                    <p id="detailsTime">${event.time || 'Не указано'}</p>
                </div>
                <div class="form-group">
                    <label>Название:</label>
                    <p id="detailsEventTitle">${event.title}</p>
                </div>
                <div class="form-group">
                    <label>Описание:</label>
                    <p id="detailsDescription" class="description-text">${event.description || 'Нет описания'}</p>
                </div>
                <div class="form-group">
                    <label>Организатор:</label>
                    <p id="detailsCreator">${event.creator || 'Неизвестный пользователь'}</p>
                </div>
                <div class="form-group">
                    <label>Участники:</label>
                    <p id="detailsParticipants">${participantNames.join(', ') || 'Нет участников'}</p>
                </div>
                <div class="form-group">
                    <label>Длина маршрута:</label>
                    <p id="detailsRouteDistance">${event.distance ? event.distance.toFixed(2) + ' км' : 'Маршрут не задан'}</p>
                </div>
                <div class="form-group" id="routeDetailsContainer" style="${event.route_data ? 'display: block' : 'display: none'}">
                    <label>Маршрут прогулки:</label>
                    <div id="detailsMap"></div>
                    <input type="hidden" id="detailsRouteData" value='${event.route_data ? JSON.stringify(event.route_data) : ''}'>
                </div>
                ${isOrganizer ? `
                <div class="form-group action-buttons">
                    <button id="editEventBtn" class="form-btn edit-btn">Редактировать</button>
                    <button id="deleteEventBtn" class="form-btn delete-btn">Удалить</button>
                </div>
                ` : ''}
                ${!isOrganizer && currentLogin && event.participants && event.participants.includes(currentLogin) ? `
                <div class="form-group action-buttons">
                    <button id="leaveEventBtn" class="form-btn delete-btn">Отказаться</button>
                </div>
                ` : ''}
            `;
            
            if (isOrganizer) {
                document.getElementById('editEventBtn').addEventListener('click', () => toggleEventDetailsMode('edit', event));
                document.getElementById('deleteEventBtn').addEventListener('click', () => deleteEvent(event.id));
            } else if (!isOrganizer && currentLogin && event.participants && event.participants.includes(currentLogin)) {
                document.getElementById('leaveEventBtn').addEventListener('click', () => leaveEvent(event.id));
            }
        } else {
            originalRouteData = event.route_data ? JSON.stringify(event.route_data) : '';
            originalRouteDistance = event.distance ? event.distance.toFixed(2) + ' км' : 'Маршрут не задан';
            const participantLogins = await getParticipantNames(event.participants, true);
            participantMap.clear();
            participantLogins.forEach(login => participantMap.set(login, '')); // Pre-load existing participants
            detailsTitle.textContent = 'Редактирование мероприятия';
            detailsContent.innerHTML = `
                <form id="editEventForm">
                    <div class="form-group">
                        <label>Дата:</label>
                        <input type="text" id="editEventDate" value="${new Date(event.date).getDate()}.${new Date(event.date).getMonth() + 1}.${new Date(event.date).getFullYear()}" readonly>
                    </div>
                    <div class="form-group">
                        <label>Время:</label>
                        <input type="time" id="editEventTime" value="${event.time || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Название:</label>
                        <input type="text" id="editEventTitle" value="${event.title}" maxlength="40" required>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea id="editEventDescription" rows="3">${event.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Участники (введите для поиска):</label>
                        <input type="text" id="editEventParticipants" placeholder="Начните вводить для поиска..." value="">
                        <div id="editParticipantsFeedback" class="participants-feedback"></div>
                    </div>
                    <div class="form-group">
                        <label>Маршрут прогулки:</label>
                        <div id="editMapContainer">
                            <div id="editMap"></div>
                            <div class="map-instructions">
                                <p>Нажмите на карту, чтобы добавить точки маршрута. Правый клик удаляет точку.</p>
                                <button type="button" id="resetEditRouteBtn" class="route-btn">Сбросить маршрут</button>
                            </div>
                            <input type="hidden" id="editRouteData" value='${event.route_data ? JSON.stringify(event.route_data) : ''}'>
                        </div>
                    </div>
                    <div class="form-group">
                        <label>Длина маршрута:</label>
                        <p id="editRouteDistance">${event.distance ? event.distance.toFixed(2) + ' км' : 'Маршрут не задан'}</p>
                    </div>
                    <div class="form-group action-buttons">
                        <button type="submit" class="form-btn save-btn">Сохранить</button>
                        <button type="button" id="cancelEditBtn" class="form-btn cancel-btn">Отмена</button>
                    </div>
                </form>
            `;
            
            // Ensure dropdown functionality is initialized
            const editParticipantsInput = document.getElementById('editEventParticipants');
            editParticipantsInput.addEventListener('click', handleParticipantsInput);
            editParticipantsInput.addEventListener('input', debounce(handleParticipantsInput, 300));
            
            document.getElementById('cancelEditBtn').addEventListener('click', () => {
                document.getElementById('editRouteData').value = originalRouteData;
                document.getElementById('editRouteDistance').textContent = originalRouteDistance;
                toggleEventDetailsMode('view', event);
            });
            document.getElementById('editEventForm').addEventListener('submit', (e) => handleEditFormSubmit(e, event));
            initializeEditMap(event.route_data);
        }
    }
    
    async function getParticipantNames(participants, returnLogins = false) {
        let participantNames = [];
        if (participants && participants.length > 0) {
            for (const login of participants) {
                try {
                    const response = await fetch(`http://localhost:3000/api/check-user-login/${login}`, {
                        credentials: 'include'
                    });
                    if (!response.ok) {
                        console.warn(`User ${login} not found, skipping validation: ${response.status} ${response.statusText}`);
                        participantNames.push(login);
                        continue;
                    }
                    const result = await response.json();
                    if (result.success) {
                        const name = result.user.name || '';
                        const secondname = result.user.secondname || '';
                        const fullName = `${name} ${secondname}`.trim() || login;
                        participantNames.push(returnLogins ? login : fullName);
                    } else {
                        console.warn(`Validation failed for ${login}: ${result.error}`);
                        participantNames.push(login);
                    }
                } catch (err) {
                    console.error(`Ошибка при получении данных для логина ${login}:`, err);
                    participantNames.push(login);
                }
            }
        }
        return participantNames.length > 0 ? participantNames : (returnLogins ? [] : ['Нет участников']);
    }
    
    let participantMap = new Map();
    let allUsers = new Map();

    async function fetchAllUsers() {
        try {
            const response = await fetch('http://localhost:3000/api/all-users', {
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                return result.users.filter(user => user.id !== userId).map(user => ({
                    login: user.login,
                    name: (user.name || '') + ' ' + (user.secondname || '').trim() || user.login
                }));
            }
            return [];
        } catch (e) {
            console.error('Ошибка при загрузке списка пользователей:', e);
            return [];
        }
    }

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

    function handleParticipantsInput(e) {
        const participantsInput = e.target;
        const feedbackElement = document.getElementById(participantsInput.id === 'eventParticipants' ? 'participantsFeedback' : 'editParticipantsFeedback');
        let dropdown = feedbackElement.querySelector('.participants-dropdown');
        if (!dropdown) {
            dropdown = document.createElement('div');
            dropdown.className = 'participants-dropdown';
            feedbackElement.appendChild(dropdown);
        }

        // Clear input and show all users on click
        if (e.type === 'click') {
            participantsInput.value = '';
            if (!allUsers.size) {
                fetchAllUsers().then(users => {
                    allUsers = new Map(users.map(user => [user.login, user.name]));
                    filterAndDisplayUsers(participantsInput, dropdown, true); // Show all users
                });
            } else {
                filterAndDisplayUsers(participantsInput, dropdown, true); // Show all users
            }
        }

        function filterAndDisplayUsers(input, dropdown, showAll = false) {
            const searchTerm = showAll ? '' : input.value.toLowerCase();
            dropdown.innerHTML = '';
            const filteredUsers = Array.from(allUsers.entries())
                .filter(([login, name]) => showAll || (name.toLowerCase().includes(searchTerm) || login.toLowerCase().includes(searchTerm)))
                .map(([login, name]) => ({ login, name }));

            filteredUsers.forEach(user => {
                const userEl = document.createElement('div');
                userEl.className = 'dropdown-user';
                userEl.style.display = 'flex';
                userEl.style.justifyContent = 'space-between';
                userEl.style.alignItems = 'center';
                const nameSpan = document.createElement('span');
                nameSpan.textContent = user.name;
                userEl.appendChild(nameSpan);
                if (participantMap.has(user.login)) {
                    const checkmark = document.createElement('span');
                    checkmark.className = 'checkmark';
                    checkmark.textContent = ' ✓';
                    userEl.appendChild(checkmark);
                }
                userEl.dataset.login = user.login;
                userEl.addEventListener('click', () => {
                    const login = user.login;
                    if (participantMap.has(login)) {
                        participantMap.delete(login);
                        userEl.querySelector('.checkmark')?.remove();
                    } else {
                        participantMap.set(login, user.name);
                        const checkmark = document.createElement('span');
                        checkmark.className = 'checkmark';
                        checkmark.textContent = ' ✓';
                        userEl.appendChild(checkmark);
                    }
                    // Do not update input here, only update locally in participantMap
                });
                dropdown.appendChild(userEl);
            });

            dropdown.style.display = filteredUsers.length ? 'block' : 'none';
            dropdown.style.maxHeight = '200px';
            dropdown.style.overflowY = 'auto';
        }

        // Handle input changes for filtering
        if (e.type === 'input') {
            filterAndDisplayUsers(participantsInput, dropdown);
        }

        // Add persistent click listener to close dropdown and update input
        if (dropdown.style.display !== 'none') {
            const handleOutsideClick = (event) => {
                const isClickInsideDropdown = dropdown.contains(event.target);
                const isClickOnInput = event.target === participantsInput;
                if (!isClickInsideDropdown && !isClickOnInput) {
                    dropdown.style.display = 'none';
                    // Update input with selected users only when dropdown closes
                    participantsInput.value = Array.from(participantMap.values()).join(', ') || '';
                    document.removeEventListener('click', handleOutsideClick);
                }
            };
            document.addEventListener('click', handleOutsideClick);
        }
    }

    // Open dropdown and clear input on click
    document.getElementById('eventParticipants').addEventListener('click', handleParticipantsInput);
    document.getElementById('eventParticipants').addEventListener('input', debounce(handleParticipantsInput, 300));

    // Edit mode participants input
    document.getElementById('editEventParticipants')?.addEventListener('click', handleParticipantsInput);
    document.getElementById('editEventParticipants')?.addEventListener('input', debounce(handleParticipantsInput, 300));
    
    async function handleEditFormSubmit(e, event) {
        e.preventDefault();
        
        const dateValue = document.getElementById('editEventDate').value;
        const timeValue = document.getElementById('editEventTime').value;
        const titleValue = document.getElementById('editEventTitle').value;
        const descriptionValue = document.getElementById('editEventDescription').value;
        const routeDataValue = document.getElementById('editRouteData').value;
        const routeDistanceText = document.getElementById('editRouteDistance').textContent;
        
        const dateParts = dateValue.split('.');
        const year = parseInt(dateParts[2]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[0]);
        const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let distance = null;
        if (routeDistanceText !== 'Маршрут не задан') {
            distance = parseFloat(routeDistanceText.replace(' км', ''));
        }
        
        let creator = 'Неизвестный пользователь';
        if (userId) {
            try {
                const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
                    credentials: 'include'
                });
                const result = await response.json();
                if (result.success) {
                    const name = result.user.name || '';
                    const secondname = result.user.secondname || '';
                    creator = `${name} ${secondname}`.trim() || 'Неизвестный пользователь';
                }
            } catch (e) {
                console.error('Ошибка при получении данных пользователя:', e);
            }
        }

        try {
            const response = await fetch(`http://localhost:3000/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: titleValue,
                    description: descriptionValue,
                    date: isoDate,
                    time: timeValue,
                    creator: creator,
                    participants: Array.from(participantMap.keys()), // Send participants for invitations
                    route_data: routeDataValue ? JSON.parse(routeDataValue) : null,
                    distance: distance
                })
            });

            const result = await response.json();
            if (result.success) {
                const updatedEventIndex = events.findIndex(e => e.id === event.id);
                if (updatedEventIndex !== -1) {
                    events[updatedEventIndex] = {
                        ...events[updatedEventIndex],
                        title: titleValue,
                        description: descriptionValue,
                        date: new Date(isoDate),
                        time: timeValue,
                        creator: creator,
                        participants: [], // Participants will be added only after acceptance
                        route_data: routeDataValue ? JSON.parse(routeDataValue) : null,
                        distance: distance
                    };
                }
                renderCalendar();
                document.getElementById('eventDetailsModal').style.display = 'none';
            } else {
                console.error('Ошибка при обновлении мероприятия:', result.error);
                alert('Ошибка при обновлении мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при отправке запроса:', e);
            alert('Ошибка при обновлении мероприятия');
        }
    }
    
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const dateValue = document.getElementById('eventDate').value;
        const timeValue = document.getElementById('eventTime').value;
        const titleValue = document.getElementById('eventTitle').value;
        const descriptionValue = document.getElementById('eventDescription').value;
        const routeDataValue = document.getElementById('routeData').value;
        const routeDistanceText = document.getElementById('routeDistance').textContent;
        
        const dateParts = dateValue.split('.');
        const year = parseInt(dateParts[2]);
        const month = parseInt(dateParts[1]) - 1;
        const day = parseInt(dateParts[0]);
        const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        
        let distance = null;
        if (routeDistanceText !== 'Маршрут не задан') {
            distance = parseFloat(routeDistanceText.replace(' км', ''));
        }
        
        let creator = 'Неизвестный пользователь';
        if (userId) {
            try {
                const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
                    credentials: 'include'
                });
                const result = await response.json();
                if (result.success) {
                    const name = result.user.name || '';
                    const secondname = result.user.secondname || '';
                    creator = `${name} ${secondname}`.trim() || 'Неизвестный пользователь';
                }
            } catch (e) {
                console.error('Ошибка при получении данных пользователя:', e);
            }
        }

        try {
            const response = await fetch('http://localhost:3000/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    title: titleValue,
                    description: descriptionValue,
                    date: isoDate,
                    time: timeValue,
                    creator: creator,
                    participants: Array.from(participantMap.keys()), // Send participants for invitations
                    route_data: routeDataValue ? JSON.parse(routeDataValue) : null,
                    distance: distance
                })
            });

            const result = await response.json();
            if (result.success) {
                const newEvent = {
                    id: result.eventId,
                    user_id: userId,
                    title: titleValue,
                    description: descriptionValue,
                    date: new Date(isoDate),
                    time: timeValue,
                    creator: creator,
                    participants: [], // Participants will be added only after acceptance
                    route_data: routeDataValue ? JSON.parse(routeDataValue) : null,
                    distance: distance
                };
                events.push(newEvent);
                renderCalendar();
                document.getElementById('modalOverlay').style.display = 'none';
                participantMap.clear();
            } else {
                console.error('Ошибка при создании мероприятия:', result.error);
                alert('Ошибка при создании мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при отправке запроса:', e);
            alert('Ошибка при создании мероприятия');
        }
    });
    
    async function deleteEvent(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/events/${eventId}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                events = events.filter(event => event.id !== eventId);
                renderCalendar();
                document.getElementById('eventDetailsModal').style.display = 'none';
            } else {
                console.error('Ошибка при удалении мероприятия:', result.error);
                alert('Ошибка при удалении мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при отправке запроса:', e);
            alert('Ошибка при удалении мероприятия');
        }
    }
    
    async function leaveEvent(eventId) {
        if (!confirm('Вы уверены, что хотите отказаться от участия в этом мероприятии?')) {
            return;
        }

        const currentLogin = userId ? (await (await fetch(`http://localhost:3000/api/check-session`, { credentials: 'include' })).json()).login : null;
        if (!currentLogin) {
            alert('Ошибка: Невозможно определить текущего пользователя');
            return;
        }

        try {
            const response = await fetch(`http://localhost:3000/api/events/${eventId}/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                const updatedEventIndex = events.findIndex(event => event.id === eventId);
                if (updatedEventIndex !== -1) {
                    const updatedParticipants = result.participants.filter(p => p !== currentLogin);
                    events[updatedEventIndex].participants = updatedParticipants;
                }
                renderCalendar();
                document.getElementById('eventDetailsModal').style.display = 'none';
            } else {
                console.error('Ошибка при отказе от участия:', result.error);
                alert('Ошибка при отказе от участия');
            }
        } catch (e) {
            console.error('Ошибка при отправке запроса:', e);
            alert('Ошибка при отказе от участия');
        }
    }
    
    // Initialize map and route planner (placeholder implementation)
    function initializeMap(mapElementId, routeDataCallback) {
        // Placeholder for Leaflet or Google Maps initialization
        console.log(`Map initialized for ${mapElementId}`);
        if (routeDataCallback) {
            routeDataCallback([]);
        }
    }

    function initializeMapWithRoute(mapElementId, initialRouteData, routeDataCallback) {
        // Placeholder for map with route initialization
        console.log(`Map with route initialized for ${mapElementId}`);
        if (routeDataCallback) {
            routeDataCallback(initialRouteData || []);
        }
    }

    window.routePlanner = {
        initMap: function(mapElementId, callback) {
            initializeMap(mapElementId, callback);
        },
        initMapWithRoute: function(mapElementId, initialRouteData, callback) {
            initializeMapWithRoute(mapElementId, initialRouteData, callback);
        }
    };

    function initializeMapForModal() {
        const mapContainer = document.getElementById('map');
        window.routePlanner.initMap('map', (routeData) => {
            document.getElementById('routeData').value = JSON.stringify(routeData);
            const distance = calculateRouteDistance(routeData);
            document.getElementById('routeDistance').textContent = distance > 0 ? `${distance.toFixed(2)} км` : 'Маршрут не задан';
        });
        document.getElementById('resetRouteBtn').addEventListener('click', () => {
            document.getElementById('routeData').value = '';
            document.getElementById('routeDistance').textContent = 'Маршрут не задан';
            window.routePlanner.initMap('map', (routeData) => {
                document.getElementById('routeData').value = JSON.stringify(routeData);
            });
        });
    }

    function initializeEditMap(initialRouteData) {
        const editMapContainer = document.getElementById('editMap');
        window.routePlanner.initMapWithRoute('editMap', initialRouteData, (routeData) => {
            document.getElementById('editRouteData').value = JSON.stringify(routeData);
            const distance = calculateRouteDistance(routeData);
            document.getElementById('editRouteDistance').textContent = distance > 0 ? `${distance.toFixed(2)} км` : 'Маршрут не задан';
        });
        document.getElementById('resetEditRouteBtn').addEventListener('click', () => {
            document.getElementById('editRouteData').value = '';
            document.getElementById('editRouteDistance').textContent = 'Маршрут не задан';
            window.routePlanner.initMap('editMap', (routeData) => {
                document.getElementById('editRouteData').value = JSON.stringify(routeData);
            });
        });
    }

    function calculateRouteDistance(routeData) {
        if (!routeData || routeData.length < 2) return 0;
        let totalDistance = 0;
        for (let i = 0; i < routeData.length - 1; i++) {
            const lat1 = routeData[i].lat;
            const lon1 = routeData[i].lng;
            const lat2 = routeData[i + 1].lat;
            const lon2 = routeData[i + 1].lng;
            const R = 6371; // Radius of the Earth in kilometers
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const distance = R * c;
            totalDistance += distance;
        }
        return totalDistance;
    }

    // Event listeners for modal close (only via close button)
    document.querySelectorAll('.close-btn, .close-details').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('modalOverlay').style.display = 'none';
            document.getElementById('eventDetailsModal').style.display = 'none';
            participantMap.clear();
        });
    });

    // Add click event to modal-content to stop propagation
    document.querySelectorAll('.modal-content').forEach(content => {
        content.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Initialize calendar and map
    renderWeekdayHeaders();
    renderCalendar();
    if (userId) {
        initializeMapForModal();
    }
});
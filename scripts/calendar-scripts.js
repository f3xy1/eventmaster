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
                eventEl.textContent = event.title;
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
                eventEl.textContent = event.title;
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
                eventEl.textContent = event.title;
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
                    <p id="detailsDescription">${event.description || 'Нет описания'}</p>
                </div>
                <div class="form-group">
                    <label>Организатор:</label>
                    <p id="detailsCreator">${event.creator || 'Неизвестный пользователь'}</p>
                </div>
                <div class="form-group">
                    <label>Участники:</label>
                    <p id="detailsParticipants">${participantNames}</p>
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
                <div class="form-group action-buttons">
                    <button id="editEventBtn" class="form-btn edit-btn">Редактировать</button>
                    <button id="deleteEventBtn" class="form-btn delete-btn">Удалить</button>
                </div>
            `;
            
            document.getElementById('editEventBtn').addEventListener('click', () => toggleEventDetailsMode('edit', event));
            document.getElementById('deleteEventBtn').addEventListener('click', () => deleteEvent(event.id));
        } else {
            originalRouteData = event.route_data ? JSON.stringify(event.route_data) : '';
            originalRouteDistance = event.distance ? event.distance.toFixed(2) + ' км' : 'Маршрут не задан';
            const participantLogins = await getParticipantNames(event.participants, true);
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
                        <input type="text" id="editEventTitle" value="${event.title}" required>
                    </div>
                    <div class="form-group">
                        <label>Описание:</label>
                        <textarea id="editEventDescription" rows="3">${event.description || ''}</textarea>
                    </div>
                    <div class="form-group">
                        <label>Участники (введите логины через запятую):</label>
                        <input type="text" id="editEventParticipants" value="${participantLogins}" placeholder="user1, user2, user3">
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
            
            document.getElementById('cancelEditBtn').addEventListener('click', () => {
                document.getElementById('editRouteData').value = originalRouteData;
                document.getElementById('editRouteDistance').textContent = originalRouteDistance;
                toggleEventDetailsMode('view', event);
            });
            document.getElementById('editEventForm').addEventListener('submit', (e) => handleEditFormSubmit(e, event));
            document.getElementById('editEventParticipants').addEventListener('input', handleParticipantsInput);
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
                    const result = await response.json();
                    if (result.success) {
                        const name = result.user.name || '';
                        const secondname = result.user.secondname || '';
                        const fullName = `${name} ${secondname}`.trim() || login;
                        participantNames.push(returnLogins ? login : fullName);
                    } else {
                        participantNames.push(login);
                    }
                } catch (err) {
                    console.error(`Ошибка при получении данных для логина ${login}:`, err);
                    participantNames.push(login);
                }
            }
        }
        return participantNames.length > 0 ? participantNames.join(', ') : (returnLogins ? '' : 'Нет участников');
    }
    
    let participantMap = new Map();
    let lastInputValue = '';
    
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
    
    const checkParticipants = debounce(async function(participantsInput, feedbackElement) {
        feedbackElement.innerHTML = '';
        const cursorPosition = participantsInput.selectionStart;
        const previousValueLength = participantsInput.value.length;
        
        const participants = participantsInput.value.split(',').map(p => p.trim()).filter(p => p !== '');
        if (participants.length === 0) return;
        
        const lastParticipant = participants[participants.length - 1];
        if (participantMap.has([...participantMap.entries()].find(([_, fullName]) => fullName === lastParticipant)?.[0])) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/check-user-login/${lastParticipant}`, {
                credentials: 'include'
            });
            const result = await response.json();
            
            if (result.success) {
                const name = result.user.name || '';
                const secondname = result.user.secondname || '';
                const fullName = `${name} ${secondname}`.trim() || lastParticipant;
                participantMap.set(lastParticipant, fullName);
                
                participants[participants.length - 1] = fullName;
                const newValue = participants.join(', ');
                
                if (participantsInput.value !== newValue) {
                    participantsInput.value = newValue;
                    const newLength = newValue.length;
                    const lengthDiff = newLength - previousValueLength;
                    const newCursorPosition = cursorPosition + lengthDiff;
                    participantsInput.setSelectionRange(newCursorPosition, newCursorPosition);
                }
            } else {
                const feedbackItem = document.createElement('div');
                feedbackItem.classList.add('participant-error');
                feedbackItem.innerHTML = `✖ ${result.error}`;
                feedbackElement.appendChild(feedbackItem);
            }
        } catch (err) {
            const feedbackItem = document.createElement('div');
            feedbackItem.classList.add('participant-error');
            feedbackItem.innerHTML = `✖ Ошибка проверки логина ${lastParticipant}`;
            feedbackElement.appendChild(feedbackItem);
        }
    }, 300);
    
    function handleParticipantsInput(e) {
        const participantsInput = e.target;
        const feedbackElement = document.getElementById(participantsInput.id === 'eventParticipants' ? 'participantsFeedback' : 'editParticipantsFeedback');
        if (participantsInput.value !== lastInputValue) {
            lastInputValue = participantsInput.value;
            checkParticipants(participantsInput, feedbackElement);
        }
    }
    
    document.getElementById('eventParticipants').addEventListener('input', handleParticipantsInput);
    
    async function handleEditFormSubmit(e, event) {
        e.preventDefault();
        
        const dateValue = document.getElementById('editEventDate').value;
        const timeValue = document.getElementById('editEventTime').value;
        const titleValue = document.getElementById('editEventTitle').value;
        const descriptionValue = document.getElementById('editEventDescription').value;
        const participantsValue = document.getElementById('editEventParticipants').value;
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
        
        const participants = participantsValue.split(',').map(p => {
            for (let [login, fullName] of participantMap.entries()) {
                if (fullName === p.trim()) {
                    return login;
                }
            }
            return p.trim();
        }).filter(p => p !== '');
        
        if (participants.length > 0) {
            const invalidParticipants = participants.filter(p => !participantMap.has(p));
            if (invalidParticipants.length > 0) {
                alert('Пожалуйста, исправьте ошибки в списке участников перед сохранением.');
                return;
            }
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
        
        let routeData = null;
        if (routeDataValue && routeDataValue !== '') {
            try {
                routeData = JSON.parse(routeDataValue);
            } catch (e) {
                console.error('Ошибка при парсинге routeData:', e);
                alert('Ошибка в данных маршрута.');
                return;
            }
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/events/${event.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    title: titleValue,
                    description: descriptionValue,
                    date: isoDate,
                    time: timeValue,
                    creator: creator,
                    participants: participants,
                    route_data: routeData,
                    distance: distance
                }),
            });

            const result = await response.json();
            if (result.success) {
                const eventResponse = await fetch(`http://localhost:3000/api/events/${userId}`, {
                    credentials: 'include'
                });
                const eventResult = await eventResponse.json();
                if (eventResult.success) {
                    events = eventResult.events.map(event => ({
                        ...event,
                        date: new Date(event.date)
                    }));
                    renderCalendar();
                    closeEventDetails();
                    alert('Мероприятие успешно обновлено!');
                } else {
                    throw new Error('Не удалось обновить список мероприятий');
                }
            } else {
                throw new Error(result.error || 'Ошибка при обновлении мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при обновлении мероприятия:', e);
            alert('Ошибка при обновлении мероприятия: ' + e.message);
        }
    }
    
    async function deleteEvent(eventId) {
        if (!confirm('Вы уверены, что хотите удалить это мероприятие?')) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/events/${eventId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include'
            });

            const result = await response.json();
            if (result.success) {
                const eventResponse = await fetch(`http://localhost:3000/api/events/${userId}`, {
                    credentials: 'include'
                });
                const eventResult = await eventResponse.json();
                if (eventResult.success) {
                    events = eventResult.events.map(event => ({
                        ...event,
                        date: new Date(event.date)
                    }));
                    renderCalendar();
                    closeEventDetails();
                    alert('Мероприятие успешно удалено!');
                } else {
                    throw new Error('Не удалось обновить список мероприятий');
                }
            } else {
                throw new Error(result.error || 'Ошибка при удалении мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при удалении мероприятия:', e);
            alert('Ошибка при удалении мероприятия: ' + e.message);
        }
    }
    
    function initializeEditMap(routeData) {
        window.routePlanner.initMap('editMap', 'edit', routeData);
    }
    
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.querySelector('.close-details').addEventListener('click', closeEventDetails);
    
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const dateValue = document.getElementById('eventDate').value;
        const timeValue = document.getElementById('eventTime').value;
        const titleValue = document.getElementById('eventTitle').value;
        const descriptionValue = document.getElementById('eventDescription').value;
        const participantsValue = document.getElementById('eventParticipants').value;
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
        
        const participants = participantsValue.split(',').map(p => {
            for (let [login, fullName] of participantMap.entries()) {
                if (fullName === p.trim()) {
                    return login;
                }
            }
            return p.trim();
        }).filter(p => p !== '');
        
        if (participants.length > 0) {
            const invalidParticipants = participants.filter(p => !participantMap.has(p));
            if (invalidParticipants.length > 0) {
                alert('Пожалуйста, исправьте ошибки в списке участников перед сохранением.');
                return;
            }
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
        
        let routeData = null;
        if (routeDataValue && routeDataValue !== '') {
            routeData = JSON.parse(routeDataValue);
        }
        
        try {
            const response = await fetch('http://localhost:3000/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    user_id: userId,
                    title: titleValue,
                    description: descriptionValue,
                    date: isoDate,
                    time: timeValue,
                    creator: creator,
                    participants: participants,
                    route_data: routeData,
                    distance: distance
                }),
            });

            const result = await response.json();
            if (result.success) {
                const eventResponse = await fetch(`http://localhost:3000/api/events/${userId}`, {
                    credentials: 'include'
                });
                const eventResult = await eventResponse.json();
                if (eventResult.success) {
                    events = eventResult.events.map(event => ({
                        ...event,
                        date: new Date(event.date)
                    }));
                    renderCalendar();
                    closeModal();
                    alert('Мероприятие успешно добавлено!');
                } else {
                    throw new Error('Не удалось обновить список мероприятий');
                }
            } else {
                throw new Error(result.error || 'Ошибка при создании мероприятия');
            }
        } catch (e) {
            console.error('Ошибка при создании мероприятия:', e);
            alert('Ошибка при создании мероприятия: ' + e.message);
        }
    });
    
    function closeModal() {
        document.getElementById('modalOverlay').style.display = 'none';
    }
    
    function closeEventDetails() {
        document.getElementById('eventDetailsModal').style.display = 'none';
    }
    
    renderWeekdayHeaders();
    renderCalendar();
});
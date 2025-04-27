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
    
    // Загружаем мероприятия пользователя с сервера
    let events = [];
    const userId = localStorage.getItem('current_user_id');
    if (userId) {
        try {
            const response = await fetch(`http://localhost:3000/api/events/${userId}`);
            const result = await response.json();
            if (result.success) {
                events = result.events.map(event => ({
                    ...event,
                    date: new Date(event.date) // Преобразуем дату из строки в объект Date
                }));
            } else {
                console.error('Ошибка при загрузке мероприятий:', result.error);
            }
        } catch (e) {
            console.error('Ошибка при загрузке мероприятий:', e);
        }
    }
    
    // Render the weekday headers once since they're static
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
        
        // Clear the calendar
        calendarEl.innerHTML = '';
        
        // Get the first day of the month
        const firstDay = new Date(currentYear, currentMonth, 1);
        
        // Get the last day of the month
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        
        // Get the day of the week of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
        let firstDayOfWeek = firstDay.getDay();
        // Adjust for Monday as the first day of the week
        firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
        
        // Calculate days from previous month
        const prevMonthDays = firstDayOfWeek;
        const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
        const prevMonthLastDate = new Date(currentYear, currentMonth, 0);
        const prevMonth = prevMonthLastDate.getMonth();
        const prevYear = prevMonthLastDate.getFullYear();
        
        // Add days from previous month
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const dayNum = prevMonthLastDay - i;
            const dayEl = createDayElement(dayNum, true);
            
            // Create events container div
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            // Add events for this previous month day
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
                
                // Add click event to show event details
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent day click event
                    openEventDetails(event);
                });
                
                eventsContainer.appendChild(eventEl);
            });
            
            // Add click event to open modal for adding new event
            dayEl.addEventListener('click', () => openModal(dayNum, prevMonth, prevYear));
            
            calendarEl.appendChild(dayEl);
        }
        
        // Add days of the current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const isToday = today.getDate() === day && 
                           today.getMonth() === currentMonth && 
                           today.getFullYear() === currentYear;
            
            const dayEl = createDayElement(day, false, isToday);
            
            // Create events container div
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            // Add events for this day
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
                
                // Add click event to show event details
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent day click event
                    openEventDetails(event);
                });
                
                eventsContainer.appendChild(eventEl);
            });
            
            // Add click event to open modal for adding new event
            dayEl.addEventListener('click', () => openModal(day, currentMonth, currentYear));
            
            calendarEl.appendChild(dayEl);
        }
        
        // Calculate the number of rows needed for this month
        const totalDaysShown = prevMonthDays + lastDay.getDate();
        const rows = Math.ceil(totalDaysShown / 7);
        
        // Calculate how many days we need from the next month
        const totalCells = rows * 7;
        const nextMonthDays = totalCells - totalDaysShown;
        
        // Get next month and year
        const nextMonthFirstDate = new Date(currentYear, currentMonth + 1, 1);
        const nextMonth = nextMonthFirstDate.getMonth();
        const nextYear = nextMonthFirstDate.getFullYear();
        
        // Add days from next month
        for (let day = 1; day <= nextMonthDays; day++) {
            const dayEl = createDayElement(day, true);
            
            // Create events container div
            const eventsContainer = document.createElement('div');
            eventsContainer.classList.add('events-container');
            dayEl.appendChild(eventsContainer);
            
            // Add events for this next month day
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
                
                // Add click event to show event details
                eventEl.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent day click event
                    openEventDetails(event);
                });
                
                eventsContainer.appendChild(eventEl);
            });
            
            // Add click event to open modal for adding new event
            dayEl.addEventListener('click', () => openModal(day, nextMonth, nextYear));
            
            calendarEl.appendChild(dayEl);
        }
        
        // Add class to calendar indicating how many rows it has
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
    
    // Modal window functions for event creation
    function openModal(day, month, year) {
        // Проверяем, авторизован ли пользователь
        const userId = localStorage.getItem('current_user_id');
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
        
        // Reset form
        timeInput.value = '';
        titleInput.value = '';
        descriptionInput.value = '';
        participantsInput.value = '';
        document.getElementById('routeData').value = '';
        routeDistance.textContent = 'Маршрут не задан';
        document.getElementById('participantsFeedback').innerHTML = '';
        
        // Set date value
        dateInput.value = `${day}.${month + 1}.${year}`;
        
        // Display modal
        modal.style.display = 'flex';
    }
    
    // Event details modal functions
    async function openEventDetails(event) {
        const detailsModal = document.getElementById('eventDetailsModal');
        const detailsDate = document.getElementById('detailsDate');
        const detailsTime = document.getElementById('detailsTime');
        const detailsTitle = document.getElementById('detailsEventTitle');
        const detailsDescription = document.getElementById('detailsDescription');
        const detailsCreator = document.getElementById('detailsCreator');
        const detailsParticipants = document.getElementById('detailsParticipants');
        const detailsRouteDistance = document.getElementById('detailsRouteDistance');
        const routeDetailsContainer = document.getElementById('routeDetailsContainer');
        const detailsRouteData = document.getElementById('detailsRouteData');
        
        const eventDate = new Date(event.date);
        detailsDate.textContent = `${eventDate.getDate()}.${eventDate.getMonth() + 1}.${eventDate.getFullYear()}`;
        detailsTime.textContent = event.time || 'Не указано';
        detailsTitle.textContent = event.title;
        detailsDescription.textContent = event.description || 'Нет описания';
        detailsCreator.textContent = event.creator || 'Неизвестный пользователь';
        
        // Получаем имена и фамилии участников
        let participantNames = [];
        if (event.participants && event.participants.length > 0) {
            for (const login of event.participants) {
                try {
                    const response = await fetch(`http://localhost:3000/api/check-user-login/${login}`);
                    const result = await response.json();
                    if (result.success) {
                        const name = result.user.name || '';
                        const secondname = result.user.secondname || '';
                        const fullName = `${name} ${secondname}`.trim() || login;
                        participantNames.push(fullName);
                    } else {
                        participantNames.push(login);
                    }
                } catch (err) {
                    participantNames.push(login);
                }
            }
        }
        detailsParticipants.textContent = participantNames.length > 0 ? participantNames.join(', ') : 'Нет участников';
        detailsRouteDistance.textContent = event.distance ? `${event.distance.toFixed(2)} км` : 'Маршрут не задан';
        
        // Show or hide route details based on whether we have route data
        if (event.route_data) {
            routeDetailsContainer.style.display = 'block';
            detailsRouteData.value = JSON.stringify(event.route_data);
        } else {
            routeDetailsContainer.style.display = 'none';
            detailsRouteData.value = '';
        }
        
        detailsModal.style.display = 'flex';
    }
    
    // Close modal when clicking on X
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.querySelector('.close-details').addEventListener('click', closeEventDetails);
    
    // Проверка логина участников и замена на имя и фамилию
    let participantMap = new Map(); // Хранит соответствие логина -> имя и фамилия
    let lastInputValue = ''; // Для отслеживания изменений в поле

    // Функция debounce для ограничения частоты запросов
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

    const checkParticipants = debounce(async function(participantsInput) {
        const participantsFeedback = document.getElementById('participantsFeedback');
        participantsFeedback.innerHTML = '';
        
        // Сохраняем позицию курсора
        const cursorPosition = participantsInput.selectionStart;
        const previousValueLength = participantsInput.value.length;
        
        const participants = participantsInput.value.split(',').map(p => p.trim()).filter(p => p !== '');
        if (participants.length === 0) return;

        // Обрабатываем только последнего участника
        const lastParticipant = participants[participants.length - 1];
        
        // Пропускаем, если это уже преобразованное имя и фамилия
        if (participantMap.has([...participantMap.entries()].find(([_, fullName]) => fullName === lastParticipant)?.[0])) {
            return;
        }
        
        try {
            const response = await fetch(`http://localhost:3000/api/check-user-login/${lastParticipant}`);
            const result = await response.json();
            
            if (result.success) {
                const name = result.user.name || '';
                const secondname = result.user.secondname || '';
                const fullName = `${name} ${secondname}`.trim() || lastParticipant;
                participantMap.set(lastParticipant, fullName);
                
                // Обновляем только последнего участника в строке
                participants[participants.length - 1] = fullName;
                const newValue = participants.join(', ');
                
                if (participantsInput.value !== newValue) {
                    participantsInput.value = newValue;
                    
                    // Корректируем позицию курсора
                    const newLength = newValue.length;
                    const lengthDiff = newLength - previousValueLength;
                    const newCursorPosition = cursorPosition + lengthDiff;
                    participantsInput.setSelectionRange(newCursorPosition, newCursorPosition);
                }
            } else {
                const feedbackItem = document.createElement('div');
                feedbackItem.classList.add('participant-error');
                feedbackItem.innerHTML = `✖ ${result.error}`;
                participantsFeedback.appendChild(feedbackItem);
            }
        } catch (err) {
            const feedbackItem = document.createElement('div');
            feedbackItem.classList.add('participant-error');
            feedbackItem.innerHTML = `✖ Ошибка проверки логина ${lastParticipant}`;
            participantsFeedback.appendChild(feedbackItem);
        }
    }, 300);

    document.getElementById('eventParticipants').addEventListener('input', function(e) {
        const participantsInput = e.target;
        if (participantsInput.value !== lastInputValue) {
            lastInputValue = participantsInput.value;
            checkParticipants(participantsInput);
        }
    });
    
    // Form submission handling
    document.getElementById('registrationForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Get form values
        const dateValue = document.getElementById('eventDate').value;
        const timeValue = document.getElementById('eventTime').value;
        const titleValue = document.getElementById('eventTitle').value;
        const descriptionValue = document.getElementById('eventDescription').value;
        const participantsValue = document.getElementById('eventParticipants').value;
        const routeDataValue = document.getElementById('routeData').value;
        const routeDistanceText = document.getElementById('routeDistance').textContent;
        
        // Parse date (format: "DD.MM.YYYY" to ISO 8601 "YYYY-MM-DD")
        const dateParts = dateValue.split('.');
        const year = parseInt(dateParts[2]);
        const month = parseInt(dateParts[1]) - 1; // month (0-11)
        const day = parseInt(dateParts[0]);
        // Создаем дату без учета часового пояса
        const eventDate = new Date(Date.UTC(year, month, day));
        const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`; // Формат "YYYY-MM-DD"
        
        // Parse distance (remove ' км' and convert to number)
        let distance = null;
        if (routeDistanceText !== 'Маршрут не задан') {
            distance = parseFloat(routeDistanceText.replace(' км', ''));
        }
        
        // Parse participants (split by comma and trim whitespace)
        const participants = participantsValue.split(',').map(p => {
            // Ищем исходный логин по имени и фамилии
            for (let [login, fullName] of participantMap.entries()) {
                if (fullName === p.trim()) {
                    return login;
                }
            }
            return p.trim();
        }).filter(p => p !== '');
        
        // Проверяем, что все участники валидны (если они есть)
        if (participants.length > 0) {
            const invalidParticipants = participants.filter(p => !participantMap.has(p));
            if (invalidParticipants.length > 0) {
                alert('Пожалуйста, исправьте ошибки в списке участников перед сохранением.');
                return;
            }
        }
        
        // Get creator (current user's name and secondname)
        let creator = 'Неизвестный пользователь';
        const userId = localStorage.getItem('current_user_id');
        if (userId) {
            try {
                const response = await fetch(`http://localhost:3000/api/user/${userId}`);
                const result = await response.json();
                if (result.success) {
                    const name = result.user.name || '';
                    const secondname = result.user.secondname || '';
                    creator = `${name} ${secondname}`.trim() || 'Неизвестный пользователь';
                }
            } catch (e) {
                console.error(' Ide: Ошибка при получении данных пользователя: ', e);
            }
        }
        
        // Parse route data
        let routeData = null;
        if (routeDataValue && routeDataValue !== '') {
            routeData = JSON.parse(routeDataValue);
        }
        
        // Отправляем данные на сервер
        try {
            const response = await fetch('http://localhost:3000/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
                // Обновляем список мероприятий
                const eventResponse = await fetch(`http://localhost:3000/api/events/${userId}`);
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
    
    // Initial render
    renderWeekdayHeaders();
    renderCalendar();
});
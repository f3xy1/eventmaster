document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.querySelector('.calendar');
    const weekdayGridEl = document.querySelector('.weekday-grid');
    const currentMonthEl = document.getElementById('current-month');
    const prevMonthBtn = document.getElementById('prev-month');
    const nextMonthBtn = document.getElementById('next-month');
    
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();
    
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
    
    // Initialize events from localStorage or create an empty array
    let events = JSON.parse(localStorage.getItem('calendarEvents')) || [];
    
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
                eventEl.dataset.eventIndex = events.indexOf(event);
                
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
                eventEl.dataset.eventIndex = events.indexOf(event);
                
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
        // Ensure we always have the exact number of cells needed for the grid
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
                eventEl.dataset.eventIndex = events.indexOf(event);
                
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
        const modal = document.getElementById('modalOverlay');
        const dateInput = document.getElementById('eventDate');
        const timeInput = document.getElementById('eventTime');
        const titleInput = document.getElementById('eventTitle');
        const descriptionInput = document.getElementById('eventDescription');
        
        // Reset form
        timeInput.value = '';
        titleInput.value = '';
        descriptionInput.value = '';
        document.getElementById('routeData').value = '';
        
        // Set date value
        dateInput.value = `${day}.${month + 1}.${year}`;
        
        // Display modal
        modal.style.display = 'flex';
    }
    
    // Event details modal functions
    function openEventDetails(event) {
        const detailsModal = document.getElementById('eventDetailsModal');
        const detailsDate = document.getElementById('detailsDate');
        const detailsTime = document.getElementById('detailsTime');
        const detailsTitle = document.getElementById('detailsEventTitle');
        const detailsDescription = document.getElementById('detailsDescription');
        const routeDetailsContainer = document.getElementById('routeDetailsContainer');
        const detailsRouteData = document.getElementById('detailsRouteData');
        
        const eventDate = new Date(event.date);
        detailsDate.textContent = `${eventDate.getDate()}.${eventDate.getMonth() + 1}.${eventDate.getFullYear()}`;
        detailsTime.textContent = event.time || 'Не указано';
        detailsTitle.textContent = event.title;
        detailsDescription.textContent = event.description || 'Нет описания';
        
        // Show or hide route details based on whether we have route data
        if (event.routeData) {
            routeDetailsContainer.style.display = 'block';
            detailsRouteData.value = event.routeData;
            // The showRouteOnDetailsMap function will be called by the observer in route-planner.js
        } else {
            routeDetailsContainer.style.display = 'none';
            detailsRouteData.value = '';
        }
        
        detailsModal.style.display = 'flex';
    }
    
    // Close modal when clicking on X
    document.querySelector('.close-btn').addEventListener('click', closeModal);
    document.querySelector('.close-details').addEventListener('click', closeEventDetails);
    
    // Close modals when clicking outside the modal
    window.addEventListener('click', function(event) {
        const createModal = document.getElementById('modalOverlay');
        const detailsModal = document.getElementById('eventDetailsModal');
        
        if(event.target === createModal) closeModal();
        if(event.target === detailsModal) closeEventDetails();
    });
    
    // Form submission handling
    document.getElementById('registrationForm').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Get form values
        const dateValue = document.getElementById('eventDate').value;
        const timeValue = document.getElementById('eventTime').value;
        const titleValue = document.getElementById('eventTitle').value;
        const descriptionValue = document.getElementById('eventDescription').value;
        const routeDataValue = document.getElementById('routeData').value;
        
        // Parse date (format: "DD.MM.YYYY")
        const dateParts = dateValue.split('.');
        const eventDate = new Date(
            parseInt(dateParts[2]), // year
            parseInt(dateParts[1]) - 1, // month (0-11)
            parseInt(dateParts[0]) // day
        );
        
        // Create new event object
        const newEvent = {
            date: eventDate,
            time: timeValue,  // Store the time value
            title: titleValue,
            description: descriptionValue,
            routeData: routeDataValue // Store the route data
        };
        
        // Add event to events array
        events.push(newEvent);
        
        // Save events to localStorage
        localStorage.setItem('calendarEvents', JSON.stringify(events));
        
        // Re-render calendar to show new event
        renderCalendar();
        
        // Close modal
        closeModal();
        
        // Show confirmation
        alert('Мероприятие успешно добавлено!');
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
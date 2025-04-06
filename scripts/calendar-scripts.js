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
    
    // Sample events
    const events = [
        { date: new Date(currentYear, currentMonth, 15), title: 'Встреча с командой' },
        { date: new Date(currentYear, currentMonth, 20), title: 'Приём у стоматолога' },
        { date: new Date(currentYear, currentMonth, 25), title: 'День рождения' }
    ];
    
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
        
        // Add days from previous month
        for (let i = prevMonthDays - 1; i >= 0; i--) {
            const dayEl = createDayElement(prevMonthLastDay - i, true);
            calendarEl.appendChild(dayEl);
        }
        
        // Add days of the current month
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const isToday = today.getDate() === day && 
                           today.getMonth() === currentMonth && 
                           today.getFullYear() === currentYear;
            
            const dayEl = createDayElement(day, false, isToday);
            
            // Add events for this day
            const dayEvents = events.filter(event => 
                event.date.getDate() === day && 
                event.date.getMonth() === currentMonth && 
                event.date.getFullYear() === currentYear
            );
            
            dayEvents.forEach(event => {
                const eventEl = document.createElement('div');
                eventEl.classList.add('event');
                eventEl.textContent = event.title;
                dayEl.appendChild(eventEl);
            });
            
            calendarEl.appendChild(dayEl);
        }
        
        // Calculate how many days we need from the next month
        // Changed from 6 to 5 rows as requested
        const totalDaysDisplayed = days.length * 5; // 5 rows of days
        const nextMonthDays = totalDaysDisplayed - (prevMonthDays + lastDay.getDate());
        
        // Add days from next month
        for (let day = 1; day <= nextMonthDays; day++) {
            const dayEl = createDayElement(day, true);
            calendarEl.appendChild(dayEl);
        }
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
    
    // Initial render
    renderWeekdayHeaders();
    renderCalendar();
});
document.addEventListener('DOMContentLoaded', async function() {
    // Проверяем, авторизован ли пользователь
    const userId = localStorage.getItem('current_user_id');
    if (!userId) {
        alert('Пожалуйста, войдите в аккаунт');
        window.location.href = 'login.html';
        return;
    }
    console.log('userId из Local Storage:', userId);

    // Get edit button element
    const editBtn = document.querySelector('.edit-btn');
    
    // Get all editable fields (paragraphs with -from-db postfix)
    const editableFields = document.querySelectorAll('[class$="-from-db"]');
    
    // Set to track if we're in edit mode
    let isEditMode = false;
    
    // Create error container
    const errorContainer = document.createElement('div');
    errorContainer.className = 'profile-error-container';
    document.querySelector('.information').appendChild(errorContainer);

    // Загружаем данные пользователя с сервера
    try {
        const response = await fetch(`http://localhost:3000/api/user/${userId}`);
        const result = await response.json();
        if (result.success) {
            const user = result.user;
            document.querySelector('.name-from-db').textContent = user.name || 'Не указано';
            document.querySelector('.secondname-from-db').textContent = user.secondname || 'Не указано';
            document.querySelector('.email-from-db').textContent = user.email || 'Не указано';
        } else {
            throw new Error(result.error || 'Ошибка при загрузке данных пользователя');
        }
    } catch (e) {
        console.error('Ошибка при загрузке данных пользователя:', e);
        showError('Не удалось загрузить данные пользователя');
        return;
    }

    // Загружаем мероприятия пользователя
    const eventsContainer = document.querySelector('.your-events');
    if (!eventsContainer) {
        console.error('Контейнер .your-events не найден в DOM');
        return;
    }
    let events = [];
    try {
        console.log('Отправляем запрос на получение мероприятий для userId:', userId);
        const response = await fetch(`http://localhost:3000/api/events/${userId}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        console.log('Статус ответа:', response.status, response.statusText);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}, statusText: ${response.statusText}`);
        }

        const text = await response.text();
        console.log('Тело ответа сервера (сырой текст):', text);
        if (!text) {
            throw new Error('Пустой ответ от сервера');
        }

        const result = JSON.parse(text);
        console.log('Ответ сервера для мероприятий (parsed JSON):', result);

        if (result.success) {
            events = result.events || [];
            console.log('События для рендеринга:', events);
            renderEvents(events);
        } else {
            throw new Error(result.error || 'Ошибка при загрузке мероприятий');
        }
    } catch (e) {
        console.error('Ошибка при загрузке мероприятий:', e);
        const errorEl = document.createElement('p');
        errorEl.className = 'events-error';
        errorEl.textContent = 'Не удалось загрузить мероприятия: ' + e.message;
        eventsContainer.appendChild(errorEl);
    }

    // Функция для отображения мероприятий
    function renderEvents(events) {
        console.log('Вызываем renderEvents с событиями:', events);
        if (!Array.isArray(events) || events.length === 0) {
            const noEventsEl = document.createElement('p');
            noEventsEl.className = 'no-events';
            noEventsEl.textContent = 'У вас пока нет мероприятий';
            eventsContainer.appendChild(noEventsEl);
            return;
        }

        events.forEach(event => {
            try {
                const eventEl = document.createElement('div');
                eventEl.className = 'event-card';

                const titleEl = document.createElement('h3');
                titleEl.className = 'event-title';
                titleEl.textContent = event.title || 'Без названия';
                eventEl.appendChild(titleEl);

                const dateEl = document.createElement('p');
                dateEl.className = 'event-date';
                const eventDate = new Date(event.date);
                if (isNaN(eventDate.getTime())) {
                    throw new Error(`Некорректная дата для события ${event.id}: ${event.date}`);
                }
                dateEl.textContent = `Дата: ${eventDate.getDate()}.${eventDate.getMonth() + 1}.${eventDate.getFullYear()}`;
                eventEl.appendChild(dateEl);

                const timeEl = document.createElement('p');
                timeEl.className = 'event-time';
                timeEl.textContent = `Время: ${event.time || 'Не указано'}`;
                eventEl.appendChild(timeEl);

                const participantsEl = document.createElement('p');
                participantsEl.className = 'event-participants';
                const participants = Array.isArray(event.participants) ? event.participants : [];
                participantsEl.textContent = `Участники: ${participants.length}`;
                eventEl.appendChild(participantsEl);

                eventsContainer.appendChild(eventEl);
            } catch (e) {
                console.error('Ошибка при рендеринге события:', event, e);
            }
        });
    }
    
    // Function to toggle edit mode
    function toggleEditMode() {
        if (!isEditMode) {
            // Entering edit mode
            isEditMode = true;
            editableFields.forEach(field => {
                // Store original text
                field.dataset.originalText = field.textContent;
                
                // Create input element
                const input = document.createElement('input');
                input.type = 'text';
                input.value = field.textContent === 'Не указано' ? '' : field.textContent;
                input.className = 'edit-input';
                input.dataset.fieldType = field.className.replace('-from-db', '');
                
                // Add validation listeners
                input.addEventListener('input', () => {
                    validateInput(input);
                    toggleSaveButton();
                });
                
                input.addEventListener('blur', () => {
                    showInputError(input);
                });
                
                // Replace paragraph with input
                field.textContent = '';
                field.appendChild(input);
            });
            
            // Change edit icon to save icon
            editBtn.innerHTML = '<img src="images/save.svg" alt="Save Profile" class="edit-icon">';
            
            // Initially validate all fields and disable save button if needed
            validateAllInputs();
            toggleSaveButton();
        } else {
            // Try to save changes
            if (validateAllInputs()) {
                // All inputs are valid, save changes
                saveChanges();
            } else {
                // Show errors for all invalid fields
                const inputs = document.querySelectorAll('.edit-input');
                inputs.forEach(input => {
                    showInputError(input);
                });
                
                // Show general error message
                showError('Пожалуйста, исправьте ошибки перед сохранением.');
            }
        }
    }
    
    async function saveChanges() {
        // Exiting edit mode (saving)
        isEditMode = false;
        
        const updatedData = {};
        editableFields.forEach(field => {
            const input = field.querySelector('input');
            if (input) {
                const fieldType = field.className.replace('-from-db', '');
                updatedData[fieldType] = input.value.trim() || null;
                // Update field with input value (временно, до ответа сервера)
                field.textContent = input.value.trim() || 'Не указано';
            }
        });
        
        // Сохраняем изменения на сервере
        try {
            const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData),
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при сохранении данных');
            }
        } catch (e) {
            console.error('Ошибка при сохранении:', e);
            showError(e.message || 'Не удалось сохранить изменения');
            // Откатываем изменения на странице
            editableFields.forEach(field => {
                field.textContent = field.dataset.originalText;
            });
            return;
        }
        
        // Reset edit icon
        editBtn.innerHTML = '<img src="images/edit.svg" alt="Edit Profile" class="edit-icon">';
        
        // Clear any errors
        clearErrors();
    }
    
    // Function to validate a single input
    function validateInput(input) {
        input.setCustomValidity('');
        const fieldType = input.dataset.fieldType;
        const value = input.value.trim();
        
        if (value === '') {
            input.setCustomValidity('Это поле обязательно для заполнения');
            return false;
        }
        
        // Add specific validation rules based on field type
        if (fieldType === 'email') {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                input.setCustomValidity('Пожалуйста, введите корректный email');
                return false;
            }
        } else if (fieldType === 'name' || fieldType === 'secondname') {
            if (value.length < 2) {
                input.setCustomValidity('Должно содержать не менее 2 символов');
                return false;
            }
            
            const nameRegex = /^[A-Za-zА-Яа-яЁё\s-]+$/;
            if (!nameRegex.test(value)) {
                input.setCustomValidity('Может содержать только буквы, пробелы и дефисы');
                return false;
            }
        }
        
        return true;
    }
    
    // Function to validate all inputs
    function validateAllInputs() {
        const inputs = document.querySelectorAll('.edit-input');
        let allValid = true;
        
        inputs.forEach(input => {
            if (!validateInput(input)) {
                allValid = false;
            }
        });
        
        return allValid;
    }
    
    // Function to show error for a specific input
    function showInputError(input) {
        const errorMessage = input.validationMessage;
        
        if (errorMessage) {
            input.classList.add('input-error');
            showError(`${errorMessage} (${input.dataset.fieldType})`);
        } else {
            input.classList.remove('input-error');
            // Only clear errors if all inputs are valid
            if (validateAllInputs()) {
                clearErrors();
            }
        }
    }
    
    // Function to show error in the error container
    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }
    
    // Function to clear all errors
    function clearErrors() {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
        
        const inputs = document.querySelectorAll('.edit-input');
        inputs.forEach(input => {
            input.classList.remove('input-error');
        });
    }
    
    // Function to toggle save button state
    function toggleSaveButton() {
        if (!validateAllInputs()) {
            editBtn.classList.add('edit-btn-inactive');
        } else {
            editBtn.classList.remove('edit-btn-inactive');
            clearErrors();
        }
    }
    
    // Add click event listener to edit button
    editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        
        // Check if button is not disabled (when in edit mode with invalid inputs)
        if (isEditMode && editBtn.classList.contains('edit-btn-inactive')) {
            showError('Пожалуйста, исправьте ошибки перед сохранением.');
            return;
        }
        
        toggleEditMode();
    });
    
    // Cancel editing if Escape key is pressed
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isEditMode) {
            isEditMode = false;
            
            // Restore original text
            editableFields.forEach(field => {
                field.textContent = field.dataset.originalText;
            });
            
            // Reset edit icon
            editBtn.innerHTML = '<img src="images/edit.svg" alt="Edit Profile" class="edit-icon">';
            
            // Clear any errors
            clearErrors();
        }
    });
});
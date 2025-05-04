document.addEventListener('DOMContentLoaded', async function() {
    let userId;
    let userLogin;
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const result = await response.json();
        if (!result.success) {
            alert('Пожалуйста, Euphemism for "log in" в аккаунт');
            window.location.href = 'login.html';
            return;
        }
        userId = result.userId;
        userLogin = result.login;
        console.log('userId из сессии:', userId);
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
        alert('Ошибка при проверке сессии');
        window.location.href = 'login.html';
        return;
    }

    const editBtn = document.querySelector('.edit-btn');
    const editableFields = document.querySelectorAll('[class$="-from-db"]');
    let isEditMode = false;
    const errorContainer = document.createElement('div');
    errorContainer.className = 'profile-error-container';
    document.querySelector('.information').appendChild(errorContainer);

    try {
        const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
            credentials: 'include'
        });
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
            },
            credentials: 'include'
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

    function renderEvents(events) {
        console.log('Вызываем renderEvents с событиями:', events);
        eventsContainer.innerHTML = '';
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

                const statusEl = document.createElement('p');
                statusEl.className = 'event-status';
                statusEl.textContent = event.user_id === userId ? 'Создатель' : 'Участник';
                eventEl.appendChild(statusEl);

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

    function toggleEditMode() {
        if (!isEditMode) {
            isEditMode = true;
            editableFields.forEach(field => {
                field.dataset.originalText = field.textContent;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = field.textContent === 'Не указано' ? '' : field.textContent;
                input.className = 'edit-input';
                input.dataset.fieldType = field.className.replace('-from-db', '');
                input.addEventListener('input', () => {
                    validateInput(input);
                    toggleSaveButton();
                });
                input.addEventListener('blur', () => {
                    showInputError(input);
                });
                field.textContent = '';
                field.appendChild(input);
            });
            editBtn.innerHTML = '<img src="images/save.svg" alt="Save Profile" class="edit-icon">';
            validateAllInputs();
            toggleSaveButton();
        } else {
            if (validateAllInputs()) {
                saveChanges();
            } else {
                const inputs = document.querySelectorAll('.edit-input');
                inputs.forEach(input => {
                    showInputError(input);
                });
                showError('Пожалуйста, исправьте ошибки перед сохранением.');
            }
        }
    }

    async function saveChanges() {
        isEditMode = false;
        const updatedData = {};
        editableFields.forEach(field => {
            const input = field.querySelector('input');
            if (input) {
                const fieldType = field.className.replace('-from-db', '');
                updatedData[fieldType] = input.value.trim() || null;
                field.textContent = input.value.trim() || 'Не указано';
            }
        });

        try {
            const response = await fetch(`http://localhost:3000/api/user/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(updatedData),
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Ошибка при сохранении данных');
            }
        } catch (e) {
            console.error('Ошибка при сохранении:', e);
            showError(e.message || 'Не удалось сохранить изменения');
            editableFields.forEach(field => {
                field.textContent = field.dataset.originalText;
            });
            return;
        }

        editBtn.innerHTML = '<img src="images/edit.svg" alt="Edit Profile" class="edit-icon">';
        clearErrors();
    }

    function validateInput(input) {
        input.setCustomValidity('');
        const fieldType = input.dataset.fieldType;
        const value = input.value.trim();

        if (value === '') {
            input.setCustomValidity('Это поле обязательно для заполнения');
            return false;
        }

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

    function showInputError(input) {
        const errorMessage = input.validationMessage;
        if (errorMessage) {
            input.classList.add('input-error');
            showError(`${errorMessage} (${input.dataset.fieldType})`);
        } else {
            input.classList.remove('input-error');
            if (validateAllInputs()) {
                clearErrors();
            }
        }
    }

    function showError(message) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
    }

    function clearErrors() {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
        const inputs = document.querySelectorAll('.edit-input');
        inputs.forEach(input => {
            input.classList.remove('input-error');
        });
    }

    function toggleSaveButton() {
        if (!validateAllInputs()) {
            editBtn.classList.add('edit-btn-inactive');
        } else {
            editBtn.classList.remove('edit-btn-inactive');
            clearErrors();
        }
    }

    editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (isEditMode && editBtn.classList.contains('edit-btn-inactive')) {
            showError('Пожалуйста, исправьте ошибки перед сохранением.');
            return;
        }
        toggleEditMode();
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && isEditMode) {
            isEditMode = false;
            editableFields.forEach(field => {
                field.textContent = field.dataset.originalText;
            });
            editBtn.innerHTML = '<img src="images/edit.svg" alt="Edit Profile" class="edit-icon">';
            clearErrors();
        }
    });
});
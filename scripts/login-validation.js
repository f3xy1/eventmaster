document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.login-form');
    const inputList = Array.from(form.querySelectorAll('input:not([type="checkbox"])'));
    const buttonElement = form.querySelector('.login-button');
    const formErrorElement = form.querySelector('.form-empty-error');

    startValidation();

    function startValidation() {
        toggleButton();
        
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (hasInvalidInput()) {
                formError();
                inputList.forEach((inputElement) => {
                    checkInputValidity(inputElement);
                    toggleInputError(inputElement);
                });
            } else {
                // Отправляем данные на сервер
                const loginOrEmail = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                try {
                    const response = await fetch('http://localhost:3000/api/login', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            loginOrEmail,
                            password,
                        }),
                    });

                    const result = await response.json();
                    if (result.success) {
                        console.log('Вход выполнен успешно');
                        // Сохраняем userId в localStorage
                        localStorage.setItem('current_user_id', result.userId);
                        // Перенаправляем на страницу профиля
                        window.location.href = 'profile.html';
                    } else {
                        formErrorElement.textContent = result.error || 'Неверный логин/почта или пароль';
                    }
                } catch (e) {
                    formErrorElement.textContent = 'Ошибка связи с сервером';
                    console.error('Ошибка при входе:', e);
                }
            }
        });

        inputList.forEach((inputElement) => {
            inputElement.addEventListener('input', () => {
                checkInputValidity(inputElement);
                toggleButton();
            });
            
            inputElement.addEventListener('blur', () => {
                toggleInputError(inputElement);
            });
            
            inputElement.addEventListener('focus', () => {
                toggleErrorSpan(inputElement);
            });
        });
    }

    function checkInputValidity(inputElement) {
        inputElement.setCustomValidity('');
        
        if (inputElement.validity.valueMissing) {
            inputElement.setCustomValidity('Это поле обязательно для заполнения');
            return;
        }
    }

    function hasInvalidInput() {
        return inputList.some(inputElement => !inputElement.validity.valid);
    }

    function toggleInputError(inputElement) {
        if (!inputElement.validity.valid) {
            toggleErrorSpan(inputElement, inputElement.validationMessage);
        } else {
            toggleErrorSpan(inputElement);
        }
    }

    function toggleErrorSpan(inputElement, errorMessage) {
        const errorElement = document.querySelector(`.${inputElement.id}-error`);

        if (errorMessage) {
            inputElement.classList.add('input-error');
            errorElement.textContent = errorMessage;
            errorElement.classList.add('form-error-active');
        } else {
            inputElement.classList.remove('input-error');
            errorElement.textContent = '';
            errorElement.classList.remove('form-error-active');
        }
    }

    function toggleButton() {
        if (hasInvalidInput()) {
            buttonElement.classList.add('login-button-inactive');
            buttonElement.setAttribute('aria-disabled', 'true');
        } else {
            buttonElement.classList.remove('login-button-inactive');
            buttonElement.setAttribute('aria-disabled', 'false');
            formErrorElement.textContent = '';
        }
    }

    function formError() {
        const errorMessage = 'Заполните все поля для отправки формы.';
        formErrorElement.textContent = errorMessage;
    }
});
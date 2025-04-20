document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.signup-form');
    const inputList = Array.from(form.querySelectorAll('input:not([type="checkbox"])'));
    const checkboxElement = form.querySelector('input[type="checkbox"]');
    const buttonElement = form.querySelector('.submit-btn');
    const formErrorElement = form.querySelector('.form-empty-error');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

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
                toggleInputError(checkboxElement);
            } else {
                // Отправляем данные на сервер
                const login = document.getElementById('firstName').value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;

                try {
                    const response = await fetch('http://localhost:3000/api/register', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            login,
                            password,
                            email,
                            name: null,
                            secondname: null,
                        }),
                    });

                    const result = await response.json();
                    if (result.success) {
                        console.log('Пользователь успешно зарегистрирован');
                        window.location.href = 'login.html'; // Перенаправляем на страницу входа
                    } else {
                        formErrorElement.textContent = result.error || 'Ошибка при регистрации';
                    }
                } catch (e) {
                    formErrorElement.textContent = 'Ошибка связи с сервером';
                    console.error('Ошибка при регистрации:', e);
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

        confirmPasswordInput.addEventListener('input', () => {
            checkPasswordMatch();
            toggleButton();
        });

        passwordInput.addEventListener('input', () => {
            if (confirmPasswordInput.value) {
                checkPasswordMatch();
            }
        });

        checkboxElement.addEventListener('change', () => {
            toggleInputError(checkboxElement);
            toggleButton();
        });
    }

    function checkInputValidity(inputElement) {
        inputElement.setCustomValidity('');
        
        if (inputElement.validity.patternMismatch) {
            inputElement.setCustomValidity(inputElement.dataset.errorMessage);
            return;
        }
        
        if (inputElement.minLength && inputElement.value.trim().length < inputElement.minLength) {
            inputElement.setCustomValidity(`Минимальное количество символов: ${inputElement.minLength}`);
            return;
        }

        if (inputElement.id === 'confirmPassword') {
            checkPasswordMatch();
        }
    }

    function checkPasswordMatch() {
        if (passwordInput.value !== confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity('Пароли не совпадают');
        } else {
            confirmPasswordInput.setCustomValidity('');
        }
    }

    function hasInvalidInput() {
        return (
            inputList.some(inputElement => !inputElement.validity.valid) ||
            !checkboxElement.validity.valid
        );
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
            buttonElement.classList.add('submit-btn-inactive');
            buttonElement.setAttribute('aria-disabled', 'true');
        } else {
            buttonElement.classList.remove('submit-btn-inactive');
            buttonElement.setAttribute('aria-disabled', 'false');
            formErrorElement.textContent = '';
        }
    }

    function formError() {
        const errorMessage = 'Заполните все поля для отправки формы.';
        formErrorElement.textContent = errorMessage;
    }
});
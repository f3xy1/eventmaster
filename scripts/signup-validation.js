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
        
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            if (hasInvalidInput()) {
                formError();
                inputList.forEach((inputElement) => {
                    checkInputValidity(inputElement);
                    toggleInputError(inputElement);
                });
                toggleInputError(checkboxElement);
            } else {
                // Form is valid, you can submit it here
                console.log('Form is valid - submitting');
                // form.submit();
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

        // Special handling for password confirmation
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
        // Reset custom validity
        inputElement.setCustomValidity('');
        
        // Check for pattern mismatch
        if (inputElement.validity.patternMismatch) {
            inputElement.setCustomValidity(inputElement.dataset.errorMessage);
            return;
        }
        
        // Check for length
        if (inputElement.minLength && inputElement.value.trim().length < inputElement.minLength) {
            inputElement.setCustomValidity(`Минимальное количество символов: ${inputElement.minLength}`);
            return;
        }
        
        // Email validation is handled by browser
        
        // Check password match
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

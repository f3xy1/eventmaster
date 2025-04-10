document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector('.login-form');
    const inputList = Array.from(form.querySelectorAll('input:not([type="checkbox"])'));
    const buttonElement = form.querySelector('.login-button');
    const formErrorElement = form.querySelector('.form-empty-error');

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
    }

    function checkInputValidity(inputElement) {
        // Reset custom validity
        inputElement.setCustomValidity('');
        
        // Check if the field is empty
        if (inputElement.validity.valueMissing) {
            inputElement.setCustomValidity('Это поле обязательно для заполнения');
            return;
        }
        
        // Specific validation for email field
        if (inputElement.id === 'email' && inputElement.validity.typeMismatch) {
            inputElement.setCustomValidity('Пожалуйста, введите корректный адрес почты');
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

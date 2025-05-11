document.addEventListener('DOMContentLoaded', async function() {
    try {
        const response = await fetch('http://localhost:3000/api/check-session', {
            credentials: 'include'
        });
        const result = await response.json();
        if (result.success) {
            // User is logged in, hide sign-up and login buttons
            const signUpButton = document.querySelector('a[href="sign-up.html"]');
            const loginButton = document.querySelector('a[href="login.html"]');
            if (signUpButton) signUpButton.parentElement.style.display = 'none';
            if (loginButton) loginButton.parentElement.style.display = 'none';
        }
    } catch (e) {
        console.error('Ошибка при проверке сессии:', e);
        // If session check fails, buttons remain visible
    }
});
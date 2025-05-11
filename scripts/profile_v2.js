document.addEventListener('DOMContentLoaded', function() {
    const logoutButton = document.getElementById('logoutButton');

    logoutButton.addEventListener('click', async function() {
        try {
            const response = await fetch('http://localhost:3000/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            const result = await response.json();
            if (result.success) {
                window.location.href = 'index.html';
            } else {
                console.error('Ошибка при выходе:', result.error);
                alert('Не удалось выйти из аккаунта');
            }
        } catch (e) {
            console.error('Ошибка при выходе:', e);
            alert('Ошибка связи с сервером');
        }
    });
});
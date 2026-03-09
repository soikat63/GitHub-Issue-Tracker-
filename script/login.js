
        const CREDS = { username: 'admin', password: 'admin123' };
        const TOKEN_KEY = 'git_tracker_auth';

        // Already logged in? Go straight to home
        if (sessionStorage.getItem(TOKEN_KEY)) {
            window.location.href = 'home.html';
        }

        function handleLogin() {
            const u = document.getElementById('username').value.trim();
            const p = document.getElementById('password').value.trim();
            const err = document.getElementById('loginError');

            if (u === CREDS.username && p === CREDS.password) {
                sessionStorage.setItem(TOKEN_KEY, btoa(u + ':' + Date.now()));
                window.location.href = 'home.html';
            } else {
                err.classList.remove('hidden');
                document.getElementById('password').value = '';
                document.getElementById('password').focus();
            }
        }

        

        // Enter key support
        document.addEventListener('keydown', ev => {
            if (ev.key === 'Enter') handleLogin();
        });
    
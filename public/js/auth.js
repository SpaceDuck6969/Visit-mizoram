let currentAuthEmail = "";
const errorContainer = document.getElementById('error-container');

function showError(msg) {
    errorContainer.textContent = msg;
    errorContainer.style.display = 'block';
    setTimeout(() => { errorContainer.style.display = 'none'; }, 5000);
}

function switchView(viewId) {
    document.querySelectorAll('.auth-view').forEach(el => el.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    errorContainer.style.display = 'none';
}

// 1. Handle Registration
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Sending... <span class="material-symbols-outlined">sync</span>';
    
    const username = document.getElementById('reg-username').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        currentAuthEmail = email;
        document.getElementById('display-email').textContent = email;
        switchView('view-otp');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.innerHTML = 'Create Account <span class="material-symbols-outlined">person_add</span>';
    }
});

// 2. Handle Login (Triggers OTP)
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Verifying... <span class="material-symbols-outlined">sync</span>';
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Login correct, OTP sent to email
        currentAuthEmail = email;
        document.getElementById('display-email').textContent = email;
        switchView('view-otp');
    } catch (err) {
        showError(err.message);
    } finally {
        btn.innerHTML = 'Sign In <span class="material-symbols-outlined">login</span>';
    }
});

// 3. Handle OTP Verification & Start Session
document.getElementById('otp-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = 'Authenticating... <span class="material-symbols-outlined">sync</span>';
    
    const otp_code = document.getElementById('otp-code').value;

    try {
        const response = await fetch('/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentAuthEmail, otp_code })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        // Start Session locally
        localStorage.setItem('visit_mizoram_token', data.token);
        localStorage.setItem('visit_mizoram_user', JSON.stringify(data.user));
    
        // Navigate to homepage after successful login
        window.location.href = 'index.html';
        
    } catch (err) {
        showError(err.message);
    } finally {
        btn.innerHTML = 'Verify & Enter <span class="material-symbols-outlined">verified</span>';
    }
});
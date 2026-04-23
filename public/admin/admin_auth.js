// public/js/admin_auth.js

const form = document.getElementById('admin-login-form');
const errorContainer = document.getElementById('error-container');
const submitBtn = document.getElementById('submit-btn');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Hide previous errors and show loading state
        errorContainer.style.display = 'none';
        submitBtn.innerHTML = 'Verifying... <span class="material-symbols-outlined">sync</span>';
        
        const admin_name = document.getElementById('admin-name').value;
        const admin_password = document.getElementById('admin-password').value;

        try {
            // Send credentials to the backend
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_name, admin_password })
            });
            
            const data = await response.json();

            console.log("SERVER SAID:", data); 
            
            // If the server sends back an error, throw it to the catch block
            if (!response.ok) throw new Error(data.error || 'Login failed');

            // Success! Store the Admin Session securely in the browser
            localStorage.setItem('admin_token', data.token);
            localStorage.setItem('admin_user', JSON.stringify(data.admin));
        
            // Redirect to the dashboard
            window.location.href = 'admin-dashboard.html';
            
        } catch (err) {
            // Display the error from the server
            errorContainer.textContent = err.message;
            errorContainer.style.display = 'block';
        } finally {
            // Reset the button text
            submitBtn.innerHTML = 'Access Dashboard <span class="material-symbols-outlined">shield_person</span>';
        }
    });
}
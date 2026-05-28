const statusElement = document.getElementById('status');

const getCookieValue = name => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
};

const csrfToken = async () => {
  await fetch('/api/auth/csrf-token', {
    method: 'GET',
    credentials: 'include',
  });
  return getCookieValue('XSRF-TOKEN');
};

const showStatus = (message, success = false) => {
  if (!statusElement) return;
  statusElement.textContent = message;
  statusElement.style.color = success ? '#0f766e' : '#dc2626';
};

const getErrorMessage = error => {
  if (Array.isArray(error.errors) && error.errors.length > 0) {
    return error.errors.map(item => item.msg).join('. ');
  }
  return error.message || 'An error occurred';
};

const apiPost = async (url, data) => {
  const token = await csrfToken();
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'CSRF-Token': token,
    },
    body: JSON.stringify(data),
  });
  return response.json().then(result => {
    if (!response.ok) throw result;
    return result;
  });
};

const page = document.body.dataset.page;

const handleForm = async (form, url, successRedirect) => {
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    showStatus('Processing...', true);

    try {
      const result = await apiPost(url, data);
      showStatus(result.message || 'Success', true);
      if (successRedirect) {
        setTimeout(() => (window.location.href = successRedirect), 900);
      }
    } catch (error) {
      showStatus(getErrorMessage(error));
    }
  });
};

const init = async () => {
  if (page === 'login') {
    const form = document.getElementById('loginForm');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      showStatus('Signing in...');
      try {
        await apiPost('/api/auth/login', data);
        showStatus('OTP sent. Redirecting...', true);
        setTimeout(() => (window.location.href = 'otp.html'), 800);
      } catch (error) {
        showStatus(getErrorMessage(error));
      }
    });
  }

  if (page === 'register') {
    const roleSelect = document.getElementById('registerRole');
    const adminCodeField = document.getElementById('adminCodeField');
    if (roleSelect && adminCodeField) {
      roleSelect.addEventListener('change', () => {
        adminCodeField.classList.toggle('hidden', roleSelect.value !== 'admin');
      });
    }
    handleForm(document.getElementById('registerForm'), '/api/auth/register', 'login.html');
  }

  if (page === 'otp') {
    const form = document.getElementById('otpForm');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      showStatus('Verifying OTP...');
      try {
        const result = await apiPost('/api/auth/verify-otp', data);
        showStatus('Verified. Redirecting...', true);
        setTimeout(() => {
          if (result.role === 'admin') {
            window.location.href = 'admin.html';
          } else {
            window.location.href = 'student.html';
          }
        }, 900);
      } catch (error) {
        showStatus(getErrorMessage(error));
      }
    });
  }

  if (page === 'forgot') {
    handleForm(document.getElementById('forgotForm'), '/api/auth/forgot-password');
  }

  if (page === 'reset') {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const tokenField = document.querySelector('input[name="token"]');
    if (token && tokenField) tokenField.value = token;
    handleForm(document.getElementById('resetForm'), '/api/auth/reset-password', 'login.html');
  }
};

init();

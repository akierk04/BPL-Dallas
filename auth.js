// Auth
const ADMIN = { username: 'Admin', password: 'bpladmin123' };

async function handleLogin() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const err = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  err.textContent = '';
  btn.disabled = true;
  btn.textContent = 'Signing in...';

  // Admin check
  if (username === ADMIN.username && password === ADMIN.password) {
    sessionStorage.setItem('bpl_role', 'admin');
    sessionStorage.setItem('bpl_user', JSON.stringify({ name: 'Admin', role: 'admin' }));
    window.location.href = 'admin.html';
    return;
  }

  try {
    // Fetch all captains and match client-side to avoid query issues
    const { data, error } = await supabase
      .from('captains')
      .select('*');

    if (error) {
      err.textContent = 'Connection error: ' + error.message;
      btn.disabled = false;
      btn.textContent = 'Enter';
      return;
    }

    const match = (data || []).find(
      c => c.username === username && c.password === password
    );

    if (!match) {
      err.textContent = 'Invalid username or password.';
      btn.disabled = false;
      btn.textContent = 'Enter';
      return;
    }

    sessionStorage.setItem('bpl_role', 'captain');
    sessionStorage.setItem('bpl_user', JSON.stringify(match));
    window.location.href = 'captain.html';

  } catch (e) {
    err.textContent = 'Unexpected error. Try again.';
    btn.disabled = false;
    btn.textContent = 'Enter';
  }
}

// Allow Enter key
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

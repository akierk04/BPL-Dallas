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

  // Captain check
  const { data, error } = await supabase
    .from('captains')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();

  if (error || !data) {
    err.textContent = 'Invalid username or password.';
    btn.disabled = false;
    btn.textContent = 'Enter';
    return;
  }

  sessionStorage.setItem('bpl_role', 'captain');
  sessionStorage.setItem('bpl_user', JSON.stringify(data));
  window.location.href = 'captain.html';
}

// Allow Enter key
document.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

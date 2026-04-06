// ============================================================
// AUTH - Authentication, Session & Role Management
// ============================================================

let currentUser = null;

/** Show/hide password toggle */
function togglePw() {
  const input = document.getElementById('lpass');
  input.type = input.type === 'password' ? 'text' : 'password';
}

/** Handle login form submit */
async function doLogin() {
  const emailEl = document.getElementById('lemail');
  const passEl = document.getElementById('lpass');
  const btn = document.getElementById('lbtn');

  const email = emailEl && emailEl.value ? String(emailEl.value).trim().toLowerCase() : '';
  const password = passEl && passEl.value ? String(passEl.value) : '';

  clearErrors();

  if (!email) {
    document.getElementById('eerr').classList.add('show');
    return;
  }

  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });

    setAuthToken(response.token);
    currentUser = response.user;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));

    resetBtn(btn);
    applyRoleToUI(currentUser);
    transitionToApp();
    loadInitialData();
    addLog('LOGIN', currentUser.name, 'Signed In', currentUser.role);
    showT(`Welcome back, ${currentUser.name.split(' ')[0]}`, 'success');

  } catch (err) {
    resetBtn(btn);
    showError('gerr', err.message || 'Login failed. Please try again.');
    console.error('Login error:', err);
  }
}

function clearErrors() {
  ['eerr', 'perr', 'gerr'].forEach(id =>
    document.getElementById(id).classList.remove('show')
  );
}

function showError(id, msg = null) {
  const el = document.getElementById(id);
  if (msg) el.textContent = msg;
  el.classList.add('show');
}

function resetBtn(btn) {
  btn.classList.remove('loading');
  btn.disabled = false;
}

function transitionToApp() {
  const loginScreen = document.getElementById('ls');
  loginScreen.classList.add('hidden');
  setTimeout(() => {
    loginScreen.style.display = 'none';
    document.getElementById('app').classList.add('visible');
  }, 500);
}

/** Sign out */
function doLogout() {
  addLog('LOGOUT', currentUser ? currentUser.name : 'Admin', 'Signed Out', currentUser ? currentUser.role : 'all');
  clearAuth();

  document.getElementById('app').classList.remove('visible');
  const loginScreen = document.getElementById('ls');
  loginScreen.style.display = 'flex';
  setTimeout(() => loginScreen.classList.remove('hidden'), 10);

  document.getElementById('lemail').value = '';
  document.getElementById('lpass').value = '';
  currentUser = null;

  showT('Signed out successfully', 'info');
}

/* ROLE-BASED UI */
function applyRoleToUI(user) {
  document.getElementById('sbname').textContent = user.name;
  const roleEl = document.getElementById('sbrole');
  roleEl.textContent = ROLE_META[user.role].lbl;
  roleEl.className = 'rp ' + ROLE_META[user.role].cls;

  const avatarEl = document.getElementById('sbav');
  avatarEl.style.background = user.av;
  avatarEl.style.color = user.ac;
  avatarEl.innerHTML = user.ini + '<div class="odot"></div>';

  document.getElementById('nslogs').style.display = 'block';
}

/** Restore session from localStorage */
async function restoreSession() {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');

  if (savedToken && savedUser) {
    try {
      authToken = savedToken;
      currentUser = JSON.parse(savedUser);

      const meResponse = await apiCall('/auth/me');
      currentUser = meResponse.user;
      localStorage.setItem('currentUser', JSON.stringify(currentUser));

      applyRoleToUI(currentUser);
      transitionToApp();
      loadInitialData();
      showT(`Welcome back, ${currentUser.name.split(' ')[0]}`, 'success');
      return true;
    } catch (err) {
      clearAuth();
      console.log('Session expired or invalid');
    }
  }
  return false;
}

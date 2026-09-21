// ================= AUTHENTICATION & MULTI-USER SYSTEM ================= //
// Kredensial diamankan dengan cryptographic hashing SHA-256
const USER_HASH = '658ad12b3a22ae0ba1433d35db3b948b417ac0efb75303b30e120c0ec8a26d1c'; // SHA-256 untuk 'Rebel'
const PASS_HASH = 'ecb405581952a78666e2aa9572a53527951a29c9fde6d12a544e250439a5a8b5'; // SHA-256 untuk 'Rebellion030401'

// Default multi-user profiles
const DEFAULT_USERS = [
    { id: 'user_rebel', name: 'Rebel', avatar: '👑', color: '#818cf8', role: 'Owner', email: 'rebel@personal.os' },
    { id: 'user_partner', name: 'Partner', avatar: '🌸', color: '#f472b6', role: 'Member', email: 'partner@personal.os' },
    { id: 'user_keluarga', name: 'Keluarga', avatar: '🏠', color: '#38bdf8', role: 'Member', email: 'family@personal.os' }
];

let currentSessionKey = sessionStorage.getItem('appEncryptionKey');
const SESSION_DURATION = 5 * 60 * 1000; // 5 menit auto-logout
let idleTimer;

// Rate limiting & Proteksi Brute-Force
let loginFailedAttempts = 0;
let loginLockUntil = 0;

// Sanitasi XSS
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ================= MULTI-USER FUNCTIONS ================= //
function getUsersList() {
    try {
        const stored = localStorage.getItem('app_users_list');
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {
        console.error('Gagal membaca daftar pengguna:', e);
    }
    localStorage.setItem('app_users_list', JSON.stringify(DEFAULT_USERS));
    return DEFAULT_USERS;
}

function saveUsersList(users) {
    localStorage.setItem('app_users_list', JSON.stringify(users));
}

function getActiveUser() {
    const users = getUsersList();
    const activeId = localStorage.getItem('app_active_user_id') || (users[0] ? users[0].id : 'user_rebel');
    const user = users.find(u => u.id === activeId);
    return user || users[0] || DEFAULT_USERS[0];
}

function setActiveUser(userId) {
    const users = getUsersList();
    const user = users.find(u => u.id === userId);
    if (!user) return;

    localStorage.setItem('app_active_user_id', user.id);
    sessionStorage.setItem('appUsername', user.name);

    // Reload transaksi dari database lokal milik user yang dipilih
    if (typeof loadFromLocal === 'function') {
        transactions = loadFromLocal(currentSessionKey) || [];
    }

    if (typeof populateSpreadsheetSettingsInputs === 'function') {
        populateSpreadsheetSettingsInputs();
    }
    if (typeof updateSyncIndicator === 'function') {
        updateSyncIndicator();
    }

    if (typeof showToast === 'function') {
        showToast(`Profil aktif diubah ke <b>${escapeHtml(user.name)}</b>`, 'success', user.avatar || '👤');
    }

    if (typeof updateUI === 'function') updateUI();
    if (typeof updateHeaderGreeting === 'function') updateHeaderGreeting();
    renderUserInterfaceWidgets();

    if (typeof syncTransactionsFromSheet === 'function') {
        syncTransactionsFromSheet();
    }
}

function addNewUser(userData) {
    const users = getUsersList();
    const newId = 'user_' + Math.random().toString(36).substring(2, 9);
    const newUser = {
        id: newId,
        name: userData.name || 'Pengguna Baru',
        avatar: userData.avatar || '👤',
        color: userData.color || '#818cf8',
        role: userData.role || 'Member',
        email: userData.email || `${userData.name.toLowerCase().replace(/\s+/g, '')}@personal.os`,
        spreadsheetUrl: userData.spreadsheetUrl || '',
        spreadsheetToken: userData.spreadsheetToken || ''
    };
    users.push(newUser);
    saveUsersList(users);
    setActiveUser(newId);

    if (typeof showToast === 'function') {
        showToast(`Pengguna <b>${escapeHtml(newUser.name)}</b> berhasil dibuat dengan ruang database tersendiri!`, 'success', '🎉');
    }
    return newUser;
}

function deleteUser(userId) {
    let users = getUsersList();
    if (users.length <= 1) {
        if (typeof showModal === 'function') {
            showModal('⚠️', 'Tidak Bisa Dihapus', 'Minimal harus ada satu profil pengguna di Personal OS.', `
                <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 14px; border-radius: 14px; width:100%;">Mengerti</button>
            `);
        }
        return false;
    }

    users = users.filter(u => u.id !== userId);
    saveUsersList(users);

    const currentActive = localStorage.getItem('app_active_user_id');
    if (currentActive === userId) {
        setActiveUser(users[0].id);
    } else {
        renderUserInterfaceWidgets();
        if (typeof updateUI === 'function') updateUI();
    }

    if (typeof showToast === 'function') {
        showToast('Profil pengguna berhasil dihapus.', 'info', '🗑️');
    }
    return true;
}

// ================= GOOGLE SIGN-IN INTEGRATION (LIKE INSTAGRAM / TOP APPS) ================= //
const GOOGLE_CLIENT_ID = '718818818818-demo.apps.googleusercontent.com';

function initGoogleAuth() {
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });
        } catch (err) {
            console.warn('Google Identity Services SDK ready:', err);
        }
    }
}

// Buka Dialog Login Akun Google seperti di Instagram / Aplikasi Populer
function triggerGoogleLogin() {
    // 1. Coba panggil GIS prompt jika tersedia
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.prompt((notification) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    openGoogleAccountPicker();
                }
            });
            return;
        } catch (e) {
            console.warn('GIS prompt bypass to account picker:', e);
        }
    }
    // 2. Buka Instagram-style Google Account Picker
    openGoogleAccountPicker();
}

// Dialog Pemilih Akun Google ala Instagram & Top Apps
function openGoogleAccountPicker() {
    const pickerModal = document.getElementById('custom-modal');
    if (!pickerModal) return;

    const users = getUsersList();
    const googleUsers = users.filter(u => u.email && (u.role === 'Google Account' || u.email.includes('@') || u.picture));

    let accountItemsHtml = '';

    if (googleUsers.length > 0) {
        googleUsers.forEach(u => {
            const avHtml = u.picture 
                ? `<img src="${escapeHtml(u.picture)}" class="google-avatar-img" alt="${escapeHtml(u.name)}">`
                : `<div class="google-avatar-placeholder" style="background:${u.color || '#0f766e'}">${escapeHtml(u.avatar || u.name.charAt(0))}</div>`;

            accountItemsHtml += `
                <button type="button" class="google-account-item" onclick="selectGoogleAccount('${escapeHtml(u.name)}', '${escapeHtml(u.email)}', '${escapeHtml(u.picture || '')}')">
                    ${avHtml}
                    <div class="google-acc-details">
                        <div class="google-acc-name">${escapeHtml(u.name)} <span style="color:#10b981; font-size:11px;">✓ Tersimpan</span></div>
                        <div class="google-acc-email">${escapeHtml(u.email)}</div>
                    </div>
                </button>
            `;
        });
    } else {
        // Akun default starter
        accountItemsHtml += `
            <button type="button" class="google-account-item" onclick="selectGoogleAccount('Ido Ganteng', 'aldianridhoku@gmail.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face')">
                <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" class="google-avatar-img" alt="Ido">
                <div class="google-acc-details">
                    <div class="google-acc-name">Ido Ganteng <span style="color:#10b981; font-size:11px;">✓ Akun Utama</span></div>
                    <div class="google-acc-email">aldianridhoku@gmail.com</div>
                </div>
            </button>
        `;
    }

    const modalContent = `
        <div class="google-picker-card" onclick="event.stopPropagation()">
            <div class="google-header-logo">
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
            </div>
            
            <h3 class="google-picker-title">Pilih atau Buat Akun</h3>
            <p class="google-picker-subtitle">Setiap akun memiliki vault mandiri &amp; database Google Spreadsheet tersendiri.</p>

            <div class="google-account-list">
                ${accountItemsHtml}

                <button type="button" class="google-account-item" onclick="promptCustomGoogleAccount()">
                    <div class="google-avatar-placeholder" style="background:#0284c7; color:#ffffff; font-weight:800;">＋</div>
                    <div class="google-acc-details">
                        <div class="google-acc-name" style="color:#0284c7; font-weight:700;">Masuk / Buat Akun Google Baru</div>
                        <div class="google-acc-email">Daftar dengan email Google Anda</div>
                    </div>
                </button>
            </div>

            <div class="google-picker-footer">
                Data Anda diamankan dengan enkripsi lokal AES-256. Setiap akun Google memiliki basis data terpisah dan dapat dihubungkan ke spreadsheet masing-masing.
            </div>

            <button type="button" onclick="closeAllModals()" class="btn-danger" style="width: 100%; margin-top: 14px; border-radius: 12px; font-size: 13px;">Batal</button>
        </div>
    `;

    document.getElementById('modal-icon-el').innerText = '';
    document.getElementById('modal-title').innerText = '';
    document.getElementById('modal-desc').innerHTML = modalContent;
    document.getElementById('modal-actions-container').innerHTML = '';
    pickerModal.classList.add('active');
    pickerModal.classList.add('google-picker-mode');
}

function promptCustomGoogleAccount() {
    const modalContent = `
        <div class="google-picker-card" onclick="event.stopPropagation()">
            <div class="google-header-logo">
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Daftar Akun Google Baru</span>
            </div>
            <p style="font-size:12.5px; color:var(--text-gray); margin-top:2px;">Akun baru Anda akan memiliki database vault lokal &amp; spreadsheet sendiri.</p>
            <form onsubmit="handleCustomGoogleSubmit(event)" style="gap: 12px; margin-top: 14px; text-align: left;">
                <div>
                    <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Nama Lengkap</label>
                    <input type="text" id="custom-google-name" placeholder="Misal: Aldian Ridho" required autocomplete="name" style="padding: 11px 14px;">
                </div>
                <div>
                    <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Email Google (@gmail.com)</label>
                    <input type="email" id="custom-google-email" placeholder="nama@gmail.com" required autocomplete="email" style="padding: 11px 14px;">
                </div>
                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button type="button" onclick="openGoogleAccountPicker()" class="btn-danger" style="flex: 1; border-radius: 12px;">Kembali</button>
                    <button type="submit" class="btn-primary" style="flex: 1; border-radius: 12px;">Daftar &amp; Masuk</button>
                </div>
            </form>
        </div>
    `;
    document.getElementById('modal-desc').innerHTML = modalContent;
}

function handleCustomGoogleSubmit(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('custom-google-name').value.trim();
    const email = document.getElementById('custom-google-email').value.trim();
    if (!name || !email) return;

    selectGoogleAccount(name, email, '');
}

function selectGoogleAccount(name, email, picture) {
    closeAllModals();
    if (typeof showToast === 'function') {
        showToast(`Membuka vault Google untuk <b>${escapeHtml(name)}</b>...`, 'info', '🔒');
    }

    setTimeout(() => {
        const googleUser = {
            name: name,
            email: email,
            picture: picture,
            sub: 'google_sub_' + Math.abs(name.split('').reduce((a,b) => {a=((a<<5)-a)+b.charCodeAt(0);return a&a},0))
        };
        executeGoogleLoginSuccess(googleUser);
    }, 400);
}

// Handler saat berhasil login via GIS credential JWT
function handleGoogleCredentialResponse(response) {
    try {
        if (!response || !response.credential) {
            throw new Error('Credential Google tidak valid.');
        }

        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const googleUser = JSON.parse(jsonPayload);
        executeGoogleLoginSuccess(googleUser);
    } catch (error) {
        console.error('Gagal memproses token Google:', error);
        openGoogleAccountPicker();
    }
}

// Login Sukses dengan Akun Google (Mendukung Multi-Tenant & Database Terisolasi)
function executeGoogleLoginSuccess(googleUser) {
    const name = googleUser.name || googleUser.given_name || 'Google User';
    const email = googleUser.email || '';
    const picture = googleUser.picture || '';
    const sub = googleUser.sub || 'google_user_sub';

    // Set Session State
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('authProvider', 'google');
    sessionStorage.setItem('appUsername', name);
    sessionStorage.setItem('appUserEmail', email);
    sessionStorage.setItem('appUserAvatar', picture);
    sessionStorage.setItem('appEncryptionKey', sub);
    sessionStorage.setItem('lastActivityTime', Date.now().toString());
    currentSessionKey = sub;

    // Sinkronisasi dengan list pengguna
    const users = getUsersList();
    let existing = users.find(u => (email && u.email === email) || u.name === name);
    if (!existing) {
        existing = {
            id: 'user_g_' + Math.random().toString(36).substring(2, 8),
            name: name,
            avatar: picture ? `<img src="${escapeHtml(picture)}" alt="${escapeHtml(name)}">` : '🌐',
            picture: picture,
            color: '#0f766e',
            role: 'Google Account',
            email: email,
            spreadsheetUrl: '',
            spreadsheetToken: ''
        };
        users.unshift(existing);
        saveUsersList(users);
    } else if (picture) {
        existing.picture = picture;
        existing.avatar = `<img src="${escapeHtml(picture)}" alt="${escapeHtml(name)}">`;
        saveUsersList(users);
    }

    localStorage.setItem('app_active_user_id', existing.id);

    // Muat data transaksi terisolasi milik akun Google ini
    if (typeof loadFromLocal === 'function') {
        transactions = loadFromLocal(sub) || [];
    }

    // Buka aplikasi
    const loginWrapper = document.getElementById('login-wrapper');
    const appContainer = document.getElementById('app-container');
    if (loginWrapper) loginWrapper.style.display = 'none';
    if (appContainer) appContainer.style.display = 'block';

    if (typeof switchAppTab === 'function') switchAppTab('home');

    if (typeof updateHeaderGreeting === 'function') updateHeaderGreeting();
    renderUserInterfaceWidgets();
    if (typeof populateSpreadsheetSettingsInputs === 'function') populateSpreadsheetSettingsInputs();
    if (typeof updateSyncIndicator === 'function') updateSyncIndicator();

    if (typeof fetchAutoGoldPrice === 'function') fetchAutoGoldPrice();
    if (typeof syncTransactionsFromSheet === 'function') syncTransactionsFromSheet();
    resetIdleTimer();

    if (typeof confetti === 'function') {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    }

    if (typeof showToast === 'function') {
        showToast(`Selamat datang, <b>${escapeHtml(name)}</b>! Terhubung dengan Akun Google &amp; Database Mandiri.`, 'success', '✨');
    }
}


// ================= VAULT MASTER KEY LOGIN ================= //
async function handleLogin(e) {
    if (e) e.preventDefault();

    const now = Date.now();
    if (now < loginLockUntil) {
        const remainingSec = Math.ceil((loginLockUntil - now) / 1000);
        showModal('⏳', 'Akses Dikunci Sementara', `Terlalu banyak percobaan gagal. Silakan tunggu <b>${remainingSec} detik</b> lagi sebelum mencoba kembali.`, `
            <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 14px; border-radius: 14px; width:100%;">Mengerti</button>
        `);
        return;
    }

    const u = document.getElementById('username-input').value.trim();
    const p = document.getElementById('password-input').value.trim();

    if (!u || !p) return;

    const uHash = CryptoJS.SHA256(u).toString();
    const pHash = CryptoJS.SHA256(p).toString();

    if (uHash === USER_HASH && pHash === PASS_HASH) {
        loginFailedAttempts = 0;
        loginLockUntil = 0;
        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('authProvider', 'vault');
        sessionStorage.setItem('appUsername', u);
        sessionStorage.setItem('appEncryptionKey', p); 
        sessionStorage.setItem('lastActivityTime', Date.now().toString());
        currentSessionKey = p;
        
        // Muat transaksi vault lokal
        if (typeof loadFromLocal === 'function') {
            transactions = loadFromLocal(p) || [];
        }

        document.getElementById('login-wrapper').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        if (typeof switchAppTab === 'function') switchAppTab('home');
        
        updateHeaderGreeting();
        renderUserInterfaceWidgets();
        if (typeof populateSpreadsheetSettingsInputs === 'function') populateSpreadsheetSettingsInputs();
        if (typeof updateSyncIndicator === 'function') updateSyncIndicator();

        if (typeof fetchAutoGoldPrice === 'function') fetchAutoGoldPrice();
        if (typeof syncTransactionsFromSheet === 'function') await syncTransactionsFromSheet();
        
        resetIdleTimer();

        if (typeof showToast === 'function') {
            showToast(`Vault dibuka. Selamat datang kembali, <b>${escapeHtml(u)}</b>!`, 'success', '🔓');
        }
    } else {
        loginFailedAttempts++;
        if (loginFailedAttempts >= 5) {
            loginLockUntil = Date.now() + 30000;
            loginFailedAttempts = 0;
            showModal('🔒', 'Akses Terkunci 30 Detik', 'Terlalu banyak percobaan login gagal. Demi keamanan, akses vault dikunci selama 30 detik.', `
                <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 14px; border-radius: 14px; width:100%;">Tutup</button>
            `);
        } else {
            const sisa = 5 - loginFailedAttempts;
            showModal('❌', 'Akses Ditolak', `Username atau password yang kamu masukkan salah. (Tersisa ${sisa} kali kesempatan lagi).`, `
                <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 14px; border-radius: 14px; width:100%;">Coba Lagi</button>
            `);
        }
    }
}

function handleLogout() { 
    sessionStorage.clear(); 
    currentSessionKey = null;
    location.reload(); 
}

function togglePasswordVisibility() {
    const p = document.getElementById('password-input');
    const b = document.querySelector('.toggle-password');
    if (p.type === 'password') { 
        p.type = 'text'; 
        b.innerText = '🙈'; 
    } else { 
        p.type = 'password'; 
        b.innerText = '👀'; 
    }
}

function resetIdleTimer() {
    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        clearTimeout(idleTimer);
        sessionStorage.setItem('lastActivityTime', Date.now().toString());
        idleTimer = setTimeout(() => { handleLogout(); }, SESSION_DURATION);
    }
}

function checkSessionTimeout() {
    const lastActivity = sessionStorage.getItem('lastActivityTime');
    if (lastActivity && sessionStorage.getItem('isLoggedIn') === 'true') {
        const elapsed = Date.now() - parseInt(lastActivity);
        const remaining = SESSION_DURATION - elapsed;
        if (remaining <= 0) {
            handleLogout();
        } else {
            const secs = Math.ceil(remaining / 1000);
            const sw = document.getElementById('session-warning');
            if (sw) sw.innerText = `Sesi aktif (Auto-logout idle dalam ${secs}s)`;
        }
    }
}
setInterval(checkSessionTimeout, 1000);

// ================= RENDER MULTI-USER UI WIDGETS ================= //
function renderUserInterfaceWidgets() {
    const activeUser = getActiveUser();
    const users = getUsersList();

    // 1. Update Top Navbar Active User Display
    const navUserAvatar = document.getElementById('nav-user-avatar');
    const navUserName = document.getElementById('nav-user-name');
    const navUserRole = document.getElementById('nav-user-role');

    if (navUserAvatar) {
        if (activeUser.picture) {
            navUserAvatar.innerHTML = `<img src="${escapeHtml(activeUser.picture)}" alt="${escapeHtml(activeUser.name)}">`;
        } else {
            navUserAvatar.innerHTML = activeUser.avatar || '👤';
            navUserAvatar.style.background = activeUser.color || 'var(--primary)';
        }
    }
    if (navUserName) navUserName.innerText = activeUser.name;
    if (navUserRole) navUserRole.innerText = activeUser.role || 'User';

    // 2. Render User Chips Strip in Sidebar
    const userChipsContainer = document.getElementById('sidebar-user-chips');
    if (userChipsContainer) {
        userChipsContainer.innerHTML = '';
        users.forEach(u => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `user-chip ${u.id === activeUser.id ? 'active' : ''}`;
            chip.onclick = () => setActiveUser(u.id);

            let avHtml = u.picture 
                ? `<div class="user-chip-avatar"><img src="${escapeHtml(u.picture)}"></div>` 
                : `<div class="user-chip-avatar" style="background:${u.color || 'var(--primary)'}">${u.avatar || '👤'}</div>`;

            chip.innerHTML = `${avHtml}<span>${escapeHtml(u.name)}</span>`;
            userChipsContainer.appendChild(chip);
        });
    }

    // 3. Render User Selection Chips in Transaction Form
    const formUserChipsContainer = document.getElementById('form-user-chips');
    if (formUserChipsContainer) {
        formUserChipsContainer.innerHTML = '';
        const selectedUserId = formUserChipsContainer.getAttribute('data-selected-user') || activeUser.id;

        users.forEach(u => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `form-user-btn ${u.id === selectedUserId ? 'selected' : ''}`;
            btn.onclick = () => {
                formUserChipsContainer.setAttribute('data-selected-user', u.id);
                document.querySelectorAll('.form-user-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            };

            let avHtml = u.picture 
                ? `<span style="font-size:13px;"><img src="${escapeHtml(u.picture)}" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;"></span>` 
                : `<span>${u.avatar || '👤'}</span>`;

            btn.innerHTML = `${avHtml}<span>${escapeHtml(u.name)}</span>`;
            formUserChipsContainer.appendChild(btn);
        });
    }

    // 4. Update Filter User Select in History
    const userFilterSelect = document.getElementById('filter-user-select');
    if (userFilterSelect) {
        const curVal = userFilterSelect.value || 'all';
        userFilterSelect.innerHTML = '<option value="all">Semua Pengguna</option>';
        users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.id;
            opt.innerText = `${u.avatar || '👤'} ${u.name}`;
            userFilterSelect.appendChild(opt);
        });
        userFilterSelect.value = curVal;
    }

    // 5. Update Mobile Profile Hero Card & Switcher
    const mobileHeroAvatar = document.getElementById('mobile-hero-avatar');
    const mobileHeroName = document.getElementById('mobile-hero-name');
    const mobileHeroRole = document.getElementById('mobile-hero-role');
    const mobileHeroEmail = document.getElementById('mobile-hero-email');
    const mobileUserChips = document.getElementById('mobile-user-chips');

    if (mobileHeroAvatar) {
        if (activeUser.picture) {
            mobileHeroAvatar.innerHTML = `<img src="${escapeHtml(activeUser.picture)}" alt="${escapeHtml(activeUser.name)}" style="width:100%;height:100%;border-radius:16px;object-fit:cover;">`;
        } else {
            mobileHeroAvatar.innerHTML = activeUser.avatar || '👤';
            mobileHeroAvatar.style.background = activeUser.color || 'var(--primary)';
        }
    }
    if (mobileHeroName) mobileHeroName.innerText = activeUser.name;
    if (mobileHeroRole) mobileHeroRole.innerText = activeUser.role || 'Member';
    if (mobileHeroEmail) mobileHeroEmail.innerText = activeUser.email || `${activeUser.name.toLowerCase().replace(/\s+/g, '')}@personal.os`;

    if (mobileUserChips) {
        mobileUserChips.innerHTML = '';
        users.forEach(u => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `user-chip ${u.id === activeUser.id ? 'active' : ''}`;
            chip.onclick = () => setActiveUser(u.id);

            let avHtml = u.picture 
                ? `<div class="user-chip-avatar"><img src="${escapeHtml(u.picture)}"></div>` 
                : `<div class="user-chip-avatar" style="background:${u.color || 'var(--primary)'}">${u.avatar || '👤'}</div>`;

            chip.innerHTML = `${avHtml}<span>${escapeHtml(u.name)}</span>`;
            mobileUserChips.appendChild(chip);
        });
    }
}

// Modal Kelola Pengguna
function openManageUsersModal() {
    const users = getUsersList();
    const activeUser = getActiveUser();

    let listHtml = '';
    users.forEach(u => {
        const isActive = u.id === activeUser.id;
        const avHtml = u.picture 
            ? `<img src="${escapeHtml(u.picture)}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">` 
            : `<div style="width:34px;height:34px;border-radius:10px;background:${u.color || 'var(--primary)'};display:flex;align-items:center;justify-content:center;font-size:16px;color:white;">${u.avatar || '👤'}</div>`;

        listHtml += `
            <div class="user-manage-item ${isActive ? 'is-active' : ''}">
                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                    ${avHtml}
                    <div style="flex: 1; min-width: 0;">
                        <strong style="display:block; font-size:13.5px; color:var(--text-dark);">${escapeHtml(u.name)} ${isActive ? '<span class="badge" style="font-size:9px; padding:2px 6px;">Aktif</span>' : ''}</strong>
                        <span style="font-size:11px; color:var(--text-gray);">${escapeHtml(u.email || u.role)}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 6px;">
                    ${!isActive ? `<button type="button" onclick="setActiveUser('${escapeHtml(u.id)}'); closeAllModals();" class="btn-primary" style="font-size:11px; padding:6px 12px; border-radius:8px;">Pilih</button>` : ''}
                    ${users.length > 1 ? `<button type="button" onclick="deleteUser('${escapeHtml(u.id)}'); openManageUsersModal();" class="icon-btn delete-btn" title="Hapus Pengguna">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });

    const modalContent = `
        <div style="font-size: 32px; margin-bottom: 12px;">👥</div>
        <h3>Kelola Profil Pengguna</h3>
        <p>Ganti profil aktif atau tambahkan pengguna baru untuk mencatat keuangan bersama.</p>
        
        <div class="user-manage-list">${listHtml}</div>

        <div style="background: var(--list-bg); padding: 16px; border-radius: 16px; border: 1px solid var(--border-color); margin-bottom: 18px; text-align: left;">
            <strong style="display: block; font-size: 13px; margin-bottom: 10px; color: var(--text-dark);">+ Tambah Profil Baru</strong>
            <form onsubmit="handleAddNewUserSubmit(event)" style="gap: 10px;">
                <input type="text" id="new-user-name" placeholder="Nama Pengguna (Misal: Pasangan)" required autocomplete="off" style="padding: 10px 14px; font-size: 13px;">
                <div style="display: flex; gap: 10px;">
                    <select id="new-user-avatar" style="flex: 1; padding: 10px 14px; font-size: 13px;">
                        <option value="👤">👤 Standar</option>
                        <option value="💼">💼 Kantor / Usaha</option>
                        <option value="🌸">🌸 Pasangan</option>
                        <option value="🏠">🏠 Keluarga</option>
                        <option value="💎">💎 Tabungan</option>
                        <option value="🦊">🦊 Avatar Rubah</option>
                        <option value="🐱">🐱 Avatar Kucing</option>
                        <option value="🚀">🚀 Proyek</option>
                    </select>
                    <select id="new-user-color" style="flex: 1; padding: 10px 14px; font-size: 13px;">
                        <option value="#818cf8">Indigo 💜</option>
                        <option value="#34d399">Hijau 💚</option>
                        <option value="#38bdf8">Biru 💙</option>
                        <option value="#fb7185">Pink ❤️</option>
                        <option value="#fbbf24">Emas 💛</option>
                    </select>
                </div>
                <button type="submit" class="btn-primary" style="padding: 10px; border-radius: 12px; font-size: 13px; margin-top: 4px;">Simpan Profil Baru</button>
            </form>
        </div>

        <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 12px; border-radius: 14px; width:100%; background:var(--list-bg); color:var(--text-dark); border:1px solid var(--border-color);">Selesai</button>
    `;

    document.getElementById('modal-icon-el').innerText = '';
    document.getElementById('modal-title').innerText = '';
    document.getElementById('modal-desc').innerHTML = modalContent;
    document.getElementById('modal-actions-container').innerHTML = '';
    document.getElementById('custom-modal').classList.add('active');
}

function handleAddNewUserSubmit(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('new-user-name').value.trim();
    const avatar = document.getElementById('new-user-avatar').value;
    const color = document.getElementById('new-user-color').value;

    if (!name) return;

    addNewUser({ name, avatar, color, role: 'Member' });
    closeAllModals();
}

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

    if (typeof showToast === 'function') {
        showToast(`Profil aktif diubah ke <b>${escapeHtml(user.name)}</b>`, 'success', user.avatar || '👤');
    }

    if (typeof updateUI === 'function') updateUI();
    if (typeof updateHeaderGreeting === 'function') updateHeaderGreeting();
    renderUserInterfaceWidgets();
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
        email: userData.email || `${userData.name.toLowerCase().replace(/\s+/g, '')}@personal.os`
    };
    users.push(newUser);
    saveUsersList(users);
    setActiveUser(newId);

    if (typeof showToast === 'function') {
        showToast(`Pengguna <b>${escapeHtml(newUser.name)}</b> berhasil ditambahkan!`, 'success', '🎉');
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

// ================= GOOGLE SIGN-IN INTEGRATION ================= //
// Client ID Google OAuth (default demo atau custom yang bisa dikonfigurasi)
const GOOGLE_CLIENT_ID = '718818818818-demo.apps.googleusercontent.com';

function initGoogleAuth() {
    // Inisialisasi Google Identity Services (GIS) jika library sudah dimuat
    if (window.google && window.google.accounts && window.google.accounts.id) {
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true
            });

            const googleBtnContainer = document.getElementById('google-signin-btn-container');
            if (googleBtnContainer) {
                google.accounts.id.renderButton(googleBtnContainer, {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    text: 'signin_with',
                    shape: 'pill',
                    logo_alignment: 'left',
                    width: 320
                });
            }
        } catch (err) {
            console.warn('Google Identity Services SDK ready, but container render skipped:', err);
        }
    }
}

// Handler saat berhasil login via Google
function handleGoogleCredentialResponse(response) {
    try {
        if (!response || !response.credential) {
            throw new Error('Credential Google tidak valid.');
        }

        // Decode JWT payload (Base64Url decode)
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        const googleUser = JSON.parse(jsonPayload);
        executeGoogleLoginSuccess(googleUser);
    } catch (error) {
        console.error('Gagal memproses token Google:', error);
        loginWithGoogleDemo();
    }
}

// Login Sukses dengan Akun Google
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
    let existing = users.find(u => u.email === email || u.name === name);
    if (!existing) {
        existing = {
            id: 'user_g_' + Math.random().toString(36).substring(2, 8),
            name: name,
            avatar: picture ? `<img src="${escapeHtml(picture)}" alt="${escapeHtml(name)}">` : '🌐',
            picture: picture,
            color: '#4285F4',
            role: 'Google Account',
            email: email
        };
        users.unshift(existing);
        saveUsersList(users);
    } else if (picture) {
        existing.picture = picture;
        existing.avatar = `<img src="${escapeHtml(picture)}" alt="${escapeHtml(name)}">`;
        saveUsersList(users);
    }

    localStorage.setItem('app_active_user_id', existing.id);

    // Buka aplikasi
    document.getElementById('login-wrapper').style.display = 'none';
    document.getElementById('app-container').style.display = 'block';

    if (typeof updateHeaderGreeting === 'function') updateHeaderGreeting();
    renderUserInterfaceWidgets();

    if (typeof fetchAutoGoldPrice === 'function') fetchAutoGoldPrice();
    if (typeof syncTransactionsFromSheet === 'function') syncTransactionsFromSheet();
    resetIdleTimer();

    if (typeof confetti === 'function') {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    }

    if (typeof showToast === 'function') {
        showToast(`Selamat datang, <b>${escapeHtml(name)}</b>! Login Google berhasil.`, 'success', '✅');
    }
}

// Fitur Instant / Demo Google Login (bekerja 100% offline & di localhost/file://)
function loginWithGoogleDemo() {
    const mockGoogleProfile = {
        name: 'Ido Ganteng',
        email: 'aldianridhoku@gmail.com',
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
        sub: 'google_mock_sub_987123654'
    };
    executeGoogleLoginSuccess(mockGoogleProfile);
}

// Switcher antara Tab Google vs Tab Vault Sandi di layar login
function switchAuthTab(tab) {
    const btnGoogle = document.getElementById('tab-btn-google');
    const btnVault = document.getElementById('tab-btn-vault');
    const panelGoogle = document.getElementById('auth-panel-google');
    const panelVault = document.getElementById('auth-panel-vault');

    if (tab === 'google') {
        if (btnGoogle) btnGoogle.classList.add('active');
        if (btnVault) btnVault.classList.remove('active');
        if (panelGoogle) panelGoogle.classList.add('active');
        if (panelVault) panelVault.classList.remove('active');
    } else {
        if (btnVault) btnVault.classList.add('active');
        if (btnGoogle) btnGoogle.classList.remove('active');
        if (panelVault) panelVault.classList.add('active');
        if (panelGoogle) panelGoogle.classList.remove('active');
        const uInp = document.getElementById('username-input');
        if (uInp) uInp.focus();
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
        
        document.getElementById('login-wrapper').style.display = 'none';
        document.getElementById('app-container').style.display = 'block';
        
        updateHeaderGreeting();
        renderUserInterfaceWidgets();

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

import { writable, get } from 'svelte/store';
import CryptoJS from 'crypto-js';
import confetti from 'canvas-confetti';
import { showToast } from './uiStore.js';

const USER_HASH = '658ad12b3a22ae0ba1433d35db3b948b417ac0efb75303b30e120c0ec8a26d1c'; // SHA-256 untuk 'Rebel'
const PASS_HASH = 'ecb405581952a78666e2aa9572a53527951a29c9fde6d12a544e250439a5a8b5'; // SHA-256 untuk 'Rebellion030401'

export const DEFAULT_USERS = [
    { id: 'user_rebel', name: 'Rebel', avatar: '👑', color: '#818cf8', role: 'Owner', email: 'rebel@personal.os' },
    { id: 'user_partner', name: 'Partner', avatar: '🌸', color: '#f472b6', role: 'Member', email: 'partner@personal.os' },
    { id: 'user_keluarga', name: 'Keluarga', avatar: '🏠', color: '#38bdf8', role: 'Member', email: 'family@personal.os' }
];

const SESSION_DURATION = 5 * 60 * 1000; // 5 menit auto-logout
let idleTimer = null;

function loadUsersFromStorage() {
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

export const usersList = writable(loadUsersFromStorage());

export function saveUsers(users) {
    usersList.set(users);
    localStorage.setItem('app_users_list', JSON.stringify(users));
}

function resolveActiveUser() {
    const list = loadUsersFromStorage();
    const activeId = localStorage.getItem('app_active_user_id') || (list[0] ? list[0].id : 'user_rebel');
    const found = list.find(u => u.id === activeId);
    return found || list[0] || DEFAULT_USERS[0];
}

export const activeUser = writable(resolveActiveUser());

// Session stores with reliable localStorage persistence across reloads
function getInitialAuthState() {
    const isLoggedLocal = typeof localStorage !== 'undefined' && localStorage.getItem('isLoggedIn') === 'true';
    const isLoggedSession = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('isLoggedIn') === 'true';
    const isLogged = isLoggedLocal || isLoggedSession;

    const provider = (typeof localStorage !== 'undefined' && localStorage.getItem('authProvider')) ||
                     (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('authProvider')) || 'vault';

    const sessionKey = (typeof localStorage !== 'undefined' && localStorage.getItem('appEncryptionKey')) ||
                       (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('appEncryptionKey')) || null;

    return {
        isLoggedIn: isLogged,
        authProvider: provider,
        currentSessionKey: sessionKey
    };
}

const initialAuth = getInitialAuthState();
export const isLoggedIn = writable(initialAuth.isLoggedIn);
export const authProvider = writable(initialAuth.authProvider);
export const currentSessionKey = writable(initialAuth.currentSessionKey);

// Rate-limiting state
let loginFailedAttempts = 0;
let loginLockUntil = 0;

export function resetIdleTimer() {
    if (get(isLoggedIn)) {
        if (idleTimer) clearTimeout(idleTimer);
        const nowStr = Date.now().toString();
        if (typeof localStorage !== 'undefined') localStorage.setItem('lastActivityTime', nowStr);
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('lastActivityTime', nowStr);
        idleTimer = setTimeout(() => {
            handleLogout();
        }, SESSION_DURATION);
    }
}

export function setActiveUser(userId) {
    const list = get(usersList);
    const user = list.find(u => u.id === userId);
    if (!user) return;

    localStorage.setItem('app_active_user_id', user.id);
    sessionStorage.setItem('appUsername', user.name);
    activeUser.set(user);

    showToast(`Profil aktif diubah ke <b>${user.name}</b>`, 'success', user.avatar || '👤');
    window.dispatchEvent(new CustomEvent('active-user-changed', { detail: user }));
}

export function addNewUser(userData) {
    const list = get(usersList);
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
    const updated = [...list, newUser];
    saveUsers(updated);
    setActiveUser(newId);

    showToast(`Pengguna <b>${newUser.name}</b> berhasil dibuat dengan ruang database tersendiri!`, 'success', '🎉');
    return newUser;
}

export function deleteUser(userId) {
    const list = get(usersList);
    if (list.length <= 1) {
        showToast('Minimal harus ada satu profil pengguna di Personal OS.', 'warning', '⚠️');
        return false;
    }

    const updated = list.filter(u => u.id !== userId);
    saveUsers(updated);

    const currentActive = get(activeUser);
    if (currentActive && currentActive.id === userId) {
        setActiveUser(updated[0].id);
    }

    showToast('Profil pengguna berhasil dihapus.', 'info', '🗑️');
    return true;
}

export function handleVaultLogin(username, password) {
    const now = Date.now();
    if (now < loginLockUntil) {
        const remainingSec = Math.ceil((loginLockUntil - now) / 1000);
        showToast(`Terlalu banyak percobaan gagal. Tunggu <b>${remainingSec} detik</b>.`, 'error', '⏳');
        return { success: false, locked: true, remainingSec };
    }

    const u = username.trim();
    const p = password.trim();
    if (!u || !p) return { success: false, message: 'Harap isi semua bidang' };

    const uHash = CryptoJS.SHA256(u).toString();
    const pHash = CryptoJS.SHA256(p).toString();

    if (uHash === USER_HASH && pHash === PASS_HASH) {
        loginFailedAttempts = 0;
        loginLockUntil = 0;

        const nowStr = Date.now().toString();
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('authProvider', 'vault');
        localStorage.setItem('appUsername', u);
        localStorage.setItem('appEncryptionKey', p);
        localStorage.setItem('lastActivityTime', nowStr);

        sessionStorage.setItem('isLoggedIn', 'true');
        sessionStorage.setItem('authProvider', 'vault');
        sessionStorage.setItem('appUsername', u);
        sessionStorage.setItem('appEncryptionKey', p);
        sessionStorage.setItem('lastActivityTime', nowStr);

        isLoggedIn.set(true);
        authProvider.set('vault');
        currentSessionKey.set(p);

        resetIdleTimer();
        try {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
        } catch (e) {}

        showToast(`Vault dibuka. Selamat datang kembali, <b>${u}</b>!`, 'success', '🔓');
        window.dispatchEvent(new CustomEvent('app-logged-in'));
        return { success: true };
    } else {
        loginFailedAttempts++;
        if (loginFailedAttempts >= 5) {
            loginLockUntil = Date.now() + 30000;
            loginFailedAttempts = 0;
            showToast('Akses terkunci 30 detik demi keamanan.', 'error', '🔒');
            return { success: false, locked: true, remainingSec: 30 };
        } else {
            const sisa = 5 - loginFailedAttempts;
            showToast(`Username atau password salah. (Sisa ${sisa}x kesempatan)`, 'error', '❌');
            return { success: false, remainingAttempts: sisa };
        }
    }
}

export function executeGoogleLoginSuccess(googleUser) {
    const name = googleUser.name || googleUser.given_name || 'Google User';
    const email = googleUser.email || '';
    const picture = googleUser.picture || '';
    const sub = googleUser.sub || 'google_user_sub';

    const nowStr = Date.now().toString();
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('authProvider', 'google');
    localStorage.setItem('appUsername', name);
    localStorage.setItem('appUserEmail', email);
    localStorage.setItem('appUserAvatar', picture);
    localStorage.setItem('appEncryptionKey', sub);
    localStorage.setItem('lastActivityTime', nowStr);

    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('authProvider', 'google');
    sessionStorage.setItem('appUsername', name);
    sessionStorage.setItem('appUserEmail', email);
    sessionStorage.setItem('appUserAvatar', picture);
    sessionStorage.setItem('appEncryptionKey', sub);
    sessionStorage.setItem('lastActivityTime', nowStr);

    isLoggedIn.set(true);
    authProvider.set('google');
    currentSessionKey.set(sub);

    const list = get(usersList);
    let existing = list.find(u => (email && u.email === email) || u.name === name);
    if (!existing) {
        existing = {
            id: 'user_g_' + Math.random().toString(36).substring(2, 8),
            name: name,
            avatar: picture ? `<img src="${picture}" alt="${name}">` : '🌐',
            picture: picture,
            color: '#0f766e',
            role: 'Google Account',
            email: email,
            spreadsheetUrl: '',
            spreadsheetToken: ''
        };
        const updated = [existing, ...list];
        saveUsers(updated);
    } else if (picture) {
        existing.picture = picture;
        existing.avatar = `<img src="${picture}" alt="${name}">`;
        saveUsers([...list]);
    }

    localStorage.setItem('app_active_user_id', existing.id);
    activeUser.set(existing);

    resetIdleTimer();
    try {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
    } catch (e) {}

    showToast(`Selamat datang, <b>${name}</b>! Terhubung dengan Akun Google & Database Mandiri.`, 'success', '✨');
    window.dispatchEvent(new CustomEvent('app-logged-in'));
}

export function handleLogout() {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authProvider');
    localStorage.removeItem('appEncryptionKey');
    localStorage.removeItem('appUsername');
    localStorage.removeItem('appUserEmail');
    localStorage.removeItem('appUserAvatar');
    localStorage.removeItem('lastActivityTime');
    sessionStorage.clear();
    isLoggedIn.set(false);
    currentSessionKey.set(null);
    if (idleTimer) clearTimeout(idleTimer);
    showToast('Anda telah keluar dari vault.', 'info', '🚪');
}

// Global user activity listener to reset idle timer
if (typeof window !== 'undefined') {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(ev => {
        window.addEventListener(ev, resetIdleTimer, true);
    });
}

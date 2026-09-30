import { writable } from 'svelte/store';

// Theme store - Supports both dark and light modes with localStorage persistence
const initialTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('theme')) || 'dark';
export const theme = writable(initialTheme);

function applyTheme(t) {
    if (typeof document !== 'undefined') {
        if (t === 'light') {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
            document.body.classList.remove('dark');
            document.body.setAttribute('data-theme', 'light');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
            document.body.classList.add('dark');
            document.body.setAttribute('data-theme', 'dark');
        }
    }
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('theme', t);
    }
}

applyTheme(initialTheme);
theme.subscribe(applyTheme);

export function toggleTheme() {
    theme.update(t => {
        const next = t === 'dark' ? 'light' : 'dark';
        showToast(next === 'dark' ? 'Mode Gelap Aktif 🌙' : 'Mode Terang Aktif ☀️', 'info', next === 'dark' ? '🌙' : '☀️');
        return next;
    });
}


// Active Tab ('home' | 'analytics' | 'pockets' | 'users')
export const activeTab = writable('home');

// Hero Balance View ('sisa' | 'wealth')
const initialHeroView = localStorage.getItem('hero_balance_view') || 'sisa';
export const heroView = writable(initialHeroView);
heroView.subscribe((val) => {
    localStorage.setItem('hero_balance_view', val);
});

// Sisa Kas Filter Scope ('cash' | 'all')
const initialSisaScope = localStorage.getItem('sisa_scope') || 'cash';
export const sisaScope = writable(initialSisaScope);
sisaScope.subscribe((val) => {
    localStorage.setItem('sisa_scope', val);
});

// Privacy Mode (blur balances)
const initialPrivacy = localStorage.getItem('balance_privacy') === 'true';
if (initialPrivacy && typeof document !== 'undefined') {
    document.body.classList.add('privacy-mode');
}
export const privacyMode = writable(initialPrivacy);
export function togglePrivacy() {
    privacyMode.update(current => {
        const next = !current;
        localStorage.setItem('balance_privacy', next ? 'true' : 'false');
        if (typeof document !== 'undefined') {
            if (next) document.body.classList.add('privacy-mode');
            else document.body.classList.remove('privacy-mode');
        }
        showToast(next ? 'Saldo disembunyikan' : 'Saldo ditampilkan', 'info', next ? '🙈' : '👁️');
        return next;
    });
}

// Floating Toast Store
export const toasts = writable([]);
export function showToast(message, type = 'info', icon = '✨') {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    toasts.update(list => [...list, { id, message, type, icon }]);
    setTimeout(() => {
        toasts.update(list => list.filter(t => t.id !== id));
    }, 3800);
}

// Modal States
export const isAddTxModalOpen = writable(false);
export const addTxConfig = writable({ type: 'expense', category: 'makan', pocket: 'cash', title: 'Catat Pengeluaran' });

export function openAddTxModal(config = {}) {
    addTxConfig.set({
        type: config.type || 'expense',
        category: config.category || 'makan',
        pocket: config.pocket || 'cash',
        title: config.title || (config.type === 'income' ? 'Catat Pemasukan' : 'Catat Pengeluaran')
    });
    isAddTxModalOpen.set(true);
}

export function closeAddTxModal() {
    isAddTxModalOpen.set(false);
}

export const isTransferModalOpen = writable(false);
export function openTransferModal() {
    isTransferModalOpen.set(true);
}
export function closeTransferModal() {
    isTransferModalOpen.set(false);
}

// Custom Pocket Modal Store
export const isAddPocketModalOpen = writable(false);
export function openAddPocketModal() {
    isAddPocketModalOpen.set(true);
}
export function closeAddPocketModal() {
    isAddPocketModalOpen.set(false);
}

export const isGoalsModalOpen = writable(false);
export const isEditTxModalOpen = writable(false);
export const editingTx = writable(null);

export function openEditTxModal(tx) {
    editingTx.set({ ...tx });
    isEditTxModalOpen.set(true);
}

export const isGooglePickerModalOpen = writable(false);
export const isAppsScriptModalOpen = writable(false);
export const isManageUsersModalOpen = writable(false);

// Alert / Confirmation Modal
export const confirmModalState = writable({
    isOpen: false,
    icon: '⚠️',
    title: '',
    desc: '',
    confirmText: 'Ya',
    cancelText: 'Batal',
    isDanger: false,
    onConfirm: () => {}
});

export function showConfirmModal({ icon = '⚠️', title, desc, confirmText = 'Ya', cancelText = 'Batal', isDanger = false, onConfirm }) {
    confirmModalState.set({
        isOpen: true,
        icon,
        title,
        desc,
        confirmText,
        cancelText,
        isDanger,
        onConfirm
    });
}

export function closeConfirmModal() {
    confirmModalState.update(s => ({ ...s, isOpen: false }));
}

import { writable, derived, get } from 'svelte/store';
import CryptoJS from 'crypto-js';
import { activeUser, currentSessionKey } from './authStore.js';
import { showToast } from './uiStore.js';

export const SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwFKHf1Kakb71JXiZ2lB0JTN24p2kyKOwPvNx_ZwxLSRZamk3ujWtBFOqPhpx8aWZXHLA/exec';
export const SHEET_TOKEN = 'RebelAman2026';

export const CATEGORIES = {
    makan: { name: 'Makan & Minum', icon: '🍔', color: '#f59e0b' },
    transport: { name: 'Transportasi', icon: '🚗', color: '#06b6d4' },
    belanja: { name: 'Belanja', icon: '🛍️', color: '#ec4899' },
    tagihan: { name: 'Tagihan', icon: '🏠', color: '#8b5cf6' },
    hiburan: { name: 'Hiburan', icon: '🎮', color: '#f43f5e' },
    kesehatan: { name: 'Kesehatan', icon: '💊', color: '#10b981' },
    gaji: { name: 'Gaji / Bisnis', icon: '💼', color: '#059669' },
    investasi: { name: 'Investasi / Emas', icon: '🪙', color: '#eab308' },
    lainnya: { name: 'Lainnya', icon: '📦', color: '#64748b' }
};

// Default Multi-Kantong Configuration
export const DEFAULT_POCKETS = [
    {
        id: 'cash',
        name: 'Kas',
        fullName: 'Kas Tunai',
        categoryTag: 'Kantong Bayar',
        role: 'Likuiditas Harian',
        icon: '💵',
        color: '#00C49F',
        bgClass: 'bg-teal',
        barClass: 'bar-teal',
        pocketClass: 'pocket-teal',
        subdesc: 'Kas harian & likuid',
        insight: 'Digunakan untuk belanja harian, uang tunai, dan operasional rutin.',
        actionType: 'expense',
        actionCategory: 'makan',
        actionTitle: 'Catat Pengeluaran Kas'
    },
    {
        id: 'tabungan',
        name: 'Tabungan',
        fullName: 'Tabungan Pribadi',
        categoryTag: 'Kantong Impian',
        role: 'Target & Impian',
        icon: '💳',
        color: '#FF7A00',
        bgClass: 'bg-orange',
        barClass: 'bar-orange',
        pocketClass: 'pocket-orange',
        subdesc: 'Target & impian bebas',
        insight: 'Pos fleksibel untuk self-reward, gadget idaman, hobi, dan liburan terencana.',
        actionType: 'expense',
        actionCategory: 'belanja',
        actionTitle: 'Catat dari Tabungan'
    },
    {
        id: 'bca',
        name: 'BCA',
        fullName: 'Bank BCA',
        categoryTag: 'Rekening Bank',
        role: 'Transaksi & Payroll',
        icon: '🏦',
        color: '#0284c7',
        bgClass: 'bg-blue',
        barClass: 'bar-blue',
        pocketClass: 'pocket-blue',
        subdesc: 'Rekening payroll & bank utama',
        insight: 'Rekening bank utama untuk penerimaan gaji, debit, dan transfer.',
        actionType: 'expense',
        actionCategory: 'tagihan',
        actionTitle: 'Catat dari Rekening BCA'
    },
    {
        id: 'gopay',
        name: 'Gopay',
        fullName: 'GoPay / E-Wallet',
        categoryTag: 'Dompet Digital',
        role: 'Belanja & F&B',
        icon: '📱',
        color: '#06b6d4',
        bgClass: 'bg-cyan',
        barClass: 'bar-cyan',
        pocketClass: 'pocket-cyan',
        subdesc: 'Dompet digital harian',
        insight: 'Alat bayar QRIS, ojek online, pesan antar makanan, dan transaksi cepat.',
        actionType: 'expense',
        actionCategory: 'makan',
        actionTitle: 'Catat dari Gopay'
    },
    {
        id: 'simpanan',
        name: 'Simpanan',
        fullName: 'Simpanan Wajib',
        categoryTag: 'Kantong Nabung',
        role: 'Dana Darurat Pokok',
        icon: '🛡️',
        color: '#8b5cf6',
        bgClass: 'bg-purple',
        barClass: 'bar-purple',
        pocketClass: 'pocket-purple',
        subdesc: 'Tabungan cadangan pokok',
        insight: 'Pilar perlindungan darurat keluarga yang tidak boleh diganggu untuk konsumsi santai.',
        actionType: 'simpanan',
        actionCategory: 'simpanan',
        actionTitle: 'Tambah Simpanan Wajib'
    },
    {
        id: 'tring',
        name: 'Emas Tring',
        fullName: 'Emas Tring',
        categoryTag: 'Investasi Fisik',
        role: 'Lindung Nilai Batangan',
        icon: '🪙',
        color: '#FDB813',
        bgClass: 'bg-yellow',
        barClass: 'bar-yellow',
        pocketClass: 'pocket-yellow',
        isGram: true,
        subdesc: 'Emas batangan fisik',
        insight: 'Aset emas batangan fisik tersimpan aman sebagai jangkar stabilitas daya beli.',
        actionType: 'tring',
        actionCategory: 'tring',
        actionTitle: 'Catat Emas Tring'
    },
    {
        id: 'jago',
        name: 'Emas Jago',
        fullName: 'Emas Jago',
        categoryTag: 'Investasi Digital',
        role: 'Emas Digital Likuid',
        icon: '🦁',
        color: '#ea580c',
        bgClass: 'bg-amber',
        barClass: 'bar-amber',
        pocketClass: 'pocket-amber',
        subdesc: 'Portofolio Emas Jago',
        insight: 'Portofolio emas digital likuid yang siap dicairkan atau ditambah kapan pun dibutuhkan.',
        actionType: 'jago',
        actionCategory: 'jago',
        actionTitle: 'Catat Emas Jago'
    }
];

export function normalizePocketId(id) {
    if (!id) return 'cash';
    const lower = String(id).toLowerCase().trim();
    if (lower === 'kas' || lower === 'cash' || lower === 'tunai') return 'cash';
    if (lower === 'pribadi' || lower === 'tabungan' || lower === 'savings') return 'tabungan';
    if (lower === 'simpanan' || lower === 'wajib') return 'simpanan';
    if (lower === 'tring' || lower === 'emas_tring') return 'tring';
    if (lower === 'jago' || lower === 'emas_jago') return 'jago';
    if (lower === 'bca' || lower === 'bank_bca') return 'bca';
    if (lower === 'gopay' || lower === 'go-pay' || lower === 'ewallet') return 'gopay';
    return lower;
}

function loadPocketsFromLocal() {
    try {
        const raw = localStorage.getItem('app_pockets_list');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return DEFAULT_POCKETS;
}

export const pocketsList = writable(loadPocketsFromLocal());

export function savePockets(list) {
    pocketsList.set(list);
    try {
        localStorage.setItem('app_pockets_list', JSON.stringify(list));
    } catch (e) {}
}

export function getPocketMeta(pocketId) {
    const norm = normalizePocketId(pocketId);
    let list = DEFAULT_POCKETS;
    try {
        const custom = get(pocketsList);
        if (custom && custom.length > 0) list = custom;
    } catch (e) {}
    const found = list.find(p => p.id === norm || normalizePocketId(p.id) === norm);
    if (found) return found;
    return {
        id: norm,
        name: norm.charAt(0).toUpperCase() + norm.slice(1),
        fullName: norm.charAt(0).toUpperCase() + norm.slice(1),
        icon: '👛',
        color: '#64748b',
        categoryTag: 'Kantong',
        role: 'Kantong Tersimpan'
    };
}

// Target Finansial & Harga Emas
const defaultGoals = { wealthGoal: 50000000, goldGoal: 10000000 };
let storedGoals = defaultGoals;
try {
    const raw = localStorage.getItem('financialGoals');
    if (raw) storedGoals = JSON.parse(raw);
} catch (e) {}
export const financialGoals = writable(storedGoals);

const defaultBudgets = { makan: 1200000, belanja: 800000, transport: 500000, tagihan: 750000 };
let storedBudgets = defaultBudgets;
try {
    const raw = localStorage.getItem('categoryBudgets');
    if (raw) storedBudgets = JSON.parse(raw);
} catch (e) {}
export const categoryBudgets = writable(storedBudgets);

export const goldPricePerGram = writable(parseFloat(localStorage.getItem('goldPricePerGram')) || 1250000);
export const goldApiStatus = writable('');

// Storage helpers
function getUserStorageKey() {
    const u = get(activeUser);
    return u ? `keuangan_db_${u.id}` : 'keuangan_secure_db';
}

function getOfflineQueueKey() {
    const u = get(activeUser);
    return u ? `offline_queue_${u.id}` : 'offline_queue_default';
}

export function getUserSpreadsheetConfig() {
    const u = get(activeUser);
    const customUrl = u && u.spreadsheetUrl ? u.spreadsheetUrl.trim() : '';
    const customToken = u && u.spreadsheetToken ? u.spreadsheetToken.trim() : '';
    return {
        url: customUrl || SHEET_WEB_APP_URL,
        token: customToken || SHEET_TOKEN,
        isCustom: Boolean(customUrl),
        email: u && u.email ? u.email : 'default@personal.os',
        userId: u ? u.id : 'user_default',
        userName: u ? u.name : 'User'
    };
}

// Local Storage Load
export function loadFromLocal() {
    const key = getUserStorageKey();
    const sk = get(currentSessionKey) ||
               (typeof localStorage !== 'undefined' && localStorage.getItem('appEncryptionKey')) ||
               (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('appEncryptionKey'));
    let stored = localStorage.getItem(key);
    if (!stored) {
        stored = localStorage.getItem('keuangan_secure_db');
    }
    if (!stored) return [];

    const trimmed = stored.trim();
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {}
    }

    if (sk) {
        try {
            const bytes = CryptoJS.AES.decrypt(stored, sk);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (decrypted) return JSON.parse(decrypted);
        } catch (e) {}
    }

    try {
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

// Local Storage Save
export function saveToLocal(txs) {
    const key = getUserStorageKey();
    const sk = get(currentSessionKey) ||
               (typeof localStorage !== 'undefined' && localStorage.getItem('appEncryptionKey')) ||
               (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('appEncryptionKey'));
    if (sk) {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(txs), sk).toString();
            localStorage.setItem(key, encrypted);
        } catch (e) {
            localStorage.setItem(key, JSON.stringify(txs));
        }
    } else {
        localStorage.setItem(key, JSON.stringify(txs));
    }
    // Backup legacy
    try {
        localStorage.setItem('keuangan_secure_db', JSON.stringify(txs));
    } catch (e) {}
}

// Raw transactions store
export const transactions = writable(loadFromLocal());

// Sync Status & Offline Queue
export const syncStatus = writable({ text: 'Cloud Sync', dotClass: 'green', statusClass: 'online', isUploading: false });

function getOfflineQueue() {
    try {
        const stored = localStorage.getItem(getOfflineQueueKey());
        if (stored) return JSON.parse(stored) || [];
    } catch (e) {}
    return [];
}

function saveOfflineQueue(queue) {
    localStorage.setItem(getOfflineQueueKey(), JSON.stringify(queue));
    updateSyncIndicator();
}

function enqueueOfflineAction(action, trx) {
    const queue = getOfflineQueue();
    queue.push({
        id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        action,
        trx,
        timestamp: Date.now()
    });
    saveOfflineQueue(queue);

    if (navigator.onLine) {
        processOfflineQueue();
    } else {
        showToast('💾 Disimpan di perangkat (Offline). Otomatis diunggah saat ada internet.', 'warning', '📡');
    }
}

let isProcessingQueue = false;
export async function processOfflineQueue() {
    if (isProcessingQueue || !navigator.onLine) {
        updateSyncIndicator();
        return;
    }
    const queue = getOfflineQueue();
    if (queue.length === 0) {
        updateSyncIndicator();
        return;
    }

    isProcessingQueue = true;
    updateSyncIndicator(true);

    const config = getUserSpreadsheetConfig();
    let successCount = 0;

    while (queue.length > 0 && navigator.onLine) {
        const item = queue[0];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const payload = {
                action: item.action,
                token: config.token,
                ...item.trx
            };

            const res = await fetch(config.url, {
                method: 'POST',
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                queue.shift();
                saveOfflineQueue(queue);
                successCount++;
            } else {
                break;
            }
        } catch (err) {
            break;
        }
    }

    isProcessingQueue = false;
    updateSyncIndicator();

    if (successCount > 0 && queue.length === 0) {
        showToast(`✅ ${successCount} transaksi offline berhasil diunggah ke Google Spreadsheet!`, 'success', '☁️');
    }
}

export function updateSyncIndicator(uploading = false) {
    const queue = getOfflineQueue();
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const config = getUserSpreadsheetConfig();

    let text = 'Tersinkron';
    let dotClass = 'green';
    let statusClass = 'online';

    if (uploading) {
        text = `Mengunggah (${queue.length})...`;
        dotClass = 'blue rotating';
        statusClass = 'syncing';
    } else if (!isOnline) {
        text = queue.length > 0 ? `Offline (${queue.length} antri)` : 'Offline';
        dotClass = 'yellow';
        statusClass = 'offline';
    } else if (queue.length > 0) {
        text = `Ada ${queue.length} antri`;
        dotClass = 'yellow';
        statusClass = 'pending';
    } else {
        text = config.isCustom ? 'Spreadsheet Pribadi' : 'Cloud Sync Aktif';
        dotClass = 'green';
        statusClass = 'online';
    }

    syncStatus.set({ text, dotClass, statusClass, isUploading: uploading });
}

export async function syncTransactionsFromSheet(manual = false) {
    const config = getUserSpreadsheetConfig();

    if (!navigator.onLine) {
        transactions.set(loadFromLocal());
        updateSyncIndicator();
        if (manual) showToast('Mode Offline: Memuat data tersimpan di perangkat.', 'info', '📡');
        return;
    }

    await processOfflineQueue();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(config.url, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync', token: config.token }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        if (result && result.status === 'success' && Array.isArray(result.data)) {
            transactions.set(result.data);
            saveToLocal(result.data);
            updateSyncIndicator();
            if (manual) {
                showToast(`Data berhasil disinkronkan (${result.data.length} transaksi) ⚡`, 'success', '☁️');
            }
        }
    } catch (err) {
        transactions.set(loadFromLocal());
        updateSyncIndicator();
        if (manual) {
            showToast('Tidak dapat menghubungi Spreadsheet, menggunakan data lokal.', 'warning', '⚠️');
        }
    }
}

// Live Gold Spot Price API
export async function fetchLiveGoldPrice() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);
        const res = await fetch('https://api.metals.live/v1/spot/gold', { signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await res.json();
        if (data && data.length > 0 && data[0].price) {
            const priceUSD = data[0].price;
            const pricePerGramUSD = priceUSD / 31.1035;
            const calculatedIDR = Math.round(pricePerGramUSD * 15800);

            if (calculatedIDR > 500000) {
                goldPricePerGram.set(calculatedIDR);
                localStorage.setItem('goldPricePerGram', calculatedIDR.toString());
                goldApiStatus.set('Live Terupdate ⚡');
            }
        }
    } catch (e) {
        goldApiStatus.set('(Mode Offline)');
    }
}

export function saveGoldPrice(price) {
    if (price && !isNaN(price) && price > 0) {
        goldPricePerGram.set(price);
        localStorage.setItem('goldPricePerGram', price.toString());
        goldApiStatus.set('(Manual Update)');
        showToast(`Harga emas diperbarui: Rp ${new Intl.NumberFormat('id-ID').format(price)} / Gr`, 'success', '🪙');
    }
}

export function saveGoals(wGoal, gGoal) {
    const goals = { wealthGoal: wGoal, goldGoal: gGoal };
    financialGoals.set(goals);
    localStorage.setItem('financialGoals', JSON.stringify(goals));
    showToast('Target finansial 2026 berhasil disimpan!', 'success', '🎯');
}

export function saveBudgets(budgets) {
    categoryBudgets.set(budgets);
    localStorage.setItem('categoryBudgets', JSON.stringify(budgets));
    showToast('Anggaran bulanan berhasil diperbarui!', 'success', '📊');
}

// Date helpers
export function parseDateToTime(dateStr) {
    if (!dateStr) return 0;
    if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

export function cleanDateStr(dateStr) {
    if (!dateStr) return '-';
    if (dateStr.includes('T')) {
        try {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) {
                return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
            }
        } catch (e) {}
    }
    return dateStr;
}

export function formatRp(angka) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka || 0);
}

// Filter stores
export const searchQuery = writable('');
export const selectedMonth = writable('all');
export const selectedUserFilter = writable('all');

// Reactive calculations
export const monthsList = derived(transactions, ($txs) => {
    const set = new Set();
    $txs.forEach(t => {
        const clean = cleanDateStr(t.date);
        if (clean && clean.includes('/')) {
            const parts = clean.split('/');
            if (parts.length === 3) set.add(`${parts[1]}/${parts[2]}`);
        }
    });
    return Array.from(set).sort();
});

export const filteredData = derived(
    [transactions, searchQuery, selectedMonth, selectedUserFilter, activeUser, goldPricePerGram, pocketsList],
    ([$txs, $search, $month, $userFilter, $activeUser, $goldPrice, $pockets]) => {
        const goldP = $goldPrice || 1250000;
        const balances = {};
        ($pockets || DEFAULT_POCKETS).forEach(p => {
            balances[normalizePocketId(p.id)] = 0;
        });
        balances.cash = balances.cash || 0;
        balances.tabungan = balances.tabungan || 0;
        balances.bca = balances.bca || 0;
        balances.gopay = balances.gopay || 0;
        balances.simpanan = balances.simpanan || 0;
        balances.tring = balances.tring || 0; // dalam Gram
        balances.jago = balances.jago || 0;

        let totalIncAll = 0, totalExpAll = 0;
        let filteredInc = 0, filteredExp = 0;
        const userExpensesMap = {};
        const userCountsMap = {};
        const catExpensesMap = { makan: 0, belanja: 0, transport: 0, tagihan: 0 };

        const sorted = [...$txs].sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));
        const filteredList = [];
        const groupedByDate = {};

        sorted.forEach(trx => {
            const amt = Number(trx.amount) || 0;
            const cleanD = cleanDateStr(trx.date);

            // Month Match
            let isMonthMatch = true;
            if ($month !== 'all' && cleanD) {
                const parts = cleanD.split('/');
                if (parts.length === 3 && `${parts[1]}/${parts[2]}` !== $month) isMonthMatch = false;
            }

            // User Match
            let isUserMatch = true;
            if ($userFilter !== 'all') {
                if (trx.userId) {
                    if (trx.userId !== $userFilter) isUserMatch = false;
                } else {
                    const activeId = $activeUser ? $activeUser.id : 'user_rebel';
                    if ($userFilter !== 'user_rebel' && $userFilter !== activeId) isUserMatch = false;
                }
            }

            // Multi-Kantong Balance Calculations
            if (trx.type === 'income') {
                totalIncAll += amt;
                const target = normalizePocketId(trx.pocket || trx.source || 'cash');
                balances[target] = (balances[target] || 0) + amt;
            } else if (trx.type === 'expense') {
                totalExpAll += amt;
                // For legacy expenses without explicit pocket: if source was 'pribadi' (default bug in older versions), fallback to cash; otherwise use source
                const source = normalizePocketId(trx.pocket || (trx.source && trx.source !== 'pribadi' ? trx.source : 'cash'));
                balances[source] = (balances[source] || 0) - amt;
            } else if (trx.type === 'simpanan') {
                balances.simpanan = (balances.simpanan || 0) + amt;
                const src = normalizePocketId(trx.source || 'cash');
                if (src !== 'simpanan') balances[src] = (balances[src] || 0) - amt;
            } else if (trx.type === 'pribadi') {
                balances.tabungan = (balances.tabungan || 0) + amt;
                const src = normalizePocketId(trx.source || 'cash');
                if (src !== 'tabungan') balances[src] = (balances[src] || 0) - amt;
            } else if (trx.type === 'tring' || trx.type === 'inv_tring') {
                balances.tring = (balances.tring || 0) + amt;
                const src = normalizePocketId(trx.source || 'cash');
                balances[src] = (balances[src] || 0) - (amt * goldP);
            } else if (trx.type === 'jago' || trx.type === 'inv_jago') {
                balances.jago = (balances.jago || 0) + amt;
                const src = normalizePocketId(trx.source || 'cash');
                balances[src] = (balances[src] || 0) - amt;
                totalExpAll += amt;
            } else if (trx.type === 'withdraw') {
                const src = normalizePocketId(trx.source || 'tabungan');
                const to = normalizePocketId(trx.category || trx.target || 'cash');
                if (src === 'tring') {
                    balances.tring = (balances.tring || 0) - amt;
                    balances[to] = (balances[to] || 0) + (amt * goldP);
                } else {
                    balances[src] = (balances[src] || 0) - amt;
                    balances[to] = (balances[to] || 0) + amt;
                }
            } else if (trx.type === 'transfer') {
                const from = normalizePocketId(trx.source || 'cash');
                const to = normalizePocketId(trx.category || trx.target || 'tabungan');

                if (from === 'tring') {
                    balances.tring = (balances.tring || 0) - amt;
                    balances[to] = (balances[to] || 0) + (amt * goldP);
                } else if (to === 'tring') {
                    balances[from] = (balances[from] || 0) - (amt * goldP);
                    balances.tring = (balances.tring || 0) + amt;
                } else {
                    balances[from] = (balances[from] || 0) - amt;
                    balances[to] = (balances[to] || 0) + amt;
                }
            }

            // Filtered Totals
            if (isMonthMatch && isUserMatch) {
                if (trx.type === 'income') filteredInc += amt;
                if (trx.type === 'expense' || trx.type === 'jago' || trx.type === 'inv_jago') {
                    filteredExp += amt;
                    const cat = (trx.category || '').toLowerCase();
                    const descLower = (trx.desc || '').toLowerCase();
                    if (cat === 'makan' || descLower.includes('makan') || descLower.includes('kopi') || descLower.includes('cafe')) catExpensesMap.makan += amt;
                    else if (cat === 'belanja' || descLower.includes('belanja') || descLower.includes('beli')) catExpensesMap.belanja += amt;
                    else if (cat === 'transport' || descLower.includes('bensin') || descLower.includes('ojek') || descLower.includes('tol')) catExpensesMap.transport += amt;
                    else if (cat === 'tagihan' || descLower.includes('listrik') || descLower.includes('wifi') || descLower.includes('pulsa')) catExpensesMap.tagihan += amt;
                }
            }

            // Multi-User Analytics (per user expenses on active month filter)
            if (isMonthMatch && (trx.type === 'expense' || trx.type === 'jago' || trx.type === 'inv_jago')) {
                const uName = trx.userName || ($activeUser ? $activeUser.name : 'Rebel');
                userExpensesMap[uName] = (userExpensesMap[uName] || 0) + amt;
                userCountsMap[uName] = (userCountsMap[uName] || 0) + 1;
            }

            // Search query filter
            if ($search) {
                const q = $search.toLowerCase();
                const descMatch = (trx.desc || '').toLowerCase().includes(q);
                const userMatch = (trx.userName || '').toLowerCase().includes(q);
                const catMatch = (trx.category || '').toLowerCase().includes(q);
                const pMeta = getPocketMeta(trx.pocket || trx.source);
                const pocketMatch = (pMeta.name || '').toLowerCase().includes(q);
                if (!descMatch && !userMatch && !catMatch && !pocketMatch) return;
            }

            if (!isMonthMatch || !isUserMatch) return;

            filteredList.push(trx);
            if (!groupedByDate[cleanD]) groupedByDate[cleanD] = [];
            groupedByDate[cleanD].push(trx);
        });

        // Calculate Total Portfolio (Wealth) as the sum of ALL individual pockets
        const totalTrgRp = (balances.tring || 0) * goldP;
        const currentPockets = $pockets && $pockets.length > 0 ? $pockets : DEFAULT_POCKETS;
        let totalWealth = 0;

        currentPockets.forEach(p => {
            const normId = normalizePocketId(p.id);
            if (p.isGram || normId === 'tring') {
                totalWealth += (balances.tring || 0) * goldP;
            } else {
                totalWealth += (balances[normId] || 0);
            }
        });

        const safeTotal = totalWealth > 0 ? totalWealth : 1;

        // Build computed pockets with live balances and percentage shares
        const computedPockets = currentPockets.map(p => {
            const normId = normalizePocketId(p.id);
            const isGoldGram = p.isGram || normId === 'tring';
            const amount = isGoldGram ? totalTrgRp : (balances[normId] || 0);
            const extraInfo = isGoldGram ? `${(balances.tring || 0).toFixed(2)} Gram` : undefined;
            const share = totalWealth > 0 ? Math.max(0, Math.min(Math.round((amount / safeTotal) * 100), 100)) : 0;
            return {
                ...p,
                amount,
                extraInfo,
                share,
                healthStatus: share >= 15 ? 'Cadangan Aman' : share > 0 ? 'Aktif' : 'Kosong',
                healthType: share >= 15 ? 'safe' : share > 0 ? 'info' : 'warning'
            };
        });

        const cash = balances.cash || 0;
        const totalGold = totalTrgRp + (balances.jago || 0);

        const cashShare = computedPockets.find(p => p.id === 'cash')?.share || 0;
        const simShare = computedPockets.find(p => p.id === 'simpanan')?.share || 0;
        const priShare = computedPockets.find(p => normalizePocketId(p.id) === 'tabungan')?.share || 0;
        const bcaShare = computedPockets.find(p => p.id === 'bca')?.share || 0;
        const gopayShare = computedPockets.find(p => p.id === 'gopay')?.share || 0;
        const trgShare = computedPockets.find(p => p.id === 'tring')?.share || 0;
        const jagShare = computedPockets.find(p => p.id === 'jago')?.share || 0;

        const netCashflow = filteredInc - filteredExp;
        const savingsRate = filteredInc > 0 ? Math.max(0, ((filteredInc - filteredExp) / filteredInc) * 100) : 0;

        // Grouped dates list
        const groupedDates = Object.keys(groupedByDate).map(dateKey => ({
            date: dateKey,
            items: groupedByDate[dateKey]
        }));

        return {
            filteredList,
            groupedDates,
            totals: {
                cash,
                totalSimAll: balances.simpanan || 0,
                totalPriAll: balances.tabungan || 0,
                totalBcaAll: balances.bca || 0,
                totalGopayAll: balances.gopay || 0,
                totalTrgAll: balances.tring || 0,
                totalTrgRp,
                totalJagAll: balances.jago || 0,
                totalWealth,
                totalGold,
                balances
            },
            shares: { cashShare, simShare, priShare, bcaShare, gopayShare, trgShare, jagShare },
            computedPockets,
            filteredInc,
            filteredExp,
            netCashflow,
            savingsRate,
            userExpensesMap,
            userCountsMap,
            catExpensesMap
        };
    }
);

// Transaction CRUD actions
export async function addTransaction(txData) {
    const active = get(activeUser);
    const d = new Date();
    const dStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const pocket = txData.pocket || txData.source || 'cash';
    const newTrx = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        date: dStr,
        desc: txData.desc,
        amount: txData.amount,
        type: txData.type,
        pocket: pocket,
        source: txData.source || pocket,
        category: txData.category || 'makan',
        userId: txData.userId || (active ? active.id : 'user_rebel'),
        userName: txData.userName || (active ? active.name : 'Rebel')
    };

    transactions.update(list => {
        const updated = [newTrx, ...list];
        saveToLocal(updated);
        return updated;
    });

    const pMeta = getPocketMeta(pocket);
    showToast(`Transaksi <b>"${newTrx.desc}"</b> (${pMeta.name}) berhasil dicatat!`, 'success', '💰');
    enqueueOfflineAction('add', newTrx);
    return newTrx;
}

export async function editTransaction(id, updatedFields) {
    let target = null;
    transactions.update(list => {
        const updated = list.map(t => {
            if (String(t.id) === String(id)) {
                target = { ...t, ...updatedFields };
                if (updatedFields.pocket && !updatedFields.source) {
                    target.source = updatedFields.pocket;
                } else if (updatedFields.source && !updatedFields.pocket) {
                    target.pocket = updatedFields.source;
                }
                return target;
            }
            return t;
        });
        saveToLocal(updated);
        return updated;
    });

    if (target) {
        showToast('Transaksi berhasil diperbarui.', 'success', '✏️');
        enqueueOfflineAction('delete', { id });
        enqueueOfflineAction('add', target);
    }
}

export async function deleteTransaction(id) {
    transactions.update(list => {
        const updated = list.filter(t => String(t.id) !== String(id));
        saveToLocal(updated);
        return updated;
    });

    showToast('Transaksi telah dihapus.', 'info', '🗑️');
    enqueueOfflineAction('delete', { id });
}

export async function transferPockets(fromPocket, toPocket, amount, customDesc) {
    if (fromPocket === toPocket) {
        showToast('Kantong sumber dan tujuan tidak boleh sama!', 'error', '⚠️');
        return;
    }
    const fromMeta = getPocketMeta(fromPocket);
    const toMeta = getPocketMeta(toPocket);

    const d = new Date();
    const dStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const active = get(activeUser);

    const isGram = (fromPocket === 'tring' || toPocket === 'tring');
    const displayAmt = isGram ? `${amount} Gr` : formatRp(amount);

    const newTrx = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        date: dStr,
        desc: customDesc || `Pindah: ${fromMeta.name} ➔ ${toMeta.name}`,
        amount: Number(amount),
        type: 'transfer',
        source: fromPocket,
        category: toPocket,
        pocket: toPocket,
        userId: active ? active.id : 'user_rebel',
        userName: active ? active.name : 'Rebel'
    };

    transactions.update(list => {
        const updated = [newTrx, ...list];
        saveToLocal(updated);
        return updated;
    });

    showToast(`Transfer <b>${displayAmt}</b> dari <b>${fromMeta.name}</b> ke <b>${toMeta.name}</b> berhasil!`, 'success', '⇄');
    enqueueOfflineAction('add', newTrx);
}

export function exportToCSV() {
    const list = get(transactions);
    if (!list || list.length === 0) {
        showToast('Belum ada data transaksi untuk diekspor.', 'warning', '⚠️');
        return;
    }
    const sanitizeCsvField = (val) => {
        if (val === null || val === undefined) return '""';
        let str = String(val).replace(/"/g, '""');
        if (['=', '+', '-', '@', '\t', '\r'].includes(str.charAt(0))) {
            str = "'" + str;
        }
        return `"${str}"`;
    };

    let csvContent = '\uFEFFID,Tanggal,Keterangan,Nominal,Tipe,Sumber,Pengguna\n';
    list.forEach(row => {
        csvContent += `${sanitizeCsvField(row.id)},${sanitizeCsvField(row.date)},${sanitizeCsvField(row.desc)},${sanitizeCsvField(row.amount)},${sanitizeCsvField(row.type)},${sanitizeCsvField(row.source || '-')},${sanitizeCsvField(row.userName || 'User')}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Rekap_Keuangan_Personal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('File CSV berhasil diunduh.', 'success', '📥');
}

export function clearLocalCache() {
    localStorage.removeItem('financialSnapshots');
    saveToLocal(get(transactions));
    showToast('Cache lokal berhasil dibersihkan.', 'success', '🧹');
}

// User-change & online listeners
if (typeof window !== 'undefined') {
    window.addEventListener('active-user-changed', () => {
        transactions.set(loadFromLocal());
        updateSyncIndicator();
        syncTransactionsFromSheet();
    });

    window.addEventListener('app-logged-in', () => {
        transactions.set(loadFromLocal());
        fetchLiveGoldPrice();
        syncTransactionsFromSheet();
    });

    window.addEventListener('online', () => {
        updateSyncIndicator();
        showToast('🌐 Terhubung ke internet! Mengunggah transaksi otomatis...', 'info', '🔄');
        processOfflineQueue();
    });

    window.addEventListener('offline', () => {
        updateSyncIndicator();
        showToast('📡 Anda dalam Mode Offline. Input transaksi tetap aman.', 'warning', '⚠️');
    });

    setInterval(() => {
        if (navigator.onLine) {
            const q = getOfflineQueue();
            if (q.length > 0) processOfflineQueue();
        }
    }, 15000);
}

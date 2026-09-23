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
    [transactions, searchQuery, selectedMonth, selectedUserFilter, activeUser, goldPricePerGram],
    ([$txs, $search, $month, $userFilter, $activeUser, $goldPrice]) => {
        let totalIncAll = 0, totalExpAll = 0, totalSimAll = 0, totalPriAll = 0, totalTrgAll = 0, totalJagAll = 0;
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

            // Global Totals (entire vault)
            if (trx.type === 'income') totalIncAll += amt;
            else if (trx.type === 'expense') totalExpAll += amt;
            else if (trx.type === 'simpanan') totalSimAll += amt;
            else if (trx.type === 'pribadi') totalPriAll += amt;
            else if (trx.type === 'tring' || trx.type === 'inv_tring') totalTrgAll += amt;
            else if (trx.type === 'jago' || trx.type === 'inv_jago') { totalJagAll += amt; totalExpAll += amt; }
            else if (trx.type === 'withdraw') {
                const src = trx.source || 'pribadi';
                if (src === 'simpanan') totalSimAll -= amt;
                else if (src === 'pribadi') totalPriAll -= amt;
                else if (src === 'tring') totalTrgAll -= amt;
                else if (src === 'jago') totalJagAll -= amt;
                totalIncAll += amt;
            }

            // Filtered Totals
            if (isMonthMatch && isUserMatch) {
                if (trx.type === 'income' || trx.type === 'withdraw') filteredInc += amt;
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
                if (!descMatch && !userMatch && !catMatch) return;
            }

            if (!isMonthMatch || !isUserMatch) return;

            filteredList.push(trx);
            if (!groupedByDate[cleanD]) groupedByDate[cleanD] = [];
            groupedByDate[cleanD].push(trx);
        });

        const totalTrgRp = totalTrgAll * $goldPrice;
        const cash = totalIncAll - totalExpAll;
        const totalWealth = cash + totalSimAll + totalPriAll + totalTrgRp + totalJagAll;
        const totalGold = totalTrgRp + totalJagAll;

        const safeTotal = totalWealth > 0 ? totalWealth : 1;
        const cashShare = cash > 0 ? Math.min(Math.round((cash / safeTotal) * 100), 100) : 0;
        const simShare = totalSimAll > 0 ? Math.min(Math.round((totalSimAll / safeTotal) * 100), 100) : 0;
        const priShare = totalPriAll > 0 ? Math.min(Math.round((totalPriAll / safeTotal) * 100), 100) : 0;
        const trgShare = totalTrgRp > 0 ? Math.min(Math.round((totalTrgRp / safeTotal) * 100), 100) : 0;
        const jagShare = totalJagAll > 0 ? Math.min(Math.round((totalJagAll / safeTotal) * 100), 100) : 0;

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
                totalSimAll,
                totalPriAll,
                totalTrgAll,
                totalTrgRp,
                totalJagAll,
                totalWealth,
                totalGold
            },
            shares: { cashShare, simShare, priShare, trgShare, jagShare },
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
    const newTrx = {
        id: Math.floor(100000 + Math.random() * 900000).toString(),
        date: dStr,
        desc: txData.desc,
        amount: txData.amount,
        type: txData.type,
        source: txData.source || 'pribadi',
        category: txData.category || 'makan',
        userId: txData.userId || active.id,
        userName: txData.userName || active.name
    };

    transactions.update(list => {
        const updated = [newTrx, ...list];
        saveToLocal(updated);
        return updated;
    });

    showToast(`Transaksi <b>"${newTrx.desc}"</b> berhasil dicatat!`, 'success', '💰');
    enqueueOfflineAction('add', newTrx);
    return newTrx;
}

export async function editTransaction(id, updatedFields) {
    let target = null;
    transactions.update(list => {
        const updated = list.map(t => {
            if (String(t.id) === String(id)) {
                target = { ...t, ...updatedFields };
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
    const pocketNames = {
        cash: 'Kas Tunai',
        pribadi: 'Tabungan Pribadi',
        simpanan: 'Simpanan Wajib',
        tring: 'Emas Tring',
        jago: 'Emas Jago'
    };

    const d = new Date();
    const dStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const active = get(activeUser);

    const newTransactions = [];
    if (fromPocket === 'cash') {
        newTransactions.push({
            id: Math.floor(100000 + Math.random() * 900000).toString(),
            date: dStr,
            desc: customDesc || `Pindah ke ${pocketNames[toPocket]}`,
            amount,
            type: toPocket,
            source: 'cash',
            category: 'investasi',
            userId: active.id,
            userName: active.name
        });
    } else if (toPocket === 'cash') {
        newTransactions.push({
            id: Math.floor(100000 + Math.random() * 900000).toString(),
            date: dStr,
            desc: customDesc || `Ambil dari ${pocketNames[fromPocket]}`,
            amount,
            type: 'withdraw',
            source: fromPocket,
            category: 'investasi',
            userId: active.id,
            userName: active.name
        });
    } else {
        newTransactions.push(
            {
                id: Math.floor(100000 + Math.random() * 900000).toString(),
                date: dStr,
                desc: customDesc ? `${customDesc} (Ambil dari ${pocketNames[fromPocket]})` : `Pindah dari ${pocketNames[fromPocket]}`,
                amount,
                type: 'withdraw',
                source: fromPocket,
                category: 'investasi',
                userId: active.id,
                userName: active.name
            },
            {
                id: Math.floor(100000 + Math.random() * 900000).toString(),
                date: dStr,
                desc: customDesc ? `${customDesc} (Setor ke ${pocketNames[toPocket]})` : `Alokasi ke ${pocketNames[toPocket]}`,
                amount,
                type: toPocket,
                source: 'cash',
                category: 'investasi',
                userId: active.id,
                userName: active.name
            }
        );
    }

    transactions.update(list => {
        const updated = [...newTransactions, ...list];
        saveToLocal(updated);
        return updated;
    });

    showToast(`Transfer dari <b>${pocketNames[fromPocket]}</b> ke <b>${pocketNames[toPocket]}</b> berhasil!`, 'success', '⇄');
    for (const trx of newTransactions) {
        enqueueOfflineAction('add', trx);
    }
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

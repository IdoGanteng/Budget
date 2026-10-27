import { writable, derived, get } from 'svelte/store';
import { activeUser } from './authStore.js';
import { addTransaction, getPocketMeta, formatRp } from './financeStore.js';
import { showToast } from './uiStore.js';
import confetti from 'canvas-confetti';

/**
 * @typedef {Object} RecurringTransaction
 * @property {string} id - Unique identifier (e.g., 'rec_1678901234')
 * @property {string} title - Keterangan/Nama tagihan rutin (e.g., 'Langganan Netflix')
 * @property {number} amount - Nominal tagihan dalam Rupiah
 * @property {string} category - Kategori pengeluaran (e.g., 'tagihan', 'hiburan')
 * @property {string} sourcePocketId - Kantong sumber dana pembayaran (e.g., 'cash', 'tabungan')
 * @property {'bulanan'|'mingguan'} frequency - Frekuensi perulangan
 * @property {number} dueDay - Tanggal jatuh tempo (1-31 untuk bulanan, 1-7 untuk mingguan)
 * @property {string} userProfile - ID Pengguna pemilik (e.g., 'user_rebel')
 * @property {boolean} autoPost - Apakah otomatis dibukukan ke transaksi saat jatuh tempo
 * @property {boolean} [isActive] - Status aktif/jeda
 * @property {string} [notes] - Catatan tambahan
 * @property {string} [lastExecutedPeriod] - Periode terakhir dieksekusi (e.g. '10/2026')
 * @property {number} [createdAt] - Timestamp pembuatan
 */

// Initial mock data to ensure immediate readiness and component testability
export const DEFAULT_RECURRING_TRANSACTIONS = [
    {
        id: 'rec_listrik_pln',
        title: 'Tagihan Listrik PLN',
        amount: 450000,
        category: 'tagihan',
        sourcePocketId: 'cash',
        frequency: 'bulanan',
        dueDay: 27, // Jatuh tempo hari ini untuk pengujian langsung
        userProfile: 'user_rebel',
        autoPost: true,
        isActive: true,
        notes: 'Pascabayar PLN Rumah',
        lastExecutedPeriod: ''
    },
    {
        id: 'rec_spotify_premium',
        title: 'Spotify Family Plan',
        amount: 86900,
        category: 'hiburan',
        sourcePocketId: 'tabungan',
        frequency: 'bulanan',
        dueDay: 28, // H-1 (Besok)
        userProfile: 'user_rebel',
        autoPost: true,
        isActive: true,
        notes: 'Langganan Musik Bulanan',
        lastExecutedPeriod: ''
    },
    {
        id: 'rec_wifi_indihome',
        title: 'WiFi & Internet Indihome',
        amount: 375000,
        category: 'tagihan',
        sourcePocketId: 'cash',
        frequency: 'bulanan',
        dueDay: 30, // H-3
        userProfile: 'user_rebel',
        autoPost: false,
        isActive: true,
        notes: 'Internet Rumah 50 Mbps',
        lastExecutedPeriod: ''
    },
    {
        id: 'rec_iuran_lingkungan',
        title: 'Iuran Kebersihan & Keamanan',
        amount: 150000,
        category: 'tagihan',
        sourcePocketId: 'cash',
        frequency: 'bulanan',
        dueDay: 1, // Awal bulan depan
        userProfile: 'user_rebel',
        autoPost: false,
        isActive: true,
        notes: 'Kas Lingkungan RT/RW',
        lastExecutedPeriod: ''
    },
    {
        id: 'rec_belanja_mingguan',
        title: 'Belanja Sayur & Pasar Mingguan',
        amount: 300000,
        category: 'makan',
        sourcePocketId: 'cash',
        frequency: 'mingguan',
        dueDay: 6, // Hari Sabtu
        userProfile: 'user_rebel',
        autoPost: false,
        isActive: true,
        notes: 'Kebutuhan Dapur',
        lastExecutedPeriod: ''
    }
];

export const ARK_RECURRING_INIT_KEY = 'ark_recurring_initialized';
export const ARK_DELETED_RECURRING_KEY = 'ark_deleted_recurring_ids';

/**
 * Mengambil daftar ID tagihan yang telah dihapus permanen oleh pengguna
 * @returns {string[]}
 */
export function getDeletedRecurringIds() {
    if (typeof localStorage === 'undefined') return [];
    try {
        const raw = localStorage.getItem(ARK_DELETED_RECURRING_KEY);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String);
        }
    } catch (e) {
        console.warn('Error reading deleted recurring ids:', e);
    }
    return [];
}

/**
 * Menandai ID tagihan ke blacklist/tombstone agar tidak pernah dimunculkan kembali
 * @param {string} id
 */
export function markRecurringAsDeleted(id) {
    if (!id || typeof localStorage === 'undefined') return;
    try {
        const stringId = String(id);
        const deletedIds = getDeletedRecurringIds();
        if (!deletedIds.includes(stringId)) {
            deletedIds.push(stringId);
            localStorage.setItem(ARK_DELETED_RECURRING_KEY, JSON.stringify(deletedIds));
        }

        // Sapu bersih ID ini dari semua key penyimpanan lokal
        const keysToClean = new Set(['app_recurring_default']);
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('app_recurring_')) {
                keysToClean.add(k);
            }
        }
        for (const k of keysToClean) {
            const raw = localStorage.getItem(k);
            if (raw) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        const cleaned = parsed.filter(item => item && String(item.id) !== stringId);
                        localStorage.setItem(k, JSON.stringify(cleaned));
                    }
                } catch (e) {}
            }
        }
    } catch (e) {
        console.error('Error in markRecurringAsDeleted:', e);
    }
}

export function getRecurringStorageKey() {
    const u = get(activeUser);
    return u ? `app_recurring_${u.id}` : 'app_recurring_default';
}

export function loadRecurringFromLocal() {
    const deletedIds = getDeletedRecurringIds();

    if (typeof localStorage === 'undefined') {
        return DEFAULT_RECURRING_TRANSACTIONS.filter(b => !deletedIds.includes(String(b.id)));
    }

    try {
        const key = getRecurringStorageKey();
        const hasSpecificKey = localStorage.getItem(key) !== null;
        const hasDefaultKey = localStorage.getItem('app_recurring_default') !== null;
        const isInitialized = localStorage.getItem(ARK_RECURRING_INIT_KEY) === 'true';

        // Jika sudah pernah diinisialisasi atau sudah ada data tersimpan di localStorage (meskipun isinya []):
        // JANGAN PERNAH fallback ke DEFAULT_RECURRING_TRANSACTIONS!
        if (hasSpecificKey || hasDefaultKey || isInitialized) {
            const raw = localStorage.getItem(key) || localStorage.getItem('app_recurring_default');
            if (raw !== null && raw !== undefined) {
                try {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) {
                        // Selalu filter keluar item yang ada di daftar deletedIds
                        return parsed.filter(item => item && item.id && !deletedIds.includes(String(item.id)));
                    }
                } catch (e) {
                    console.warn('Error parsing recurring JSON:', e);
                }
            }
            // Jika null atau parsing gagal tapi sudah berstatus diinisialisasi, kembalikan array kosong []
            return [];
        }

        // Inisialisasi perdana saat pertama kali aplikasi dijalankan (belum ada flag & belum ada key)
        localStorage.setItem(ARK_RECURRING_INIT_KEY, 'true');
        const initial = DEFAULT_RECURRING_TRANSACTIONS.filter(item => !deletedIds.includes(String(item.id)));
        const jsonStr = JSON.stringify(initial);
        localStorage.setItem(key, jsonStr);
        localStorage.setItem('app_recurring_default', jsonStr);
        const u = get(activeUser);
        if (u && u.id) {
            localStorage.setItem(`app_recurring_${u.id}`, jsonStr);
        }
        return initial;
    } catch (e) {
        console.error('Error loadRecurringFromLocal:', e);
        return [];
    }
}

export const recurringList = writable(loadRecurringFromLocal());

export function saveRecurring(list) {
    const deletedIds = getDeletedRecurringIds();
    const safeList = Array.isArray(list) ? list : [];
    // Pastikan tidak ada item yang ada di deletedIds
    const cleanList = safeList.filter(item => item && item.id && !deletedIds.includes(String(item.id)));

    recurringList.set(cleanList);

    if (typeof localStorage !== 'undefined') {
        try {
            const key = getRecurringStorageKey();
            const jsonStr = JSON.stringify(cleanList);
            localStorage.setItem(ARK_RECURRING_INIT_KEY, 'true');
            localStorage.setItem(key, jsonStr);
            localStorage.setItem('app_recurring_default', jsonStr);

            const u = get(activeUser);
            if (u && u.id) {
                localStorage.setItem(`app_recurring_${u.id}`, jsonStr);
            }
        } catch (e) {
            console.error('Failed to save recurring transactions to localStorage:', e);
        }
    }
}

/**
 * Menghitung selisih hari menuju tanggal jatuh tempo terdekat
 * @param {RecurringTransaction} bill
 * @returns {{ daysLeft: number, isToday: boolean, isUpcoming: boolean, nextDueDate: Date, dueDateFormatted: string, countdownLabel: string }}
 */
export function getCountdownInfo(bill) {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDate = now.getDate();
    const todayDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1=Senin ... 7=Minggu

    let targetDate;

    if (bill.frequency === 'mingguan') {
        const targetDOW = Number(bill.dueDay) || 1;
        let diffDays = targetDOW - todayDayOfWeek;
        if (diffDays < 0) diffDays += 7;
        targetDate = new Date(todayYear, todayMonth, todayDate + diffDays);
    } else {
        // Frekuensi Bulanan
        const targetDay = Math.min(31, Math.max(1, Number(bill.dueDay) || 1));
        const maxDaysThisMonth = new Date(todayYear, todayMonth + 1, 0).getDate();
        const clampedDayThisMonth = Math.min(targetDay, maxDaysThisMonth);

        if (clampedDayThisMonth >= todayDate) {
            targetDate = new Date(todayYear, todayMonth, clampedDayThisMonth);
        } else {
            // Jatuh tempo di bulan berikutnya
            const nextMonth = todayMonth + 1;
            const maxDaysNextMonth = new Date(todayYear, nextMonth + 1, 0).getDate();
            const clampedDayNextMonth = Math.min(targetDay, maxDaysNextMonth);
            targetDate = new Date(todayYear, nextMonth, clampedDayNextMonth);
        }
    }

    // Hitung selisih hari bulat
    const oneDayMs = 24 * 60 * 60 * 1000;
    const todayMidnight = new Date(todayYear, todayMonth, todayDate).getTime();
    const targetMidnight = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    const daysLeft = Math.round((targetMidnight - todayMidnight) / oneDayMs);

    const isToday = daysLeft === 0;
    const isUpcoming = daysLeft >= 0 && daysLeft <= 7;

    const INDO_MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const dueDateFormatted = `${targetDate.getDate()} ${INDO_MONTHS_SHORT[targetDate.getMonth() + 1]} ${targetDate.getFullYear()}`;

    let countdownLabel = `${daysLeft} hari lagi`;
    if (isToday) countdownLabel = 'Hari Ini!';
    else if (daysLeft === 1) countdownLabel = 'Besok (H-1)';
    else if (daysLeft === 2) countdownLabel = '2 hari lagi (H-2)';

    return {
        daysLeft,
        isToday,
        isUpcoming,
        nextDueDate: targetDate,
        dueDateFormatted,
        countdownLabel
    };
}

/**
 * Derived store untuk tagihan terdekat dalam 7 hari ke depan
 */
export const upcomingBills = derived(
    [recurringList, activeUser],
    ([$list, $user]) => {
        const uId = $user ? $user.id : 'user_rebel';
        const currentPeriodKey = getCurrentPeriodKey();

        const enriched = ($list || [])
            .filter(b => b.isActive !== false)
            .map(b => {
                const countdown = getCountdownInfo(b);
                const isPaidThisPeriod = b.lastExecutedPeriod === currentPeriodKey;
                return {
                    ...b,
                    ...countdown,
                    isPaidThisPeriod
                };
            })
            .sort((a, b) => a.daysLeft - b.daysLeft);

        const dueIn7Days = enriched.filter(b => b.isUpcoming && !b.isPaidThisPeriod);
        const dueToday = enriched.filter(b => b.isToday && !b.isPaidThisPeriod);

        return {
            all: enriched,
            dueIn7Days,
            dueToday,
            totalDueNext7Days: dueIn7Days.reduce((sum, b) => sum + (Number(b.amount) || 0), 0)
        };
    }
);

export function getCurrentPeriodKey() {
    const now = new Date();
    return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

/**
 * Eksekusi pencatatan tagihan berulang ke transaksi kas riil
 * @param {RecurringTransaction} bill
 * @returns {Promise<boolean>}
 */
export async function executeRecurringTransaction(bill) {
    if (!bill) return false;

    const active = get(activeUser);
    const pMeta = getPocketMeta(bill.sourcePocketId);
    const currentPeriodKey = getCurrentPeriodKey();

    try {
        await addTransaction({
            desc: `${bill.title} (Rutin)`,
            amount: Number(bill.amount),
            type: 'expense',
            pocket: bill.sourcePocketId || 'cash',
            source: bill.sourcePocketId || 'cash',
            category: bill.category || 'tagihan',
            userId: bill.userProfile || (active ? active.id : 'user_rebel'),
            userName: active ? active.name : 'User'
        });

        // Tandai periode eksekusi agar tidak tercatat ganda di bulan ini
        recurringList.update(list => {
            const updated = list.map(item => {
                if (item.id === bill.id) {
                    return { ...item, lastExecutedPeriod: currentPeriodKey };
                }
                return item;
            });
            saveRecurring(updated);
            return updated;
        });

        try {
            confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}

        showToast(`Tagihan <b>"${bill.title}"</b> (${formatRp(bill.amount)}) berhasil dibukukan dari ${pMeta.name}!`, 'success', '⚡');
        return true;
    } catch (err) {
        console.error('Gagal membukukan tagihan:', err);
        showToast('Gagal memproses transaksi tagihan: ' + err.message, 'error', '❌');
        return false;
    }
}

/**
 * Tambah aturan tagihan rutin baru
 */
export function addRecurringRule(data) {
    const active = get(activeUser);
    const newRule = {
        id: 'rec_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        title: String(data.title || '').trim() || 'Tagihan Rutin',
        amount: Math.max(0, Number(data.amount) || 0),
        category: data.category || 'tagihan',
        sourcePocketId: data.sourcePocketId || 'cash',
        frequency: data.frequency || 'bulanan',
        dueDay: Math.min(31, Math.max(1, Number(data.dueDay) || 1)),
        userProfile: data.userProfile || (active ? active.id : 'user_rebel'),
        autoPost: Boolean(data.autoPost),
        isActive: true,
        notes: data.notes || '',
        lastExecutedPeriod: '',
        createdAt: Date.now()
    };

    recurringList.update(list => {
        const updated = [...list, newRule];
        saveRecurring(updated);
        return updated;
    });

    try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}
    showToast(`Jadwal tagihan <b>"${newRule.title}"</b> berhasil ditambahkan!`, 'success', '📅');
    return newRule;
}

/**
 * Update aturan tagihan rutin
 */
export function updateRecurringRule(id, updatedFields) {
    recurringList.update(list => {
        const updated = list.map(item => {
            if (item.id === id) {
                return { ...item, ...updatedFields };
            }
            return item;
        });
        saveRecurring(updated);
        return updated;
    });
    showToast('Jadwal tagihan berhasil diperbarui.', 'success', '✏️');
}

/**
 * Hapus aturan tagihan rutin secara instan dan sinkron
 * @param {string} id
 */
export function deleteRecurringRule(id) {
    if (!id) return;
    const stringId = String(id);

    // 1. Dapatkan info tagihan untuk notifikasi toast
    const currentList = get(recurringList) || [];
    const targetItem = currentList.find(item => item && String(item.id) === stringId);
    const itemTitle = targetItem ? targetItem.title : 'Tagihan';

    // 2. Tandai ke blacklist permanen (ark_deleted_recurring_ids) & bersihkan storage
    markRecurringAsDeleted(stringId);

    // 3. Filter keluar item dari state
    const updated = currentList.filter(item => item && String(item.id) !== stringId);

    // 4. Langsung simpan array terbaru ke localStorage secara sinkron
    saveRecurring(updated);

    // Pastikan langsung tersimpan di key aktif
    if (typeof localStorage !== 'undefined') {
        try {
            const key = getRecurringStorageKey();
            const jsonStr = JSON.stringify(updated);
            localStorage.setItem(key, jsonStr);
            localStorage.setItem('app_recurring_default', jsonStr);
            localStorage.setItem(ARK_RECURRING_INIT_KEY, 'true');
            const u = get(activeUser);
            if (u && u.id) {
                localStorage.setItem(`app_recurring_${u.id}`, jsonStr);
            }
        } catch (e) {}
    }

    // 5. Beri notifikasi toast penghapusan instan
    showToast(`Jadwal tagihan <b>"${itemTitle}"</b> telah dihapus.`, 'info', '🗑️');

    // 6. Dispatch event custom agar seluruh listener segera sinkron
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('recurring-bills-updated', {
            detail: { deletedId: stringId, remaining: updated.length }
        }));
    }
}

// Listener pergantian profil pengguna, login & update event
if (typeof window !== 'undefined') {
    window.addEventListener('active-user-changed', () => {
        recurringList.set(loadRecurringFromLocal());
    });
    window.addEventListener('app-logged-in', () => {
        recurringList.set(loadRecurringFromLocal());
    });
    window.addEventListener('recurring-bills-updated', () => {
        recurringList.set(loadRecurringFromLocal());
    });
}

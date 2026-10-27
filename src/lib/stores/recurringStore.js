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

function getRecurringStorageKey() {
    const u = get(activeUser);
    return u ? `app_recurring_${u.id}` : 'app_recurring_default';
}

export function loadRecurringFromLocal() {
    try {
        const key = getRecurringStorageKey();
        const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(key)) ||
                    (typeof localStorage !== 'undefined' && localStorage.getItem('app_recurring_default'));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return DEFAULT_RECURRING_TRANSACTIONS;
}

export const recurringList = writable(loadRecurringFromLocal());

export function saveRecurring(list) {
    recurringList.set(list);
    try {
        const key = getRecurringStorageKey();
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(list));
            localStorage.setItem('app_recurring_default', JSON.stringify(list));
        }
    } catch (e) {}
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
 * Hapus aturan tagihan rutin
 */
export function deleteRecurringRule(id) {
    recurringList.update(list => {
        const updated = list.filter(item => item.id !== id);
        saveRecurring(updated);
        return updated;
    });
    showToast('Jadwal tagihan telah dihapus.', 'info', '🗑️');
}

// Listener pergantian profil pengguna
if (typeof window !== 'undefined') {
    window.addEventListener('active-user-changed', () => {
        recurringList.set(loadRecurringFromLocal());
    });
    window.addEventListener('app-logged-in', () => {
        recurringList.set(loadRecurringFromLocal());
    });
}

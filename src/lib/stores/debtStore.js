import { writable, derived, get } from 'svelte/store';
import { activeUser } from './authStore.js';
import { addTransaction, getPocketMeta, formatRp } from './financeStore.js';
import { showToast } from './uiStore.js';
import confetti from 'canvas-confetti';

/**
 * @typedef {Object} DebtPayment
 * @property {string} id - Unique identifier payment
 * @property {string} paymentDate - Tanggal pembayaran ("DD/MM/YYYY")
 * @property {number} amount - Nominal yang dibayar
 * @property {string} pocketId - Kantong yang digunakan
 * @property {string} [notes] - Keterangan cicilan
 * @property {string} [linkedTransactionId] - ID transaksi di buku kas utama
 */

/**
 * @typedef {Object} DebtRecord
 * @property {string} id - Unique identifier (e.g. 'debt_167890')
 * @property {'debt'|'receivable'} type - 'debt' (Hutang Saya) | 'receivable' (Piutang Saya)
 * @property {string} personName - Nama orang atau entitas
 * @property {number} initialAmount - Jumlah awal pinjaman
 * @property {number} remainingAmount - Sisa saldo yang belum terbayar
 * @property {string} startDate - Tanggal mulai pinjam ("DD/MM/YYYY")
 * @property {string} dueDate - Estimasi tanggal jatuh tempo ("DD/MM/YYYY")
 * @property {string} pocketId - Kantong preferensi / asal dana
 * @property {string} notes - Catatan tambahan
 * @property {'active'|'settled'} status - Status pinjaman
 * @property {string} userProfile - ID Pengguna pemilik
 * @property {number} createdAt - Timestamp pembuatan
 * @property {DebtPayment[]} payments - Histori cicilan pembayaran
 */

export const DEFAULT_DEBTS = [
    {
        id: 'debt_budi_usaha',
        type: 'receivable',
        personName: 'Budi Santoso (Modal Sablon)',
        initialAmount: 3000000,
        remainingAmount: 1500000,
        startDate: '10/10/2026',
        dueDate: '15/11/2026',
        pocketId: 'cash',
        notes: 'Pinjaman modal usaha sablon kaos, janji lunas pertengahan November',
        status: 'active',
        userProfile: 'user_rebel',
        createdAt: 1728556800000,
        payments: [
            {
                id: 'pmt_budi_01',
                paymentDate: '20/10/2026',
                amount: 1500000,
                pocketId: 'cash',
                notes: 'Cicilan ke-1 tunai via transfer',
                linkedTransactionId: 'tx_budi_01'
            }
        ]
    },
    {
        id: 'debt_gadget_bca',
        type: 'debt',
        personName: 'Cicilan Gadget BCA 0%',
        initialAmount: 4800000,
        remainingAmount: 2400000,
        startDate: '01/06/2026',
        dueDate: '05/11/2026',
        pocketId: 'cash',
        notes: 'Cicilan 0% 12 bulan (tersisa 6 bulan lagi)',
        status: 'active',
        userProfile: 'user_rebel',
        createdAt: 1717200000000,
        payments: [
            {
                id: 'pmt_gadget_01',
                paymentDate: '05/09/2026',
                amount: 800000,
                pocketId: 'cash',
                notes: 'Cicilan bulan September',
                linkedTransactionId: 'tx_gadget_01'
            },
            {
                id: 'pmt_gadget_02',
                paymentDate: '05/10/2026',
                amount: 800000,
                pocketId: 'cash',
                notes: 'Cicilan bulan Oktober',
                linkedTransactionId: 'tx_gadget_02'
            }
        ]
    }
];

function getDebtsStorageKey() {
    const u = get(activeUser);
    return u ? `app_debts_${u.id}` : 'app_debts_default';
}

export function loadDebtsFromLocal() {
    try {
        const key = getDebtsStorageKey();
        const raw = (typeof localStorage !== 'undefined' && localStorage.getItem(key)) ||
                    (typeof localStorage !== 'undefined' && localStorage.getItem('app_debts_default'));
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch (e) {}
    return DEFAULT_DEBTS;
}

export const debtsList = writable(loadDebtsFromLocal());

export function saveDebts(list) {
    debtsList.set(list);
    try {
        const key = getDebtsStorageKey();
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem(key, JSON.stringify(list));
            localStorage.setItem('app_debts_default', JSON.stringify(list));
        }
    } catch (e) {}
}

/**
 * Derived store ringkasan metrik Hutang & Piutang
 */
export const debtSummary = derived(
    [debtsList, activeUser],
    ([$list, $user]) => {
        let totalReceivable = 0; // Piutang Saya (Uang dipinjamkan)
        let totalDebt = 0;       // Hutang Saya (Pinjaman yang harus dibayar)
        let totalInitialReceivable = 0;
        let totalInitialDebt = 0;

        const activeReceivables = [];
        const activeDebts = [];
        const settledList = [];

        ($list || []).forEach(item => {
            const rem = Math.max(0, Number(item.remainingAmount) || 0);
            const init = Math.max(0, Number(item.initialAmount) || 0);
            const isSettled = item.status === 'settled' || rem === 0;

            const paidAmount = init - rem;
            const progressPct = init > 0 ? Math.min(100, Math.round((paidAmount / init) * 100)) : 100;

            const enriched = {
                ...item,
                paidAmount,
                progressPct
            };

            if (isSettled) {
                settledList.push(enriched);
            } else if (item.type === 'receivable') {
                totalReceivable += rem;
                totalInitialReceivable += init;
                activeReceivables.push(enriched);
            } else {
                totalDebt += rem;
                totalInitialDebt += init;
                activeDebts.push(enriched);
            }
        });

        // Posisi Bersih: Piutang (Hak Kita) - Hutang (Kewajiban Kita)
        const netPosition = totalReceivable - totalDebt;

        return {
            totalReceivable,
            totalDebt,
            totalInitialReceivable,
            totalInitialDebt,
            netPosition,
            activeReceivables,
            activeDebts,
            settledList,
            totalActiveCount: activeReceivables.length + activeDebts.length
        };
    }
);

/**
 * Tambah catatan Hutang atau Piutang baru
 */
export async function addDebtRecord(data, affectCurrentBalance = false) {
    const active = get(activeUser);
    const initAmt = Math.max(0, Number(data.initialAmount) || 0);
    const targetPocket = data.pocketId || 'cash';
    const pMeta = getPocketMeta(targetPocket);

    const newRecord = {
        id: 'debt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        type: data.type || 'receivable', // 'debt' | 'receivable'
        personName: String(data.personName || '').trim() || (data.type === 'debt' ? 'Kreditur Baru' : 'Debitur Baru'),
        initialAmount: initAmt,
        remainingAmount: data.remainingAmount !== undefined ? Number(data.remainingAmount) : initAmt,
        startDate: data.startDate || new Date().toISOString().split('T')[0],
        dueDate: data.dueDate || '',
        pocketId: targetPocket,
        notes: data.notes || '',
        status: 'active',
        userProfile: data.userProfile || (active ? active.id : 'user_rebel'),
        createdAt: Date.now(),
        payments: []
    };

    // Opsi: Otomatis sesuaikan saldo kantong saat pencatatan awal
    if (affectCurrentBalance && initAmt > 0) {
        if (newRecord.type === 'debt') {
            // Hutang Saya: Uang pinjaman masuk ke kantong (Income)
            await addTransaction({
                desc: `Penerimaan Pinjaman: ${newRecord.personName}`,
                amount: initAmt,
                type: 'income',
                pocket: targetPocket,
                source: targetPocket,
                category: 'lainnya',
                userId: newRecord.userProfile
            });
        } else {
            // Piutang Saya: Uang kas keluar dipinjamkan ke orang (Expense)
            await addTransaction({
                desc: `Pemberian Pinjaman ke: ${newRecord.personName}`,
                amount: initAmt,
                type: 'expense',
                pocket: targetPocket,
                source: targetPocket,
                category: 'lainnya',
                userId: newRecord.userProfile
            });
        }
    }

    debtsList.update(list => {
        const updated = [newRecord, ...list];
        saveDebts(updated);
        return updated;
    });

    try {
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
    } catch (e) {}

    const typeLabel = newRecord.type === 'debt' ? 'Hutang Saya' : 'Piutang Saya';
    showToast(`Catatan <b>${typeLabel}</b> ("${newRecord.personName}") berhasil disimpan!`, 'success', '🤝');
    return newRecord;
}

/**
 * Pembayaran sebagian atau pelunasan hutang / piutang
 * Otomatis membukukan transaksi penyesuaian saldo di kantong terkait
 */
export async function recordDebtPayment(debtId, paymentData) {
    const amt = Math.max(0, Number(paymentData.amount) || 0);
    if (!amt || isNaN(amt) || amt <= 0) {
        showToast('Nominal pembayaran tidak valid!', 'warning', '⚠️');
        return false;
    }

    const currentList = get(debtsList) || [];
    const targetDebt = currentList.find(d => d.id === debtId);
    if (!targetDebt) {
        showToast('Catatan hutang/piutang tidak ditemukan!', 'error', '❌');
        return false;
    }

    const active = get(activeUser);
    const pocket = paymentData.pocketId || targetDebt.pocketId || 'cash';
    const pMeta = getPocketMeta(pocket);
    const d = new Date();
    const dStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const isLunas = amt >= targetDebt.remainingAmount;

    let txDesc = '';
    let txType = 'expense';

    if (targetDebt.type === 'debt') {
        // Membayar Hutang Saya: Uang kas kita berkurang (Expense)
        txType = 'expense';
        txDesc = isLunas
            ? `Pelunasan Hutang: ${targetDebt.personName}`
            : `Bayar Cicilan Hutang: ${targetDebt.personName}`;
    } else {
        // Menerima Pembayaran Piutang: Uang kas kita bertambah (Income)
        txType = 'income';
        txDesc = isLunas
            ? `Pelunasan Piutang dari: ${targetDebt.personName}`
            : `Terima Cicilan Piutang: ${targetDebt.personName}`;
    }

    // 1. Buat transaksi penyesuaian saldo riil di kantong terpilih
    const newTx = await addTransaction({
        desc: txDesc,
        amount: amt,
        type: txType,
        pocket: pocket,
        source: pocket,
        category: targetDebt.type === 'debt' ? 'tagihan' : 'lainnya',
        userId: targetDebt.userProfile || (active ? active.id : 'user_rebel')
    });

    // 2. Buat objek payment record
    const newPayment = {
        id: 'pmt_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
        paymentDate: paymentData.paymentDate || dStr,
        amount: amt,
        pocketId: pocket,
        notes: paymentData.notes || (isLunas ? 'Pelunasan Lunas' : 'Cicilan sebagian'),
        linkedTransactionId: newTx ? newTx.id : ''
    };

    // 3. Update saldo sisa & status hutang/piutang
    debtsList.update(list => {
        const updated = list.map(item => {
            if (item.id === debtId) {
                const newRemaining = Math.max(0, item.remainingAmount - amt);
                const nextStatus = newRemaining === 0 ? 'settled' : 'active';
                return {
                    ...item,
                    remainingAmount: newRemaining,
                    status: nextStatus,
                    payments: [newPayment, ...(item.payments || [])]
                };
            }
            return item;
        });
        saveDebts(updated);
        return updated;
    });

    try {
        confetti({ particleCount: isLunas ? 90 : 50, spread: isLunas ? 80 : 60, origin: { y: 0.6 } });
    } catch (e) {}

    if (isLunas) {
        showToast(`🎉 <b>LUNAS!</b> Catatan "${targetDebt.personName}" telah diselesaikan penuh!`, 'success', '🎊');
    } else {
        showToast(`Pembayaran <b>${formatRp(amt)}</b> berhasil dicatat di kantong ${pMeta.name}!`, 'success', '💸');
    }

    return true;
}

/**
 * Hapus catatan hutang/piutang
 */
export function deleteDebtRecord(id) {
    debtsList.update(list => {
        const updated = list.filter(d => d.id !== id);
        saveDebts(updated);
        return updated;
    });
    showToast('Catatan telah dihapus.', 'info', '🗑️');
}

// User-change & App-init listeners
if (typeof window !== 'undefined') {
    window.addEventListener('active-user-changed', () => {
        debtsList.set(loadDebtsFromLocal());
    });
    window.addEventListener('app-logged-in', () => {
        debtsList.set(loadDebtsFromLocal());
    });
}

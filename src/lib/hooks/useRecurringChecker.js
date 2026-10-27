import { get } from 'svelte/store';
import {
    recurringList,
    getCountdownInfo,
    getCurrentPeriodKey,
    executeRecurringTransaction
} from '../stores/recurringStore.js';
import { getPocketMeta, formatRp } from '../stores/financeStore.js';
import { showConfirmModal, showToast } from '../stores/uiStore.js';

let isChecking = false;

/**
 * Hook / Checker untuk mendeteksi tagihan berulang yang jatuh tempo hari ini
 * dengan setting autoPost: true saat aplikasi dibuka.
 */
export function useRecurringChecker() {
    if (typeof window === 'undefined' || isChecking) return;
    
    // Cegah prompt berulang dalam satu sesi tab browser yang sama
    const sessionCheckedKey = `recurring_prompted_${new Date().toISOString().split('T')[0]}`;
    if (sessionStorage.getItem(sessionCheckedKey)) {
        return;
    }

    isChecking = true;

    // Beri jeda kecil agar UI dashboard telah terpasang sempurna
    setTimeout(() => {
        try {
            const list = get(recurringList) || [];
            const currentPeriodKey = getCurrentPeriodKey();

            // Filter tagihan yang jatuh tempo hari ini, aktif, autoPost: true, dan belum dibukukan bulan ini
            const eligibleBills = list.filter(bill => {
                if (bill.isActive === false || !bill.autoPost) return false;
                if (bill.lastExecutedPeriod === currentPeriodKey) return false;
                const countdown = getCountdownInfo(bill);
                return countdown.isToday;
            });

            if (eligibleBills.length === 0) {
                isChecking = false;
                return;
            }

            // Tandai bahwa sesi hari ini sudah dicek
            sessionStorage.setItem(sessionCheckedKey, 'true');

            // Tangani tagihan pertama dengan prompt konfirmasi elegan
            promptRecurringBill(eligibleBills, 0);
        } catch (err) {
            console.warn('Notice on recurring checker:', err);
        } finally {
            isChecking = false;
        }
    }, 1200);
}

function promptRecurringBill(bills, index) {
    if (!bills || index >= bills.length) return;

    const bill = bills[index];
    const pMeta = getPocketMeta(bill.sourcePocketId);

    showConfirmModal({
        icon: '⚡',
        title: 'Posting Otomatis Tagihan Rutin',
        desc: `Tagihan <b>"${bill.title}"</b> sebesar <b>${formatRp(bill.amount)}</b> jatuh tempo hari ini dan diset posting otomatis dari kantong <b>${pMeta.name}</b>. Masukkan ke transaksi kas sekarang?`,
        confirmText: 'Ya, Bukukan Sekarang',
        cancelText: 'Nanti Saja',
        isDanger: false,
        onConfirm: async () => {
            await executeRecurringTransaction(bill);
            // Lanjut ke tagihan berikutnya jika ada lebih dari 1 tagihan jatuh tempo hari ini
            if (index + 1 < bills.length) {
                setTimeout(() => promptRecurringBill(bills, index + 1), 600);
            }
        }
    });
}

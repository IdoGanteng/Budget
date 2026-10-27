<script>
    import { isDebtPaymentModalOpen, selectedDebtForPayment, closeDebtPaymentModal, showToast } from '../stores/uiStore.js';
    import { recordDebtPayment, debtsList } from '../stores/debtStore.js';
    import { pocketsList, getPocketMeta, formatRp } from '../stores/financeStore.js';

    let activeSubTab = 'pay'; // 'pay' | 'history'
    let paymentAmountStr = '';
    let selectedPocket = 'cash';
    let paymentDate = new Date().toISOString().split('T')[0];
    let paymentNotes = '';

    $: debt = $selectedDebtForPayment;
    $: pockets = $pocketsList || [];

    // Sync live debt from store in case payments updated
    $: liveDebt = debt ? ($debtsList || []).find(d => d.id === debt.id) || debt : null;
    $: remaining = liveDebt ? Math.max(0, Number(liveDebt.remainingAmount) || 0) : 0;
    $: payments = (liveDebt && liveDebt.payments) || [];

    function handleAmountInput(e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        paymentAmountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function setFullPayment() {
        if (remaining > 0) {
            paymentAmountStr = new Intl.NumberFormat('id-ID').format(remaining);
        }
    }

    async function handlePaymentSubmit(e) {
        if (e) e.preventDefault();
        if (!liveDebt) return;

        const amt = parseInt(paymentAmountStr.replace(/[^0-9]/g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Masukkan nominal pembayaran yang valid!', 'warning', '⚠️');
            return;
        }

        // Format tanggal ke DD/MM/YYYY
        let formattedDate = paymentDate;
        if (paymentDate.includes('-')) {
            const parts = paymentDate.split('-');
            if (parts.length === 3) {
                formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
        }

        const success = await recordDebtPayment(liveDebt.id, {
            amount: amt,
            pocketId: selectedPocket,
            paymentDate: formattedDate,
            notes: paymentNotes
        });

        if (success) {
            paymentAmountStr = '';
            paymentNotes = '';
            activeSubTab = 'history';
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeDebtPaymentModal();
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isDebtPaymentModalOpen) closeDebtPaymentModal(); }} />

{#if $isDebtPaymentModalOpen && liveDebt}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-pmt-modal-title"
    >
        <div class="modal-box debt-pmt-modal-box" role="document">
            <!-- HEADER -->
            <div class="modal-top-header">
                <div class="header-icon-wrap" class:is-debt={liveDebt.type === 'debt'}>
                    {liveDebt.type === 'debt' ? '💳' : '🤝'}
                </div>
                <div class="header-titles">
                    <h3 id="debt-pmt-modal-title" class="pmt-modal-title">
                        {liveDebt.type === 'debt' ? 'Bayar Hutang' : 'Terima Piutang'}
                    </h3>
                    <p class="pmt-modal-sub">{liveDebt.personName}</p>
                </div>
                <button
                    type="button"
                    class="modal-close-icon-btn"
                    on:click={closeDebtPaymentModal}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <!-- OVERVIEW SUMMARY CARD -->
            <div class="debt-balance-overview">
                <div class="overview-col">
                    <span class="ov-caption">Jumlah Awal</span>
                    <strong class="ov-val font-mono">{formatRp(liveDebt.initialAmount)}</strong>
                </div>
                <div class="ov-divider"></div>
                <div class="overview-col">
                    <span class="ov-caption">Sisa Belum Dibayar</span>
                    <strong class="ov-val font-mono" class:text-exp={liveDebt.type === 'debt'} class:text-inc={liveDebt.type === 'receivable'}>
                        {formatRp(remaining)}
                    </strong>
                </div>
                <div class="ov-divider"></div>
                <div class="overview-col">
                    <span class="ov-caption">Status</span>
                    <span class="ov-badge" class:badge-settled={liveDebt.status === 'settled' || remaining === 0}>
                        {liveDebt.status === 'settled' || remaining === 0 ? '✓ Lunas' : 'Belum Lunas'}
                    </span>
                </div>
            </div>

            <!-- SUB-TABS -->
            <div class="pmt-tab-strip">
                <button
                    type="button"
                    class="pmt-tab-btn"
                    class:active={activeSubTab === 'pay'}
                    on:click={() => activeSubTab = 'pay'}
                    disabled={remaining === 0}
                >
                    <span>💸</span> Catat Pembayaran
                </button>
                <button
                    type="button"
                    class="pmt-tab-btn"
                    class:active={activeSubTab === 'history'}
                    on:click={() => activeSubTab = 'history'}
                >
                    <span>📜</span> Riwayat Cicilan ({payments.length})
                </button>
            </div>

            <!-- TAB 1: FORM PEMBAYARAN -->
            {#if activeSubTab === 'pay'}
                {#if remaining === 0}
                    <div class="settled-notice-box">
                        <span class="notice-icon">🎉</span>
                        <div class="notice-text">
                            <strong>Catatan Ini Sudah Lunas!</strong>
                            <p>Seluruh saldo pinjaman telah selesai dibayarkan.</p>
                        </div>
                    </div>
                {:else}
                    <form class="pmt-form-layout" on:submit={handlePaymentSubmit}>
                        <div class="form-group">
                            <label class="form-label" for="pmt-amount">
                                Nominal Pembayaran (IDR) <span class="req">*</span>
                            </label>
                            <div class="input-with-action">
                                <input
                                    id="pmt-amount"
                                    type="text"
                                    inputmode="numeric"
                                    class="form-input font-mono"
                                    value={paymentAmountStr}
                                    on:input={handleAmountInput}
                                    placeholder="Rp 0"
                                    required
                                />
                                <button type="button" class="btn-full-pay" on:click={setFullPayment}>
                                    Lunasi Penuh
                                </button>
                            </div>
                        </div>

                        <div class="form-row-2">
                            <div class="form-group">
                                <label class="form-label" for="pmt-pocket">
                                    {liveDebt.type === 'debt' ? 'Kantong Sumber Dana' : 'Kantong Penerima Dana'}
                                </label>
                                <select id="pmt-pocket" class="form-select" bind:value={selectedPocket}>
                                    {#each pockets as p}
                                        <option value={p.id}>{p.icon} {p.name}</option>
                                    {/each}
                                </select>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="pmt-date">
                                    Tanggal Bayar
                                </label>
                                <input
                                    id="pmt-date"
                                    type="date"
                                    class="form-input"
                                    bind:value={paymentDate}
                                    required
                                />
                            </div>
                        </div>

                        <div class="form-group">
                            <label class="form-label" for="pmt-notes">
                                Catatan / Keterangan Cicilan
                            </label>
                            <input
                                id="pmt-notes"
                                type="text"
                                class="form-input"
                                bind:value={paymentNotes}
                                placeholder="Contoh: Cicilan ke-2 transfer BCA"
                            />
                        </div>

                        <div class="notice-note">
                            💡 Saldo pada kantong <b>{getPocketMeta(selectedPocket).name}</b> akan otomatis {liveDebt.type === 'debt' ? 'berkurang (Pengeluaran)' : 'bertambah (Pemasukan)'} sebesar nominal yang dibayarkan.
                        </div>

                        <div class="form-actions-row">
                            <button type="button" class="btn-secondary" on:click={closeDebtPaymentModal}>
                                Batal
                            </button>
                            <button type="submit" class="btn-primary">
                                💸 Konfirmasi Pembayaran
                            </button>
                        </div>
                    </form>
                {/if}

            <!-- TAB 2: RIWAYAT CICILAN PEMBAYARAN -->
            {:else}
                <div class="history-scroll-panel">
                    {#if payments.length === 0}
                        <div class="empty-history-box">
                            <span class="empty-icon">📜</span>
                            <p class="empty-caption">Belum ada riwayat pembayaran yang tercatat.</p>
                        </div>
                    {:else}
                        <div class="history-timeline">
                            {#each payments as pmt, idx}
                                {@const pocketMeta = getPocketMeta(pmt.pocketId)}
                                <div class="timeline-item">
                                    <div class="tl-bullet">#{payments.length - idx}</div>
                                    <div class="tl-content-card">
                                        <div class="tl-header">
                                            <span class="tl-date">{pmt.paymentDate}</span>
                                            <span class="tl-amount font-mono" class:text-exp={liveDebt.type === 'debt'} class:text-inc={liveDebt.type === 'receivable'}>
                                                {formatRp(pmt.amount)}
                                            </span>
                                        </div>
                                        <div class="tl-footer">
                                            <span class="tl-pocket">
                                                <span>{pocketMeta.icon || '👛'}</span> {pocketMeta.name}
                                            </span>
                                            {#if pmt.notes}
                                                <span class="tl-notes">{pmt.notes}</span>
                                            {/if}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    {/if}
                </div>

                <div class="history-footer">
                    <button type="button" class="btn-secondary w-full" on:click={closeDebtPaymentModal}>
                        Tutup
                    </button>
                </div>
            {/if}
        </div>
    </div>
{/if}

<style>
    .debt-pmt-modal-box {
        max-width: 500px;
        width: 100%;
        text-align: left;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
        border-radius: 24px;
    }

    .modal-top-header {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
    }

    .header-icon-wrap {
        font-size: 26px;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: rgba(16, 185, 129, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .header-icon-wrap.is-debt {
        background: rgba(239, 68, 68, 0.15);
    }

    .header-titles {
        flex: 1;
    }

    .pmt-modal-title {
        font-size: 17px;
        font-weight: 800;
        margin: 0 0 2px 0;
        color: var(--text-dark);
    }

    .pmt-modal-sub {
        font-size: 13px;
        color: var(--text-gray);
        margin: 0;
    }

    .modal-close-icon-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 8px;
    }

    /* DEBT OVERVIEW CARD */
    .debt-balance-overview {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 10px 14px;
        margin-bottom: 14px;
    }

    .overview-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .ov-caption {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
    }

    .ov-val {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--text-dark);
    }

    .ov-divider {
        width: 1px;
        height: 28px;
        background: var(--border-color);
    }

    .ov-badge {
        font-size: 10.5px;
        font-weight: 800;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
        padding: 2px 7px;
        border-radius: 100px;
        width: fit-content;
    }

    .ov-badge.badge-settled {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
    }

    /* TABS */
    .pmt-tab-strip {
        display: flex;
        gap: 6px;
        background: var(--input-bg, #0f172a);
        padding: 3px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
        margin-bottom: 14px;
    }

    .pmt-tab-btn {
        flex: 1;
        background: transparent;
        border: none;
        color: var(--text-gray);
        font-size: 11.5px;
        font-weight: 700;
        padding: 7px 10px;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        transition: all 0.2s;
    }

    .pmt-tab-btn.active {
        background: var(--primary);
        color: #ffffff;
    }

    .pmt-tab-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    /* FORM */
    .pmt-form-layout {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .form-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .form-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--text-gray);
    }

    .req {
        color: #ef4444;
    }

    .input-with-action {
        display: flex;
        gap: 8px;
    }

    .form-input,
    .form-select {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 13px;
        color: var(--text-dark);
        outline: none;
        width: 100%;
        transition: border-color 0.2s;
    }

    .form-input:focus,
    .form-select:focus {
        border-color: var(--primary);
    }

    .btn-full-pay {
        background: rgba(37, 99, 235, 0.15);
        border: 1px solid var(--primary);
        color: var(--primary);
        font-size: 11px;
        font-weight: 700;
        padding: 0 12px;
        border-radius: 10px;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.2s;
    }

    .btn-full-pay:hover {
        background: var(--primary);
        color: #ffffff;
    }

    .form-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .notice-note {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
        padding: 8px 10px;
        border-left: 3px solid var(--primary);
    }

    .form-actions-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
    }

    /* HISTORY TIMELINE */
    .history-scroll-panel {
        max-height: 44vh;
        overflow-y: auto;
        padding-right: 4px;
        margin-bottom: 12px;
    }

    .empty-history-box {
        text-align: center;
        padding: 32px 16px;
    }

    .empty-icon {
        font-size: 28px;
    }

    .empty-caption {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 6px;
    }

    .history-timeline {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .timeline-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
    }

    .tl-bullet {
        font-size: 10.5px;
        font-weight: 800;
        color: var(--text-muted);
        background: rgba(255, 255, 255, 0.07);
        border-radius: 6px;
        padding: 2px 6px;
        margin-top: 4px;
    }

    .tl-content-card {
        flex: 1;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 12px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .tl-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .tl-date {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
    }

    .tl-amount {
        font-size: 13.5px;
        font-weight: 800;
    }

    .tl-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        color: var(--text-gray);
    }

    .tl-pocket {
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .tl-notes {
        font-style: italic;
        color: var(--text-muted);
    }

    .settled-notice-box {
        text-align: center;
        background: rgba(16, 185, 129, 0.08);
        border: 1px solid rgba(16, 185, 129, 0.25);
        border-radius: 14px;
        padding: 24px 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }

    .notice-icon {
        font-size: 32px;
    }

    .notice-text strong {
        font-size: 14px;
        color: #10b981;
    }

    .notice-text p {
        font-size: 12px;
        color: var(--text-gray);
        margin: 4px 0 0 0;
    }

    .history-footer {
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
    }
</style>

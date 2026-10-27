<script>
    import { isDebtModalOpen, closeDebtModal, openDebtPaymentModal, showToast } from '../stores/uiStore.js';
    import { debtsList, debtSummary, addDebtRecord, deleteDebtRecord } from '../stores/debtStore.js';
    import { pocketsList, getPocketMeta, formatRp } from '../stores/financeStore.js';
    import { activeUser } from '../stores/authStore.js';

    let activeFilter = 'all'; // 'all' | 'receivable' | 'debt' | 'settled'
    let isAddingNew = false;

    // Form fields
    let formType = 'receivable'; // 'receivable' (Piutang Saya) | 'debt' (Hutang Saya)
    let formPersonName = '';
    let formInitialAmountStr = '';
    let formRemainingAmountStr = '';
    let formStartDate = new Date().toISOString().split('T')[0];
    let formDueDate = '';
    let formPocket = 'cash';
    let formNotes = '';
    let formAffectBalance = true;

    $: list = $debtsList || [];
    $: summary = $debtSummary;
    $: pockets = $pocketsList || [];

    $: filteredList = (() => {
        if (activeFilter === 'receivable') {
            return list.filter(d => d.type === 'receivable' && d.status !== 'settled');
        }
        if (activeFilter === 'debt') {
            return list.filter(d => d.type === 'debt' && d.status !== 'settled');
        }
        if (activeFilter === 'settled') {
            return list.filter(d => d.status === 'settled' || (Number(d.remainingAmount) || 0) === 0);
        }
        return list;
    })();

    function handleInitialAmountInput(e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        formInitialAmountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
        // By default set remaining amount same as initial amount if user hasn't explicitly edited it
        if (!formRemainingAmountStr || formRemainingAmountStr === '0') {
            formRemainingAmountStr = formInitialAmountStr;
        }
    }

    function handleRemainingAmountInput(e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        formRemainingAmountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    async function handleCreateDebt(e) {
        if (e) e.preventDefault();
        const name = formPersonName.trim();
        if (!name) {
            showToast('Nama orang/entitas tidak boleh kosong!', 'warning', '⚠️');
            return;
        }

        const initAmt = parseInt(formInitialAmountStr.replace(/[^0-9]/g, ''), 10);
        if (!initAmt || isNaN(initAmt) || initAmt <= 0) {
            showToast('Masukkan jumlah awal yang valid!', 'warning', '⚠️');
            return;
        }

        const remAmt = formRemainingAmountStr
            ? parseInt(formRemainingAmountStr.replace(/[^0-9]/g, ''), 10)
            : initAmt;

        // Format dates ke DD/MM/YYYY
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            if (dateStr.includes('-')) {
                const parts = dateStr.split('-');
                if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
            }
            return dateStr;
        };

        await addDebtRecord({
            type: formType,
            personName: name,
            initialAmount: initAmt,
            remainingAmount: remAmt,
            startDate: formatDate(formStartDate),
            dueDate: formatDate(formDueDate),
            pocketId: formPocket,
            notes: formNotes,
            userProfile: $activeUser ? $activeUser.id : 'user_rebel'
        }, formAffectBalance);

        // Reset form
        formPersonName = '';
        formInitialAmountStr = '';
        formRemainingAmountStr = '';
        formNotes = '';
        formDueDate = '';
        isAddingNew = false;
    }

    function handleDelete(item) {
        if (confirm(`Apakah Anda yakin ingin menghapus catatan "${item.personName}"?`)) {
            deleteDebtRecord(item.id);
        }
    }

    function handleOpenPayment(item) {
        openDebtPaymentModal(item);
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeDebtModal();
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isDebtModalOpen) closeDebtModal(); }} />

{#if $isDebtModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-modal-title"
    >
        <div class="modal-box debt-modal-box" role="document">
            <!-- HEADER -->
            <div class="modal-header-row">
                <div class="header-icon-badge">🤝</div>
                <div class="header-titles">
                    <h3 id="debt-modal-title" class="debt-modal-title">Buku Hutang &amp; Piutang</h3>
                    <p class="debt-modal-sub">
                        Kelola pinjaman uang ke pihak lain dan kewajiban cicilan Anda
                    </p>
                </div>
                <button
                    type="button"
                    class="modal-close-icon-btn"
                    on:click={closeDebtModal}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <!-- SUMMARY BANNER WITH 3 TILES -->
            <div class="debt-summary-banner">
                <div class="sum-tile">
                    <span class="sum-caption">🤝 Piutang Saya</span>
                    <strong class="sum-val text-inc font-mono">{formatRp(summary.totalReceivable)}</strong>
                    <span class="sum-sub">{summary.activeReceivables.length} pihak berhutang</span>
                </div>
                <div class="sum-divider"></div>
                <div class="sum-tile">
                    <span class="sum-caption">💳 Hutang Saya</span>
                    <strong class="sum-val text-exp font-mono">{formatRp(summary.totalDebt)}</strong>
                    <span class="sum-sub">{summary.activeDebts.length} kewajiban aktif</span>
                </div>
                <div class="sum-divider"></div>
                <div class="sum-tile">
                    <span class="sum-caption">⚖️ Posisi Bersih</span>
                    <strong class="sum-val font-mono" class:text-inc={summary.netPosition >= 0} class:text-exp={summary.netPosition < 0}>
                        {formatRp(summary.netPosition)}
                    </strong>
                    <span class="sum-sub">{summary.netPosition >= 0 ? 'Surplus Aset' : 'Defisit Hutang'}</span>
                </div>
            </div>

            <!-- CONTROLS ROW -->
            <div class="controls-action-bar">
                <div class="filter-pills-wrap">
                    <button
                        type="button"
                        class="filter-pill"
                        class:active={activeFilter === 'all'}
                        on:click={() => activeFilter = 'all'}
                    >
                        Semua ({list.length})
                    </button>
                    <button
                        type="button"
                        class="filter-pill"
                        class:active={activeFilter === 'receivable'}
                        on:click={() => activeFilter = 'receivable'}
                    >
                        🤝 Piutang ({summary.activeReceivables.length})
                    </button>
                    <button
                        type="button"
                        class="filter-pill"
                        class:active={activeFilter === 'debt'}
                        on:click={() => activeFilter = 'debt'}
                    >
                        💳 Hutang ({summary.activeDebts.length})
                    </button>
                    <button
                        type="button"
                        class="filter-pill"
                        class:active={activeFilter === 'settled'}
                        on:click={() => activeFilter = 'settled'}
                    >
                        ✓ Lunas ({summary.settledList.length})
                    </button>
                </div>

                <button
                    type="button"
                    class="btn-toggle-add"
                    class:active={isAddingNew}
                    on:click={() => isAddingNew = !isAddingNew}
                >
                    {isAddingNew ? '✕ Tutup Form' : '＋ Catat Baru'}
                </button>
            </div>

            <!-- FORM TAMBAH CATATAN HUTANG / PIUTANG -->
            {#if isAddingNew}
                <form class="debt-form-card" on:submit={handleCreateDebt}>
                    <h4 class="form-heading">Catat Hutang / Piutang Baru</h4>

                    <!-- TIPE SELECTOR -->
                    <div class="type-selector-strip">
                        <button
                            type="button"
                            class="type-btn"
                            class:active={formType === 'receivable'}
                            on:click={() => formType = 'receivable'}
                        >
                            <span>🤝</span> Piutang Saya (Uang Dipinjamkan)
                        </button>
                        <button
                            type="button"
                            class="type-btn"
                            class:active={formType === 'debt'}
                            on:click={() => formType = 'debt'}
                        >
                            <span>💳</span> Hutang Saya (Kewajiban Bayar)
                        </button>
                    </div>

                    <div class="form-row">
                        <label class="form-label" for="debt-name">
                            {formType === 'debt' ? 'Nama Kreditur / Pemberi Pinjaman' : 'Nama Debitur / Peminjam'} <span class="req">*</span>
                            <input
                                id="debt-name"
                                type="text"
                                class="form-input"
                                bind:value={formPersonName}
                                placeholder="Contoh: Budi Santoso, Bank Mandiri, Teman Kantor"
                                required
                            />
                        </label>
                    </div>

                    <div class="form-grid-2">
                        <label class="form-label" for="debt-init-amt">
                            Jumlah Awal Pinjaman (IDR) <span class="req">*</span>
                            <input
                                id="debt-init-amt"
                                type="text"
                                inputmode="numeric"
                                class="form-input font-mono"
                                value={formInitialAmountStr}
                                on:input={handleInitialAmountInput}
                                placeholder="Rp 0"
                                required
                            />
                        </label>

                        <label class="form-label" for="debt-rem-amt">
                            Sisa Saldo Belum Terbayar (IDR)
                            <input
                                id="debt-rem-amt"
                                type="text"
                                inputmode="numeric"
                                class="form-input font-mono"
                                value={formRemainingAmountStr}
                                on:input={handleRemainingAmountInput}
                                placeholder="Sama dengan jumlah awal jika baru"
                            />
                        </label>
                    </div>

                    <div class="form-grid-3">
                        <label class="form-label" for="debt-pocket">
                            Kantong Asal / Tujuan
                            <select id="debt-pocket" class="form-select" bind:value={formPocket}>
                                {#each pockets as p}
                                    <option value={p.id}>{p.icon} {p.name}</option>
                                {/each}
                            </select>
                        </label>

                        <label class="form-label" for="debt-start-date">
                            Tanggal Pinjam
                            <input
                                id="debt-start-date"
                                type="date"
                                class="form-input"
                                bind:value={formStartDate}
                                required
                            />
                        </label>

                        <label class="form-label" for="debt-due-date">
                            Estimasi Jatuh Tempo
                            <input
                                id="debt-due-date"
                                type="date"
                                class="form-input"
                                bind:value={formDueDate}
                            />
                        </label>
                    </div>

                    <div class="form-row">
                        <label class="form-label" for="debt-notes">
                            Catatan / Perjanjian
                            <input
                                id="debt-notes"
                                type="text"
                                class="form-input"
                                bind:value={formNotes}
                                placeholder="Contoh: Janji bayar saat gajian tanggal 25"
                            />
                        </label>
                    </div>

                    <!-- ADJUST CASH BALANCE CHECKBOX -->
                    <div class="balance-adjust-checkbox-box">
                        <label class="checkbox-label" for="debt-adjust-bal">
                            <input
                                id="debt-adjust-bal"
                                type="checkbox"
                                bind:checked={formAffectBalance}
                            />
                            <div class="checkbox-desc">
                                <span class="checkbox-title">Sesuaikan Saldo Kantong Kas Sekarang</span>
                                <span class="checkbox-sub">
                                    {#if formType === 'debt'}
                                        Saldo kantong terpilih akan <b>bertambah</b> (Pemasukan pinjaman cair).
                                    {:else}
                                        Saldo kantong terpilih akan <b>berkurang</b> (Pengeluaran dana dipinjamkan).
                                    {/if}
                                </span>
                            </div>
                        </label>
                    </div>

                    <div class="form-actions-row">
                        <button type="button" class="btn-secondary" on:click={() => isAddingNew = false}>
                            Batal
                        </button>
                        <button type="submit" class="btn-primary">
                            💾 Simpan Catatan
                        </button>
                    </div>
                </form>
            {/if}

            <!-- CARDS LIST -->
            <div class="debt-list-scroll">
                {#if filteredList.length === 0}
                    <div class="empty-state-box">
                        <span class="empty-icon">🤝</span>
                        <p class="empty-title">Belum ada catatan pada filter ini</p>
                        <p class="empty-sub">Gunakan tombol "＋ Catat Baru" untuk mencatat hutang atau piutang</p>
                    </div>
                {:else}
                    {#each filteredList as item}
                        {@const pocketMeta = getPocketMeta(item.pocketId)}
                        {@const isSettled = item.status === 'settled' || (Number(item.remainingAmount) || 0) === 0}
                        {@const init = Number(item.initialAmount) || 0}
                        {@const rem = Number(item.remainingAmount) || 0}
                        {@const progress = init > 0 ? Math.min(100, Math.round(((init - rem) / init) * 100)) : 100}

                        <div class="debt-card-row" class:is-settled={isSettled} class:is-debt={item.type === 'debt'}>
                            <div class="card-main-info">
                                <div class="card-left-badge">
                                    <span class="type-icon">{item.type === 'debt' ? '💳' : '🤝'}</span>
                                </div>

                                <div class="card-text-col">
                                    <div class="title-and-status">
                                        <h4 class="person-title">{item.personName}</h4>
                                        <span class="type-tag" class:tag-debt={item.type === 'debt'} class:tag-rec={item.type === 'receivable'}>
                                            {item.type === 'debt' ? 'Hutang Saya' : 'Piutang Saya'}
                                        </span>
                                        {#if isSettled}
                                            <span class="badge-lunas">✓ Lunas</span>
                                        {:else}
                                            <span class="badge-aktif">{progress}% Terbayar</span>
                                        {/if}
                                    </div>

                                    <div class="meta-row-tags">
                                        <span class="meta-item">
                                            <span>👛</span> {pocketMeta.name}
                                        </span>
                                        {#if item.dueDate}
                                            <span class="meta-item">
                                                <span>📅</span> Tempo: {item.dueDate}
                                            </span>
                                        {/if}
                                        {#if item.notes}
                                            <span class="meta-item meta-notes">{item.notes}</span>
                                        {/if}
                                    </div>
                                </div>

                                <div class="card-amounts-col">
                                    <span class="remaining-amt font-mono" class:text-exp={item.type === 'debt'} class:text-inc={item.type === 'receivable'}>
                                        {formatRp(rem)}
                                    </span>
                                    <span class="initial-amt font-mono">
                                        Awal: {formatRp(init)}
                                    </span>
                                </div>
                            </div>

                            <!-- PROGRESS BAR PELUNASAN -->
                            <div class="repayment-progress-track">
                                <div
                                    class="repayment-progress-fill"
                                    style="width: {progress}%; background-color: {isSettled ? '#10b981' : item.type === 'debt' ? '#ef4444' : '#059669'};"
                                ></div>
                            </div>

                            <!-- ACTIONS TOOLBAR -->
                            <div class="card-actions-bar">
                                <div class="left-action-info">
                                    <span class="payments-count-tag">
                                        📜 {(item.payments || []).length} kali cicilan
                                    </span>
                                </div>

                                <div class="right-action-buttons">
                                    <!-- TOMBOL BAYAR SEBAGIAN / LUNAS -->
                                    {#if !isSettled}
                                        <button
                                            type="button"
                                            class="btn-action-pay"
                                            on:click={() => handleOpenPayment(item)}
                                            title="Bayar cicilan atau lunasi pinjaman ini"
                                        >
                                            <span>⚡</span> {item.type === 'debt' ? 'Bayar Cicilan' : 'Terima Pembayaran'}
                                        </button>
                                    {/if}

                                    <!-- LIHAT HISTORI PEMBAYARAN -->
                                    <button
                                        type="button"
                                        class="btn-action-history"
                                        on:click={() => handleOpenPayment(item)}
                                        title="Buka detail histori pembayaran cicilan"
                                    >
                                        <span>📜</span> Histori
                                    </button>

                                    <!-- HAPUS -->
                                    <button
                                        type="button"
                                        class="btn-action-del"
                                        on:click={() => handleDelete(item)}
                                        title="Hapus catatan ini"
                                        aria-label="Hapus catatan"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>

            <!-- MODAL FOOTER -->
            <div class="debt-modal-footer">
                <span class="footer-tip">
                    💡 Setiap pembayaran cicilan akan otomatis membuat transaksi penyesuaian saldo di kantong yang Anda pilih.
                </span>
                <button type="button" class="btn-secondary" on:click={closeDebtModal}>
                    Tutup
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .debt-modal-box {
        max-width: 650px;
        width: 100%;
        text-align: left;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
        border-radius: 24px;
    }

    .modal-header-row {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 14px;
    }

    .header-icon-badge {
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

    .header-titles {
        flex: 1;
    }

    .debt-modal-title {
        font-size: 17px;
        font-weight: 800;
        margin: 0 0 2px 0;
        color: var(--text-dark);
        letter-spacing: -0.01em;
    }

    .debt-modal-sub {
        font-size: 12px;
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

    /* SUMMARY BANNER */
    .debt-summary-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 12px 16px;
        margin-bottom: 14px;
    }

    .sum-tile {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .sum-caption {
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted);
        letter-spacing: 0.02em;
    }

    .sum-val {
        font-size: 14.5px;
        font-weight: 800;
    }

    .sum-sub {
        font-size: 10.5px;
        color: var(--text-gray);
    }

    .sum-divider {
        width: 1px;
        height: 34px;
        background: var(--border-color);
    }

    /* CONTROLS ACTION BAR */
    .controls-action-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .filter-pills-wrap {
        display: flex;
        gap: 4px;
        background: var(--input-bg, #0f172a);
        padding: 3px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
    }

    .filter-pill {
        background: transparent;
        border: none;
        color: var(--text-gray);
        font-size: 11.5px;
        font-weight: 700;
        padding: 6px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-pill.active {
        background: var(--primary);
        color: #ffffff;
    }

    .btn-toggle-add {
        background: rgba(37, 99, 235, 0.12);
        border: 1px solid var(--primary);
        color: var(--primary);
        font-size: 12px;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 10px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-toggle-add:hover,
    .btn-toggle-add.active {
        background: var(--primary);
        color: #ffffff;
    }

    /* FORM CARD */
    .debt-form-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 14px 16px;
        margin-bottom: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .form-heading {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--text-dark);
        margin: 0;
    }

    .type-selector-strip {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin-bottom: 4px;
    }

    .type-btn {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 10px;
        font-size: 11.5px;
        font-weight: 700;
        color: var(--text-gray);
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
    }

    .type-btn.active {
        background: var(--primary);
        color: #ffffff;
        border-color: var(--primary);
    }

    .form-row {
        display: flex;
        flex-direction: column;
    }

    .form-label {
        font-size: 11.5px;
        font-weight: 600;
        color: var(--text-gray);
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .req {
        color: #ef4444;
    }

    .form-input,
    .form-select {
        background: rgba(0, 0, 0, 0.2);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
        font-size: 13px;
        color: var(--text-dark);
        outline: none;
        transition: border-color 0.2s;
    }

    .form-input:focus,
    .form-select:focus {
        border-color: var(--primary);
    }

    .form-grid-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .form-grid-3 {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 10px;
    }

    @media (max-width: 600px) {
        .form-grid-2,
        .form-grid-3,
        .type-selector-strip {
            grid-template-columns: 1fr;
        }
    }

    .balance-adjust-checkbox-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
    }

    .checkbox-label {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        cursor: pointer;
    }

    .checkbox-desc {
        display: flex;
        flex-direction: column;
    }

    .checkbox-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .checkbox-sub {
        font-size: 11px;
        color: var(--text-muted);
    }

    .form-actions-row {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
    }

    /* LIST SCROLL */
    .debt-list-scroll {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 48vh;
        padding-right: 4px;
        margin-bottom: 12px;
    }

    .empty-state-box {
        text-align: center;
        padding: 32px 16px;
    }

    .empty-icon {
        font-size: 32px;
    }

    .empty-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 6px 0 2px 0;
    }

    .empty-sub {
        font-size: 12px;
        color: var(--text-muted);
        margin: 0;
    }

    .debt-card-row {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.2s;
    }

    .debt-card-row:hover {
        border-color: rgba(255, 255, 255, 0.2);
    }

    .debt-card-row.is-settled {
        opacity: 0.65;
        border-color: rgba(16, 185, 129, 0.2);
    }

    .card-main-info {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .type-icon {
        font-size: 22px;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .card-text-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .title-and-status {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .person-title {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
    }

    .type-tag {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .tag-debt {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
    }

    .tag-rec {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
    }

    .badge-lunas {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .badge-aktif {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .meta-row-tags {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--text-muted);
        flex-wrap: wrap;
    }

    .meta-item {
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }

    .meta-notes {
        font-style: italic;
    }

    .card-amounts-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
    }

    .remaining-amt {
        font-size: 14.5px;
        font-weight: 800;
    }

    .initial-amt {
        font-size: 11px;
        color: var(--text-muted);
    }

    .repayment-progress-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }

    .repayment-progress-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.4s ease;
    }

    /* ACTIONS BAR */
    .card-actions-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 6px;
        border-top: 1px solid var(--border-color);
        gap: 8px;
    }

    .payments-count-tag {
        font-size: 11px;
        color: var(--text-muted);
        font-weight: 600;
    }

    .right-action-buttons {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .btn-action-pay {
        background: var(--primary);
        border: none;
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        padding: 5px 12px;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
    }

    .btn-action-pay:hover {
        background: var(--primary-hover, #1d4ed8);
    }

    .btn-action-history {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-color);
        color: var(--text-gray);
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
    }

    .btn-action-history:hover {
        background: rgba(255, 255, 255, 0.12);
        color: var(--text-dark);
    }

    .btn-action-del {
        background: transparent;
        border: none;
        font-size: 13px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 6px;
        transition: background 0.15s;
    }

    .btn-action-del:hover {
        background: rgba(239, 68, 68, 0.15);
    }

    /* FOOTER */
    .debt-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
    }

    .footer-tip {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
    }
</style>

<script>
    import { isRecurringModalOpen, closeRecurringModal, openAddTxModal, showToast } from '../stores/uiStore.js';
    import {
        recurringList,
        upcomingBills,
        addRecurringRule,
        updateRecurringRule,
        deleteRecurringRule,
        executeRecurringTransaction
    } from '../stores/recurringStore.js';
    import { CATEGORIES, pocketsList, getPocketMeta, formatRp } from '../stores/financeStore.js';
    import { activeUser } from '../stores/authStore.js';

    let activeTab = 'all'; // 'all' | 'urgent' | 'monthly' | 'weekly'
    let isAddingNew = false;

    // Form inputs for new recurring rule
    let formTitle = '';
    let formAmountStr = '';
    let formCategory = 'tagihan';
    let formPocket = 'cash';
    let formFrequency = 'bulanan';
    let formDueDay = 1;
    let formAutoPost = false;
    let formNotes = '';

    $: list = $recurringList || [];
    $: upcoming = $upcomingBills;
    $: pockets = $pocketsList || [];

    $: filteredList = (() => {
        if (activeTab === 'urgent') {
            return upcoming.dueIn7Days;
        }
        if (activeTab === 'monthly') {
            return upcoming.all.filter(b => b.frequency === 'bulanan');
        }
        if (activeTab === 'weekly') {
            return upcoming.all.filter(b => b.frequency === 'mingguan');
        }
        return upcoming.all;
    })();

    function handleAmountInput(e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        formAmountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function handleCreateRecurring(e) {
        if (e) e.preventDefault();
        const t = formTitle.trim();
        if (!t) {
            showToast('Nama tagihan tidak boleh kosong!', 'warning', '⚠️');
            return;
        }

        const amt = parseInt(formAmountStr.replace(/\./g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Masukkan nominal tagihan yang valid!', 'warning', '⚠️');
            return;
        }

        addRecurringRule({
            title: t,
            amount: amt,
            category: formCategory,
            sourcePocketId: formPocket,
            frequency: formFrequency,
            dueDay: formDueDay,
            autoPost: formAutoPost,
            notes: formNotes,
            userProfile: $activeUser ? $activeUser.id : 'user_rebel'
        });

        // Reset form
        formTitle = '';
        formAmountStr = '';
        formNotes = '';
        formDueDay = 1;
        formAutoPost = false;
        isAddingNew = false;
    }

    function handlePayNow(bill) {
        closeRecurringModal();
        // Langsung isi form Catat Transaksi dengan nilai dan kantong yang sesuai
        openAddTxModal({
            type: 'expense',
            amount: Number(bill.amount),
            category: bill.category || 'tagihan',
            pocket: bill.sourcePocketId || 'cash',
            desc: bill.title,
            title: `Bayar Tagihan: ${bill.title}`
        });
    }

    async function handleInstantExecute(bill) {
        await executeRecurringTransaction(bill);
    }

    function toggleAutoPost(bill) {
        updateRecurringRule(bill.id, { autoPost: !bill.autoPost });
    }

    function handleDelete(bill) {
        if (!bill || !bill.id) return;
        deleteRecurringRule(bill.id);
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeRecurringModal();
        }
    }

    // Generator 7 hari ke depan untuk preview strip kalender ringkas
    $: next7Days = (() => {
        const arr = [];
        const now = new Date();
        const INDO_DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
        const INDO_MONTHS_SHORT = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        for (let i = 0; i < 7; i++) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
            const dateNum = d.getDate();
            const dayName = INDO_DAYS[d.getDay()];
            const monthName = INDO_MONTHS_SHORT[d.getMonth() + 1];

            // Cek apakah ada tagihan di tanggal ini
            const hasBills = upcoming.dueIn7Days.some(b => b.daysLeft === i);
            arr.push({
                offset: i,
                dayName,
                dateNum,
                monthName,
                isToday: i === 0,
                hasBills
            });
        }
        return arr;
    })();
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isRecurringModalOpen) closeRecurringModal(); }} />

{#if $isRecurringModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-modal-title"
    >
        <div class="modal-box recurring-modal-box" role="document">
            <!-- HEADER -->
            <div class="recurring-modal-header">
                <div class="header-icon-wrap">📅</div>
                <div class="header-title-wrap">
                    <h3 id="recurring-modal-title" class="recurring-modal-title">Jadwal Transaksi & Tagihan Rutin</h3>
                    <p class="recurring-modal-sub">
                        Kelola tagihan berulang, countdown jatuh tempo, dan opsi posting otomatis
                    </p>
                </div>
                <button
                    type="button"
                    class="modal-close-icon-btn"
                    on:click={closeRecurringModal}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <!-- COMPACT 7-DAY MINI CALENDAR STRIP -->
            <div class="mini-calendar-section">
                <div class="mini-cal-header">
                    <span class="mini-cal-caption">Kalender 7 Hari ke Depan</span>
                    <span class="mini-cal-badge">
                        {upcoming.dueIn7Days.length} Tagihan Menanti ({formatRp(upcoming.totalDueNext7Days)})
                    </span>
                </div>
                <div class="mini-cal-strip">
                    {#each next7Days as item}
                        <div
                            class="cal-day-box"
                            class:today={item.isToday}
                            class:has-bill={item.hasBills}
                            title="{item.isToday ? 'Hari Ini' : `${item.offset} hari lagi`}"
                        >
                            <span class="cal-day-name">{item.dayName}</span>
                            <strong class="cal-date-num">{item.dateNum}</strong>
                            {#if item.hasBills}
                                <span class="cal-dot-indicator"></span>
                            {/if}
                        </div>
                    {/each}
                </div>
            </div>

            <!-- FILTER TABS & ADD BUTTON -->
            <div class="recurring-controls-row">
                <div class="filter-pills" role="tablist">
                    <button
                        type="button"
                        class="tab-pill"
                        class:active={activeTab === 'all'}
                        on:click={() => activeTab = 'all'}
                    >
                        Semua ({upcoming.all.length})
                    </button>
                    <button
                        type="button"
                        class="tab-pill"
                        class:active={activeTab === 'urgent'}
                        on:click={() => activeTab = 'urgent'}
                    >
                        ⚡ 7 Hari ({upcoming.dueIn7Days.length})
                    </button>
                    <button
                        type="button"
                        class="tab-pill"
                        class:active={activeTab === 'monthly'}
                        on:click={() => activeTab = 'monthly'}
                    >
                        Bulanan
                    </button>
                    <button
                        type="button"
                        class="tab-pill"
                        class:active={activeTab === 'weekly'}
                        on:click={() => activeTab = 'weekly'}
                    >
                        Mingguan
                    </button>
                </div>

                <button
                    type="button"
                    class="btn-toggle-add"
                    class:active={isAddingNew}
                    on:click={() => isAddingNew = !isAddingNew}
                >
                    {isAddingNew ? '✕ Tutup Form' : '＋ Tambah Jadwal'}
                </button>
            </div>

            <!-- ADD FORM ACCORDION -->
            {#if isAddingNew}
                <form class="add-recurring-form" on:submit={handleCreateRecurring}>
                    <h4 class="form-title">Tambah Jadwal Tagihan Baru</h4>

                    <div class="form-row">
                        <label class="form-label" for="rec-title">
                            Nama Tagihan <span class="req">*</span>
                            <input
                                id="rec-title"
                                type="text"
                                class="form-input"
                                bind:value={formTitle}
                                placeholder="Contoh: Langganan Netflix, WiFi, Listrik PLN"
                                required
                            />
                        </label>
                    </div>

                    <div class="form-grid-2">
                        <label class="form-label" for="rec-amount">
                            Nominal (IDR) <span class="req">*</span>
                            <input
                                id="rec-amount"
                                type="text"
                                inputmode="numeric"
                                class="form-input font-mono"
                                value={formAmountStr}
                                on:input={handleAmountInput}
                                placeholder="Rp 0"
                                required
                            />
                        </label>

                        <label class="form-label" for="rec-pocket">
                            Kantong Sumber Dana
                            <select id="rec-pocket" class="form-select" bind:value={formPocket}>
                                {#each pockets as p}
                                    <option value={p.id}>{p.icon} {p.name}</option>
                                {/each}
                            </select>
                        </label>
                    </div>

                    <div class="form-grid-3">
                        <label class="form-label" for="rec-cat">
                            Kategori
                            <select id="rec-cat" class="form-select" bind:value={formCategory}>
                                {#each Object.entries(CATEGORIES) as [k, cat]}
                                    <option value={k}>{cat.icon} {cat.name}</option>
                                {/each}
                            </select>
                        </label>

                        <label class="form-label" for="rec-freq">
                            Frekuensi
                            <select id="rec-freq" class="form-select" bind:value={formFrequency}>
                                <option value="bulanan">Bulanan</option>
                                <option value="mingguan">Mingguan</option>
                            </select>
                        </label>

                        <label class="form-label" for="rec-day">
                            {formFrequency === 'bulanan' ? 'Tanggal Tempo (1-31)' : 'Hari Tempo (1-7)'}
                            {#if formFrequency === 'bulanan'}
                                <input
                                    id="rec-day"
                                    type="number"
                                    min="1"
                                    max="31"
                                    class="form-input"
                                    bind:value={formDueDay}
                                />
                            {:else}
                                <select id="rec-day" class="form-select" bind:value={formDueDay}>
                                    <option value={1}>Senin</option>
                                    <option value={2}>Selasa</option>
                                    <option value={3}>Rabu</option>
                                    <option value={4}>Kamis</option>
                                    <option value={5}>Jumat</option>
                                    <option value={6}>Sabtu</option>
                                    <option value={7}>Minggu</option>
                                </select>
                            {/if}
                        </label>
                    </div>

                    <!-- AUTO POST TOGGLE -->
                    <div class="autopost-toggle-box">
                        <label class="toggle-label" for="rec-autopost">
                            <input
                                id="rec-autopost"
                                type="checkbox"
                                bind:checked={formAutoPost}
                            />
                            <div class="toggle-text">
                                <span class="toggle-title">⚡ Posting Otomatis (Auto-Post)</span>
                                <span class="toggle-desc">Sistem otomatis memunculkan konfirmasi pembukuan transaksi saat jatuh tempo</span>
                            </div>
                        </label>
                    </div>

                    <div class="form-actions">
                        <button type="button" class="btn-secondary" on:click={() => isAddingNew = false}>
                            Batal
                        </button>
                        <button type="submit" class="btn-primary">
                            💾 Simpan Jadwal Tagihan
                        </button>
                    </div>
                </form>
            {/if}

            <!-- RECURRING CARDS LIST -->
            <div class="recurring-list-scroll">
                {#if list.length === 0}
                    <div class="empty-state">
                        <span class="empty-icon">📅</span>
                        <p class="empty-title">Belum ada jadwal tagihan rutin</p>
                        <p class="empty-sub">Semua jadwal tagihan telah dihapus. Klik "＋ Tambah Jadwal" untuk membuat pengingat tagihan baru.</p>
                    </div>
                {:else if filteredList.length === 0}
                    <div class="empty-state">
                        <span class="empty-icon">🔍</span>
                        <p class="empty-title">Tidak ada tagihan pada filter ini</p>
                        <p class="empty-sub">Pilih tab filter lain untuk melihat jadwal tagihan lainnya.</p>
                    </div>
                {:else}
                    {#each filteredList as bill (bill.id)}
                        {@const catMeta = CATEGORIES[bill.category] || { name: bill.category, icon: '📦', color: '#64748b' }}
                        {@const pocketMeta = getPocketMeta(bill.sourcePocketId)}

                        <div
                            class="recurring-item-card"
                            class:due-today={bill.isToday && !bill.isPaidThisPeriod}
                            class:due-soon={bill.daysLeft <= 3 && !bill.isToday && !bill.isPaidThisPeriod}
                            class:paid={bill.isPaidThisPeriod}
                        >
                            <div class="item-main-row">
                                <div class="item-icon-col">
                                    <span class="category-bubble">{catMeta.icon}</span>
                                </div>

                                <div class="item-info-col">
                                    <div class="title-and-badges">
                                        <h4 class="bill-title">{bill.title}</h4>
                                        {#if bill.isPaidThisPeriod}
                                            <span class="badge-paid">✓ Sudah Dibayar Bulan Ini</span>
                                        {:else if bill.isToday}
                                            <span class="badge-urgent">Hari Ini!</span>
                                        {:else if bill.daysLeft <= 3}
                                            <span class="badge-soon">{bill.countdownLabel}</span>
                                        {:else}
                                            <span class="badge-normal">{bill.countdownLabel}</span>
                                        {/if}

                                        {#if bill.autoPost}
                                            <span class="badge-autopost" title="Auto-Post Aktif">⚡ Auto</span>
                                        {/if}
                                    </div>

                                    <div class="bill-meta-tags">
                                        <span class="meta-tag">
                                            <span>👛</span> {pocketMeta.name}
                                        </span>
                                        <span class="meta-tag">
                                            <span>📅</span> {bill.frequency === 'mingguan' ? 'Tiap Minggu' : `Tgl ${bill.dueDay} (${bill.dueDateFormatted})`}
                                        </span>
                                        {#if bill.notes}
                                            <span class="meta-tag text-muted font-italic">{bill.notes}</span>
                                        {/if}
                                    </div>
                                </div>

                                <div class="item-amount-col">
                                    <span class="bill-amount text-exp font-mono">{formatRp(bill.amount)}</span>
                                </div>
                            </div>

                            <!-- CARD ACTION TOOLBAR -->
                            <div class="item-action-toolbar">
                                <div class="action-left">
                                    <button
                                        type="button"
                                        class="action-chip"
                                        class:chip-active={bill.autoPost}
                                        on:click={() => toggleAutoPost(bill)}
                                        title="Aktifkan/Nonaktifkan Auto-Post"
                                    >
                                        <span>⚡</span> {bill.autoPost ? 'Auto-Post ON' : 'Auto-Post OFF'}
                                    </button>
                                </div>

                                <div class="action-right">
                                    <!-- TOMBOL CEPAT BAYAR SEKARANG: Mengisi modal + Catat secara instan -->
                                    <button
                                        type="button"
                                        class="btn-pay-now"
                                        on:click={() => handlePayNow(bill)}
                                        title="Buka modal Catat Transaksi dengan nilai dan kantong tagihan ini terisi otomatis"
                                    >
                                        <span>⚡</span> Bayar Sekarang
                                    </button>

                                    <button
                                        type="button"
                                        class="btn-icon-del"
                                        on:click={() => handleDelete(bill)}
                                        title="Hapus jadwal ini"
                                        aria-label="Hapus tagihan"
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
            <div class="recurring-modal-footer">
                <span class="footer-note">
                    💡 Tips: Tagihan dengan <b>⚡ Auto-Post</b> akan otomatis menanyakan pembukuan saat Anda membuka aplikasi pada hari jatuh tempo.
                </span>
                <button type="button" class="btn-secondary" on:click={closeRecurringModal}>
                    Tutup
                </button>
            </div>
        </div>
    </div>
{/if}

<style>
    .recurring-modal-box {
        max-width: 600px;
        width: 100%;
        text-align: left;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
        border-radius: 24px;
    }

    .recurring-modal-header {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        margin-bottom: 14px;
    }

    .header-icon-wrap {
        font-size: 26px;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: rgba(139, 92, 246, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .header-title-wrap {
        flex: 1;
    }

    .recurring-modal-title {
        font-size: 17px;
        font-weight: 800;
        margin: 0 0 3px 0;
        color: var(--text-dark);
        letter-spacing: -0.01em;
    }

    .recurring-modal-sub {
        font-size: 12px;
        color: var(--text-gray);
        margin: 0;
        line-height: 1.4;
    }

    .modal-close-icon-btn {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 16px;
        cursor: pointer;
        padding: 4px;
        border-radius: 8px;
        transition: all 0.2s;
    }

    .modal-close-icon-btn:hover {
        color: var(--text-dark);
        background: rgba(255, 255, 255, 0.08);
    }

    /* MINI CALENDAR STRIP */
    .mini-calendar-section {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 12px 14px;
        margin-bottom: 14px;
    }

    .mini-cal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
    }

    .mini-cal-caption {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted);
        letter-spacing: 0.03em;
    }

    .mini-cal-badge {
        font-size: 11px;
        font-weight: 700;
        color: var(--primary, #3b82f6);
    }

    .mini-cal-strip {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 6px;
    }

    .cal-day-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 6px 2px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        position: relative;
        transition: all 0.2s;
    }

    .cal-day-box.today {
        background: var(--primary-light, rgba(37, 99, 235, 0.16));
        border-color: var(--primary);
    }

    .cal-day-box.has-bill {
        border-color: #f59e0b;
    }

    .cal-day-name {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-muted);
    }

    .cal-date-num {
        font-size: 13px;
        font-weight: 800;
        color: var(--text-dark);
    }

    .cal-dot-indicator {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #f59e0b;
        margin-top: 2px;
    }

    /* CONTROLS ROW */
    .recurring-controls-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 12px;
        flex-wrap: wrap;
    }

    .filter-pills {
        display: flex;
        gap: 4px;
        background: var(--input-bg, #0f172a);
        padding: 3px;
        border-radius: 10px;
        border: 1px solid var(--border-color);
    }

    .tab-pill {
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

    .tab-pill.active {
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

    /* ADD FORM */
    .add-recurring-form {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 14px 16px;
        margin-bottom: 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .form-title {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--text-dark);
        margin: 0 0 4px 0;
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
        .form-grid-3 {
            grid-template-columns: 1fr;
        }
    }

    .autopost-toggle-box {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 8px 12px;
    }

    .toggle-label {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }

    .toggle-text {
        display: flex;
        flex-direction: column;
    }

    .toggle-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .toggle-desc {
        font-size: 10.5px;
        color: var(--text-muted);
    }

    .form-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 6px;
    }

    /* RECURRING LIST SCROLL */
    .recurring-list-scroll {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 48vh;
        padding-right: 4px;
        margin-bottom: 12px;
    }

    .empty-state {
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

    .recurring-item-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        transition: all 0.2s;
    }

    .recurring-item-card:hover {
        border-color: rgba(255, 255, 255, 0.2);
    }

    .recurring-item-card.due-today {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.05);
    }

    .recurring-item-card.due-soon {
        border-color: #f59e0b;
    }

    .recurring-item-card.paid {
        opacity: 0.65;
    }

    .item-main-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .category-bubble {
        font-size: 20px;
        width: 38px;
        height: 38px;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .item-info-col {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .title-and-badges {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .bill-title {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
    }

    .badge-urgent {
        background: #ef4444;
        color: #ffffff;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
        animation: pulse 1.5s infinite;
    }

    .badge-soon {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .badge-normal {
        background: rgba(255, 255, 255, 0.07);
        color: var(--text-muted);
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .badge-paid {
        background: rgba(16, 185, 129, 0.2);
        color: #10b981;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .badge-autopost {
        background: rgba(139, 92, 246, 0.2);
        color: #a78bfa;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 6px;
        border-radius: 100px;
    }

    .bill-meta-tags {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        color: var(--text-muted);
        flex-wrap: wrap;
    }

    .meta-tag {
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }

    .bill-amount {
        font-size: 14.5px;
        font-weight: 800;
    }

    /* ACTION TOOLBAR */
    .item-action-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 8px;
        border-top: 1px solid var(--border-color);
        gap: 8px;
    }

    .action-chip {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-muted);
        font-size: 10.5px;
        font-weight: 700;
        padding: 4px 8px;
        border-radius: 8px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        transition: all 0.2s;
    }

    .action-chip.chip-active {
        border-color: #8b5cf6;
        color: #a78bfa;
        background: rgba(139, 92, 246, 0.1);
    }

    .action-right {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .btn-pay-now {
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
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.25);
        transition: all 0.2s;
    }

    .btn-pay-now:hover {
        background: var(--primary-hover, #1d4ed8);
        transform: translateY(-1px);
    }

    .btn-icon-del {
        background: transparent;
        border: none;
        font-size: 13px;
        cursor: pointer;
        padding: 4px 6px;
        border-radius: 6px;
        transition: background 0.15s;
    }

    .btn-icon-del:hover {
        background: rgba(239, 68, 68, 0.15);
    }

    /* FOOTER */
    .recurring-modal-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--border-color);
    }

    .footer-note {
        font-size: 11px;
        color: var(--text-muted);
        line-height: 1.4;
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
</style>

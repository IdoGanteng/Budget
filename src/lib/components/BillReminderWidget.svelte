<script>
    import { upcomingBills, recurringList, deleteRecurringRule } from '../stores/recurringStore.js';
    import { openRecurringModal, openAddTxModal, privacyMode } from '../stores/uiStore.js';
    import { formatRp, getPocketMeta } from '../stores/financeStore.js';

    $: upcoming = $upcomingBills;
    $: allBills = $recurringList || [];
    $: dueIn7Days = upcoming?.dueIn7Days || [];
    $: totalDue = upcoming?.totalDueNext7Days || 0;

    function handlePayNow(bill) {
        openAddTxModal({
            type: 'expense',
            amount: Number(bill.amount),
            category: bill.category || 'tagihan',
            pocket: bill.sourcePocketId || 'cash',
            desc: bill.title,
            title: `Bayar Tagihan: ${bill.title}`
        });
    }

    function handleDeleteBill(bill) {
        if (!bill || !bill.id) return;
        deleteRecurringRule(bill.id);
    }
</script>

<div class="bill-reminder-widget">
    <!-- WIDGET HEADER -->
    <div class="widget-header">
        <div class="header-left">
            <span class="widget-icon">⏰</span>
            <div class="header-titles">
                <h3 class="widget-title">Tagihan Jatuh Tempo (7 Hari)</h3>
                <span class="widget-sub">
                    {#if allBills.length === 0}
                        Belum ada jadwal tagihan rutin
                    {:else if dueIn7Days.length > 0}
                        {dueIn7Days.length} tagihan menunggu ({formatRp(totalDue, $privacyMode)})
                    {:else}
                        Tidak ada tagihan mendesak
                    {/if}
                </span>
            </div>
        </div>

        <button
            type="button"
            class="btn-open-schedule"
            on:click={openRecurringModal}
            title="Buka jadwal tagihan lengkap"
        >
            <span>📅</span> Jadwal Lengkap
        </button>
    </div>

    <!-- LIST OF UPCOMING BILLS (NEXT 7 DAYS) -->
    {#if allBills.length === 0}
        <div class="all-clear-box">
            <span class="all-clear-icon">📅</span>
            <div class="all-clear-text">
                <strong>Belum ada jadwal tagihan rutin</strong>
                <p>Kelola dan jadwalkan pengeluaran berkala Anda dengan mudah.</p>
            </div>
            <button type="button" class="btn-check-all" on:click={openRecurringModal}>
                ＋ Tambah Jadwal
            </button>
        </div>
    {:else if dueIn7Days.length === 0}
        <div class="all-clear-box">
            <span class="all-clear-icon">🎉</span>
            <div class="all-clear-text">
                <strong>Semua Tagihan Aman Terkendali</strong>
                <p>Tidak ada tagihan jatuh tempo dalam 7 hari ke depan.</p>
            </div>
            <button type="button" class="btn-check-all" on:click={openRecurringModal}>
                Cek Semua Jadwal
            </button>
        </div>
    {:else}
        <div class="upcoming-scroll-rack">
            {#each dueIn7Days as bill (bill.id)}
                {@const pocketMeta = getPocketMeta(bill.sourcePocketId)}
                <div class="upcoming-bill-card" class:is-today={bill.isToday}>
                    <div class="bill-card-top">
                        <div class="top-chips">
                            <span
                                class="countdown-chip"
                                class:chip-today={bill.isToday}
                                class:chip-soon={bill.daysLeft <= 2 && !bill.isToday}
                            >
                                {bill.countdownLabel}
                            </span>

                            {#if bill.autoPost}
                                <span class="autopost-indicator" title="Auto-Post Aktif">⚡ Auto</span>
                            {/if}
                        </div>

                        <!-- TOMBOL HAPUS CEPAT (IKON SAMPAH 🗑️) -->
                        <button
                            type="button"
                            class="btn-card-del"
                            on:click|stopPropagation={() => handleDeleteBill(bill)}
                            title="Hapus jadwal tagihan ini"
                            aria-label="Hapus tagihan"
                        >
                            🗑️
                        </button>
                    </div>

                    <div class="bill-card-middle">
                        <h4 class="card-bill-title">{bill.title}</h4>
                        <span class="card-bill-amount font-mono text-exp">
                            {formatRp(bill.amount, $privacyMode)}
                        </span>
                    </div>

                    <div class="bill-card-footer">
                        <span class="card-pocket-pill">
                            <span>{pocketMeta.icon || '👛'}</span> {pocketMeta.name}
                        </span>

                        <!-- TOMBOL CEPAT BAYAR SEKARANG: Langsung mengisi modal + Catat -->
                        <button
                            type="button"
                            class="btn-card-pay"
                            on:click={() => handlePayNow(bill)}
                            title="Bayar tagihan ini sekarang melalui form Catat Transaksi"
                        >
                            <span>⚡</span> Bayar Sekarang
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .bill-reminder-widget {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg, 24px);
        padding: 16px 20px;
        margin: 16px 0;
        box-shadow: var(--shadow-card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
    }

    .widget-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
        gap: 12px;
        flex-wrap: wrap;
    }

    .header-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .widget-icon {
        font-size: 20px;
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: rgba(245, 158, 11, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .header-titles {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .widget-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--text-dark);
        margin: 0;
        letter-spacing: -0.01em;
    }

    .widget-sub {
        font-size: 11.5px;
        color: var(--text-gray);
    }

    .btn-open-schedule {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        color: var(--text-dark);
        font-size: 11.5px;
        font-weight: 700;
        padding: 6px 12px;
        border-radius: 10px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
    }

    .btn-open-schedule:hover {
        background: var(--primary);
        color: #ffffff;
        border-color: var(--primary);
    }

    /* ALL CLEAR STATE */
    .all-clear-box {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 12px 14px;
    }

    .all-clear-icon {
        font-size: 24px;
        flex-shrink: 0;
    }

    .all-clear-text {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .all-clear-text strong {
        font-size: 12.5px;
        color: var(--text-dark);
    }

    .all-clear-text p {
        font-size: 11px;
        color: var(--text-muted);
        margin: 0;
    }

    .btn-check-all {
        background: transparent;
        border: 1px solid var(--border-color);
        color: var(--text-gray);
        font-size: 11px;
        font-weight: 700;
        padding: 5px 10px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
    }

    .btn-check-all:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-dark);
    }

    /* UPCOMING SCROLL RACK */
    .upcoming-scroll-rack {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
    }

    @media (max-width: 600px) {
        .upcoming-scroll-rack {
            grid-template-columns: 1fr;
        }
    }

    .upcoming-bill-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.2s;
    }

    .upcoming-bill-card:hover {
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
    }

    .upcoming-bill-card.is-today {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.05);
    }

    .bill-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
    }

    .top-chips {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .btn-card-del {
        background: transparent;
        border: 1px solid transparent;
        color: var(--text-muted);
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 13px;
        line-height: 1;
        transition: all 0.2s ease;
        opacity: 0.65;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .btn-card-del:hover {
        background: rgba(239, 68, 68, 0.12);
        border-color: rgba(239, 68, 68, 0.25);
        color: #ef4444;
        opacity: 1;
        transform: scale(1.1);
    }

    .countdown-chip {
        font-size: 10px;
        font-weight: 800;
        padding: 2.5px 7px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-gray);
    }

    .chip-today {
        background: #ef4444;
        color: #ffffff;
        animation: pulse 1.5s infinite;
    }

    .chip-soon {
        background: rgba(245, 158, 11, 0.2);
        color: #f59e0b;
    }

    .autopost-indicator {
        font-size: 9.5px;
        font-weight: 800;
        color: #a78bfa;
        background: rgba(139, 92, 246, 0.15);
        padding: 2px 5px;
        border-radius: 6px;
    }

    .bill-card-middle {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .card-bill-title {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .card-bill-amount {
        font-size: 14px;
        font-weight: 800;
    }

    .bill-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 6px;
        border-top: 1px solid var(--border-color);
        gap: 8px;
    }

    .card-pocket-pill {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }

    .btn-card-pay {
        background: var(--primary);
        border: none;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        padding: 4px 10px;
        border-radius: 7px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: all 0.2s;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.2);
    }

    .btn-card-pay:hover {
        background: var(--primary-hover, #1d4ed8);
        transform: translateY(-1px);
    }

    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
    }
</style>

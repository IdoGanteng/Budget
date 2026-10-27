<script>
    import { debtSummary } from '../stores/debtStore.js';
    import { openDebtModal, openDebtPaymentModal, privacyMode } from '../stores/uiStore.js';
    import { formatRp, getPocketMeta } from '../stores/financeStore.js';

    $: summary = $debtSummary;
    $: activeItems = [...(summary.activeDebts || []), ...(summary.activeReceivables || [])].slice(0, 4);
</script>

<div class="debt-summary-widget">
    <!-- WIDGET HEADER -->
    <div class="widget-header">
        <div class="header-left">
            <span class="widget-icon">🤝</span>
            <div class="header-titles">
                <h3 class="widget-title">Hutang &amp; Piutang</h3>
                <span class="widget-sub">
                    {#if summary.totalActiveCount > 0}
                        {summary.totalActiveCount} catatan aktif berjalan
                    {:else}
                        Bebas tanggungan hutang / piutang
                    {/if}
                </span>
            </div>
        </div>

        <button
            type="button"
            class="btn-open-book"
            on:click={openDebtModal}
            title="Buka buku hutang dan piutang lengkap"
        >
            <span>📖</span> Kelola Buku
        </button>
    </div>

    <!-- METRICS 3-COLUMN RACK (PRIVACY MODE SUPPORTED) -->
    <div class="debt-metrics-banner">
        <div class="metric-box">
            <span class="metric-caption">🤝 Piutang Saya</span>
            <strong class="metric-value text-inc font-mono">
                {formatRp(summary.totalReceivable, $privacyMode)}
            </strong>
            <span class="metric-sub">Hak tagih ke orang</span>
        </div>

        <div class="metric-divider"></div>

        <div class="metric-box">
            <span class="metric-caption">💳 Hutang Saya</span>
            <strong class="metric-value text-exp font-mono">
                {formatRp(summary.totalDebt, $privacyMode)}
            </strong>
            <span class="metric-sub">Kewajiban bayar</span>
        </div>

        <div class="metric-divider"></div>

        <div class="metric-box">
            <span class="metric-caption">⚖️ Posisi Bersih</span>
            <strong class="metric-value font-mono" class:text-inc={summary.netPosition >= 0} class:text-exp={summary.netPosition < 0}>
                {formatRp(summary.netPosition, $privacyMode)}
            </strong>
            <span class="metric-sub">{summary.netPosition >= 0 ? 'Surplus Aset' : 'Defisit Hutang'}</span>
        </div>
    </div>

    <!-- ACTIVE DEBTS / RECEIVABLES QUICK LIST -->
    {#if summary.totalActiveCount === 0}
        <div class="all-clear-box">
            <span class="all-clear-icon">🕊️</span>
            <div class="all-clear-text">
                <strong>Tidak Ada Tanggungan Aktif</strong>
                <p>Semua pinjaman telah lunas atau belum ada catatan hutang piutang baru.</p>
            </div>
            <button type="button" class="btn-add-quick" on:click={openDebtModal}>
                Catat Baru
            </button>
        </div>
    {:else}
        <div class="active-debts-grid">
            {#each activeItems as item}
                {@const pocketMeta = getPocketMeta(item.pocketId)}
                {@const init = Number(item.initialAmount) || 0}
                {@const rem = Number(item.remainingAmount) || 0}
                {@const progress = init > 0 ? Math.min(100, Math.round(((init - rem) / init) * 100)) : 100}

                <div class="active-debt-mini-card" class:is-debt={item.type === 'debt'}>
                    <div class="mini-card-top">
                        <span class="type-pill" class:pill-debt={item.type === 'debt'} class:pill-rec={item.type === 'receivable'}>
                            {item.type === 'debt' ? '💳 Hutang' : '🤝 Piutang'}
                        </span>
                        <span class="progress-pill">{progress}% Terbayar</span>
                    </div>

                    <div class="mini-card-title-row">
                        <h4 class="mini-card-name">{item.personName}</h4>
                        <span class="mini-card-rem font-mono" class:text-exp={item.type === 'debt'} class:text-inc={item.type === 'receivable'}>
                            {formatRp(rem, $privacyMode)}
                        </span>
                    </div>

                    <!-- REPAYMENT PROGRESS BAR -->
                    <div class="mini-bar-track">
                        <div
                            class="mini-bar-fill"
                            style="width: {progress}%; background-color: {item.type === 'debt' ? '#ef4444' : '#10b981'};"
                        ></div>
                    </div>

                    <div class="mini-card-footer">
                        <span class="card-pocket-tag">
                            <span>{pocketMeta.icon || '👛'}</span> {pocketMeta.name}
                        </span>

                        <button
                            type="button"
                            class="btn-mini-pay"
                            on:click={() => openDebtPaymentModal(item)}
                            title="Bayar cicilan atau lihat histori"
                        >
                            <span>⚡</span> {item.type === 'debt' ? 'Bayar Cicilan' : 'Terima Uang'}
                        </button>
                    </div>
                </div>
            {/each}
        </div>
    {/if}
</div>

<style>
    .debt-summary-widget {
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
        background: rgba(16, 185, 129, 0.15);
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

    .btn-open-book {
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

    .btn-open-book:hover {
        background: var(--primary);
        color: #ffffff;
        border-color: var(--primary);
    }

    /* 3-COLUMN METRICS BANNER */
    .debt-metrics-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 12px 16px;
        margin-bottom: 12px;
    }

    .metric-box {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .metric-caption {
        font-size: 10.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--text-muted);
    }

    .metric-value {
        font-size: 14px;
        font-weight: 800;
    }

    .metric-sub {
        font-size: 10.5px;
        color: var(--text-gray);
    }

    .metric-divider {
        width: 1px;
        height: 32px;
        background: var(--border-color);
    }

    /* ALL CLEAR */
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

    .btn-add-quick {
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

    .btn-add-quick:hover {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-dark);
    }

    /* ACTIVE GRID */
    .active-debts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 10px;
    }

    @media (max-width: 600px) {
        .active-debts-grid {
            grid-template-columns: 1fr;
        }
    }

    .active-debt-mini-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 7px;
        transition: all 0.2s;
    }

    .active-debt-mini-card:hover {
        border-color: rgba(255, 255, 255, 0.2);
    }

    .mini-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .type-pill {
        font-size: 9.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .pill-debt {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
    }

    .pill-rec {
        background: rgba(16, 185, 129, 0.15);
        color: #10b981;
    }

    .progress-pill {
        font-size: 10px;
        font-weight: 700;
        color: var(--text-muted);
    }

    .mini-card-title-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 6px;
    }

    .mini-card-name {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-dark);
        margin: 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .mini-card-rem {
        font-size: 13px;
        font-weight: 800;
        flex-shrink: 0;
    }

    .mini-bar-track {
        height: 5px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }

    :global([data-theme="light"]) .mini-bar-track {
        background: rgba(0, 0, 0, 0.08);
    }

    .mini-bar-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.4s ease;
    }

    .mini-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-top: 6px;
        border-top: 1px solid var(--border-color);
        gap: 6px;
    }

    .card-pocket-tag {
        font-size: 10.5px;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }

    .btn-mini-pay {
        background: var(--primary);
        border: none;
        color: #ffffff;
        font-size: 10.5px;
        font-weight: 800;
        padding: 3.5px 9px;
        border-radius: 7px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        transition: all 0.2s;
    }

    .btn-mini-pay:hover {
        background: var(--primary-hover, #1d4ed8);
    }
</style>

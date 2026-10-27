<script>
    import { categoryBudgetSummary, formatRp, selectedMonth } from '../stores/financeStore.js';
    import { openBudgetModal, privacyMode } from '../stores/uiStore.js';

    const INDO_MONTHS = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function formatMonth(mKey) {
        if (!mKey || mKey === 'all') return 'Bulan Ini';
        const parts = mKey.split('/');
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            return `${INDO_MONTHS[m] || parts[0]} ${parts[1]}`;
        }
        return mKey;
    }

    $: summary = $categoryBudgetSummary;
    $: items = summary?.sortedItems || [];
    $: activeMonthLabel = formatMonth($selectedMonth);
</script>

<section class="category-budget-section" id="budget-section">
    <div class="budget-card-container">
        <!-- HEADER -->
        <div class="budget-section-header">
            <div class="header-left-col">
                <div class="title-row">
                    <span class="header-icon">🎯</span>
                    <h2 class="section-title">Batas Anggaran Kategori</h2>
                    <span class="month-pill">{activeMonthLabel}</span>
                </div>
                <p class="section-desc">
                    Realisasi pengeluaran vs pagu anggaran per kategori ({activeMonthLabel})
                </p>
            </div>

            <div class="header-right-col">
                <button
                    type="button"
                    class="btn-manage-budget"
                    on:click={() => openBudgetModal($selectedMonth)}
                    title="Atur pagu batas anggaran kategori"
                >
                    <span>⚙️</span> Atur Anggaran
                </button>
            </div>
        </div>

        <!-- TOTAL PROGRESS BAR BANNER -->
        <div class="total-budget-banner">
            <div class="banner-stat-row">
                <div class="banner-stat">
                    <span class="stat-caption">Total Terpakai</span>
                    <strong class="stat-num text-exp font-mono">{formatRp(summary.totalSpent, $privacyMode)}</strong>
                </div>
                <div class="banner-stat text-center">
                    <span class="stat-caption">Pagu Total</span>
                    <strong class="stat-num font-mono">{formatRp(summary.totalLimit, $privacyMode)}</strong>
                </div>
                <div class="banner-stat text-right">
                    <span class="stat-caption">Sisa Anggaran</span>
                    <strong class="stat-num text-inc font-mono">{formatRp(summary.totalRemaining, $privacyMode)}</strong>
                </div>
            </div>

            <div class="budget-progress-track">
                <div
                    class="budget-progress-fill"
                    style="width: {Math.min(summary.totalPercentage, 100)}%; background-color: {summary.isOverallOverbudget || summary.totalPercentage > 90 ? '#ef4444' : summary.totalPercentage >= 75 ? '#f59e0b' : '#10b981'};"
                ></div>
            </div>

            <div class="banner-sub-row">
                <span class="pct-text">
                    {summary.totalPercentage.toFixed(1)}% Terpakai
                </span>
                {#if summary.overbudgetCategories.length > 0}
                    <span class="alert-tag-red">
                        ⚠️ {summary.overbudgetCategories.length} Kategori Overbudget
                    </span>
                {:else if summary.warningCategories.length > 0}
                    <span class="alert-tag-yellow">
                        ⚡ {summary.warningCategories.length} Kategori Mendekati Batas (&gt;80%)
                    </span>
                {:else}
                    <span class="alert-tag-green">
                        ✓ Seluruh Kategori Berada di Zona Aman
                    </span>
                {/if}
            </div>
        </div>

        <!-- CATEGORIES GRID -->
        <div class="category-cards-grid">
            {#each items as item}
                <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                <div
                    class="category-budget-item-card"
                    class:is-over={item.isOverbudget}
                    class:is-warning={item.status === 'warning'}
                    class:is-danger={item.status === 'danger'}
                    on:click={() => openBudgetModal($selectedMonth)}
                    role="button"
                    tabindex="0"
                    title="Klik untuk mengubah batas anggaran {item.name}"
                >
                    <div class="item-top-row">
                        <div class="item-identity">
                            <span class="item-icon">{item.icon}</span>
                            <span class="item-name">{item.name}</span>
                        </div>
                        <span
                            class="item-status-badge"
                            style="background-color: {item.statusBg}; color: {item.statusColor};"
                        >
                            {item.statusBadge}
                        </span>
                    </div>

                    <div class="item-numbers-row">
                        <span class="item-spent-val font-mono">
                            {formatRp(item.spent, $privacyMode)}
                        </span>
                        <span class="item-limit-val font-mono">
                            / {item.hasLimit ? formatRp(item.limit, $privacyMode) : 'Tanpa Limit'}
                        </span>
                    </div>

                    <!-- PROGRESS BAR: Green <75%, Yellow 75-90%, Red >90% -->
                    <div class="item-bar-track">
                        <div
                            class="item-bar-fill"
                            style="width: {Math.min(item.percentage, 100)}%; background-color: {item.statusColor};"
                        ></div>
                    </div>

                    <div class="item-bottom-row">
                        <span class="item-pct-label">
                            {item.hasLimit ? `${item.percentage.toFixed(0)}%` : 'Bebas'}
                        </span>
                        <span class="item-remaining-label" class:text-over={item.isOverbudget}>
                            {#if item.isOverbudget}
                                Defisit {formatRp(item.spent - item.limit, $privacyMode)}
                            {:else if item.hasLimit}
                                Sisa {formatRp(item.remaining, $privacyMode)}
                            {:else}
                                Belum ada batas
                            {/if}
                        </span>
                    </div>
                </div>
            {/each}
        </div>
    </div>
</section>

<style>
    .category-budget-section {
        margin: 18px 0;
        width: 100%;
    }

    .budget-card-container {
        background: var(--card-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--radius-lg, 24px);
        padding: 20px 24px;
        box-shadow: var(--shadow-card);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        transition: border-color 0.3s;
    }

    .budget-section-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 16px;
        flex-wrap: wrap;
    }

    .header-left-col {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .header-icon {
        font-size: 20px;
    }

    .section-title {
        font-size: 17px;
        font-weight: 800;
        color: var(--text-dark);
        margin: 0;
        letter-spacing: -0.01em;
    }

    .month-pill {
        background: var(--primary-light, rgba(37, 99, 235, 0.14));
        color: var(--primary, #3b82f6);
        font-size: 11.5px;
        font-weight: 700;
        padding: 2px 10px;
        border-radius: 100px;
    }

    .section-desc {
        font-size: 12.5px;
        color: var(--text-gray);
        margin: 0;
    }

    .btn-manage-budget {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        color: var(--text-dark);
        font-size: 12px;
        font-weight: 700;
        padding: 8px 14px;
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s;
    }

    .btn-manage-budget:hover {
        background: var(--primary);
        color: #ffffff;
        border-color: var(--primary);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }

    .total-budget-banner {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 16px;
        padding: 14px 16px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .banner-stat-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .banner-stat {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .stat-caption {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .stat-num {
        font-size: 14.5px;
        font-weight: 800;
        color: var(--text-dark);
    }

    .budget-progress-track {
        height: 8px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }

    :global([data-theme="light"]) .budget-progress-track {
        background: rgba(0, 0, 0, 0.08);
    }

    .budget-progress-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .banner-sub-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11.5px;
        font-weight: 600;
    }

    .pct-text {
        color: var(--text-gray);
    }

    .alert-tag-red {
        color: #ef4444;
        font-weight: 700;
    }

    .alert-tag-yellow {
        color: #f59e0b;
        font-weight: 700;
    }

    .alert-tag-green {
        color: #10b981;
        font-weight: 700;
    }

    .category-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
        gap: 12px;
    }

    @media (max-width: 640px) {
        .category-cards-grid {
            grid-template-columns: 1fr;
        }
    }

    .category-budget-item-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .category-budget-item-card:hover {
        transform: translateY(-2px);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.15);
    }

    .category-budget-item-card.is-over {
        border-color: rgba(239, 68, 68, 0.4);
    }

    .item-top-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .item-identity {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .item-icon {
        font-size: 18px;
    }

    .item-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .item-status-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 2.5px 8px;
        border-radius: 100px;
        letter-spacing: 0.02em;
        white-space: nowrap;
    }

    .item-numbers-row {
        display: flex;
        align-items: baseline;
        gap: 4px;
    }

    .item-spent-val {
        font-size: 14px;
        font-weight: 800;
        color: var(--text-dark);
    }

    .item-limit-val {
        font-size: 11.5px;
        color: var(--text-muted);
    }

    .item-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }

    :global([data-theme="light"]) .item-bar-track {
        background: rgba(0, 0, 0, 0.08);
    }

    .item-bar-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.5s ease;
    }

    .item-bottom-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 11px;
        font-weight: 600;
    }

    .item-pct-label {
        color: var(--text-muted);
    }

    .item-remaining-label {
        color: var(--text-gray);
    }

    .item-remaining-label.text-over {
        color: #ef4444;
        font-weight: 700;
    }
</style>

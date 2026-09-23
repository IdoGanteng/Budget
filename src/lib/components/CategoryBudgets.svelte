<script>
    import { isCategoryBudgetsModalOpen } from '../stores/uiStore.js';
    import { categoryBudgets, filteredData, formatRp } from '../stores/financeStore.js';

    const monitored = [
        { key: 'makan', label: 'Anggaran Makan & Minum', icon: '🍔' },
        { key: 'belanja', label: 'Anggaran Belanja', icon: '🛍️' },
        { key: 'transport', label: 'Anggaran Transportasi', icon: '🚗' },
        { key: 'tagihan', label: 'Anggaran Tagihan & Utilitas', icon: '🏠' }
    ];

    $: catExpenses = $filteredData.catExpensesMap;
    $: budgets = $categoryBudgets;
</script>

<div class="glass-panel section-budgets jago-budgets-section">
    <div class="jago-budget-header">
        <div class="jago-header-title">
            <div class="jago-title-row">
                <h2 class="panel-title" style="margin: 0;">📊 Anggaran Kategori Bulan Ini</h2>
            </div>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-gray);">Pantau batas belanja harian dengan indikator status otomatis</p>
        </div>
        <button
            type="button"
            on:click={() => isCategoryBudgetsModalOpen.set(true)}
            class="btn-jago-ghost"
            title="Atur batas nominal tiap kategori"
        >
            <span>⚙️</span> Atur Batas
        </button>
    </div>

    <div class="budget-categories-list jago-categories-list">
        {#each monitored as m}
            {@const budget = budgets[m.key] || 1000000}
            {@const spent = catExpenses[m.key] || 0}
            {@const remaining = budget - spent}
            {@const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0}

            <div class="jago-budget-item">
                <div class="jago-budget-top">
                    <div class="jago-budget-info">
                        <span class="jago-budget-icon">{m.icon}</span>
                        <span class="jago-budget-name">{m.label}</span>
                    </div>
                    <div class="jago-budget-status-row">
                        {#if pct > 90}
                            <span class="jago-status-pill pill-danger">
                                ⚠️ {pct > 100 ? 'Melebihi Batas' : 'Kritis (>90%)'}
                            </span>
                            <span class="jago-budget-pct text-danger">{pct}%</span>
                        {:else if pct >= 70}
                            <span class="jago-status-pill pill-warning">
                                ▲ Waspada (70-90%)
                            </span>
                            <span class="jago-budget-pct text-warning">{pct}%</span>
                        {:else}
                            <span class="jago-status-pill pill-safe">
                                ● Aman (&lt;70%)
                            </span>
                            <span class="jago-budget-pct text-safe">{pct}%</span>
                        {/if}
                    </div>
                </div>

                <!-- JAGO PROGRESS BAR TRACK -->
                <div class="jago-budget-bar-track">
                    <div
                        class="jago-budget-bar-fill {pct > 90 ? 'bar-danger' : pct >= 70 ? 'bar-warning' : 'bar-safe'}"
                        style="width: {Math.min(pct, 100)}%;"
                    ></div>
                </div>

                <!-- ADJACENT BUDGET METRICS: SPENT / REMAINING / LIMIT -->
                <div class="jago-budget-metrics">
                    <div class="metric-item">
                        <span class="metric-label">Terpakai</span>
                        <span class="metric-value font-mono">{formatRp(spent)}</span>
                    </div>
                    <div class="metric-divider"></div>
                    <div class="metric-item">
                        <span class="metric-label">Sisa</span>
                        <span class="metric-value font-mono {remaining < 0 ? 'metric-over' : 'metric-left'}">
                            {remaining >= 0 ? formatRp(remaining) : '−' + formatRp(Math.abs(remaining))}
                        </span>
                    </div>
                    <div class="metric-divider"></div>
                    <div class="metric-item text-right">
                        <span class="metric-label">Batas</span>
                        <span class="metric-value font-mono">{formatRp(budget)}</span>
                    </div>
                </div>
            </div>
        {/each}
    </div>
</div>

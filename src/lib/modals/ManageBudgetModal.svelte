<script>
    import { isBudgetModalOpen, budgetModalMonth, closeBudgetModal, showToast } from '../stores/uiStore.js';
    import {
        CATEGORIES,
        categoryBudgets,
        filteredData,
        selectedMonth,
        formatRp,
        updateMonthlyBudgets,
        resetCategoryBudgets
    } from '../stores/financeStore.js';
    import confetti from 'canvas-confetti';

    const INDO_MONTHS = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function formatMonth(mKey) {
        if (!mKey || mKey === 'all') return 'Semua Periode';
        const parts = mKey.split('/');
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            return `${INDO_MONTHS[m] || parts[0]} ${parts[1]}`;
        }
        return mKey;
    }

    const expenseKeys = ['makan', 'transport', 'belanja', 'tagihan', 'hiburan', 'kesehatan', 'lainnya'];

    let targetScope = 'base'; // 'base' = Semua Bulan (Standar) | 'month' = Bulan Tertentu
    let activeMonthKey = '';
    let localLimits = {};
    let wasOpen = false;

    $: if ($isBudgetModalOpen && !wasOpen) {
        wasOpen = true;
        const curMonth = $budgetModalMonth || ($selectedMonth !== 'all' ? $selectedMonth : '');
        if (curMonth) {
            activeMonthKey = curMonth;
            targetScope = 'month';
        } else {
            // Default to current calendar month
            const now = new Date();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yyyy = now.getFullYear();
            activeMonthKey = `${mm}/${yyyy}`;
            targetScope = 'base';
        }
        loadLocalLimits();
    } else if (!$isBudgetModalOpen) {
        wasOpen = false;
    }

    $: if (targetScope && wasOpen) {
        loadLocalLimits();
    }

    function loadLocalLimits() {
        const state = $categoryBudgets || {};
        const isMonthScope = targetScope === 'month' && activeMonthKey;
        const monthMap = (isMonthScope && state.monthly && state.monthly[activeMonthKey]) || {};
        const baseMap = state.base || {};

        const map = {};
        expenseKeys.forEach(k => {
            if (isMonthScope && monthMap[k] !== undefined) {
                map[k] = monthMap[k];
            } else if (baseMap[k] !== undefined) {
                map[k] = baseMap[k];
            } else {
                map[k] = CATEGORIES[k]?.budgetLimit || 0;
            }
        });
        localLimits = map;
    }

    function handleAmountChange(key, e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        localLimits[key] = raw ? parseInt(raw, 10) : 0;
    }

    function addQuick(key, delta) {
        const cur = Number(localLimits[key]) || 0;
        localLimits[key] = Math.max(0, cur + delta);
    }

    function handleSave() {
        const monthTarget = targetScope === 'month' ? activeMonthKey : null;
        updateMonthlyBudgets(localLimits, monthTarget);
        try {
            confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch (e) {}
        closeBudgetModal();
    }

    function handleResetDefault() {
        const monthTarget = targetScope === 'month' ? activeMonthKey : null;
        resetCategoryBudgets(monthTarget);
        loadLocalLimits();
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeBudgetModal();
        }
    }

    $: totalBudgetLimit = Object.values(localLimits).reduce((a, b) => a + (Number(b) || 0), 0);
    $: currentSpentMap = $filteredData?.catExpensesMap || {};
    $: totalCurrentSpent = expenseKeys.reduce((acc, k) => acc + (Number(currentSpentMap[k]) || 0), 0);
    $: totalRemaining = Math.max(0, totalBudgetLimit - totalCurrentSpent);
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isBudgetModalOpen) closeBudgetModal(); }} />

{#if $isBudgetModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
    >
        <div class="modal-box budget-modal-box" role="document">
            <!-- MODAL HEADER -->
            <div class="budget-modal-header">
                <div class="header-icon-wrap">🎯</div>
                <div class="header-title-wrap">
                    <h3 id="budget-modal-title" class="budget-modal-title">Atur Batas Anggaran Kategori</h3>
                    <p class="budget-modal-sub">
                        Tentukan pagu batas pengeluaran bulanan untuk memicu sistem peringatan dini
                    </p>
                </div>
                <button
                    type="button"
                    class="modal-close-icon-btn"
                    on:click={closeBudgetModal}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <!-- SCOPE SELECTOR TABS -->
            <div class="budget-scope-rack">
                <button
                    type="button"
                    class="budget-scope-btn"
                    class:active={targetScope === 'base'}
                    on:click={() => targetScope = 'base'}
                >
                    <span>🌐</span> Standar Semua Bulan
                </button>
                <button
                    type="button"
                    class="budget-scope-btn"
                    class:active={targetScope === 'month'}
                    on:click={() => targetScope = 'month'}
                >
                    <span>📅</span> Khusus Bulan {formatMonth(activeMonthKey)}
                </button>
            </div>

            <!-- SUMMARY BANNER -->
            <div class="budget-summary-banner">
                <div class="summary-col">
                    <span class="sum-label">Total Pagu</span>
                    <strong class="sum-value font-mono">{formatRp(totalBudgetLimit)}</strong>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-col">
                    <span class="sum-label">Realisasi Belanja</span>
                    <strong class="sum-value text-exp font-mono">{formatRp(totalCurrentSpent)}</strong>
                </div>
                <div class="summary-divider"></div>
                <div class="summary-col">
                    <span class="sum-label">Sisa Dana</span>
                    <strong class="sum-value text-inc font-mono">{formatRp(totalRemaining)}</strong>
                </div>
            </div>

            <!-- CATEGORY BUDGET LIST -->
            <div class="budget-inputs-list">
                {#each expenseKeys as key}
                    {@const meta = CATEGORIES[key] || { name: key, icon: '📦', color: '#64748b' }}
                    {@const spent = Number(currentSpentMap[key]) || 0}
                    {@const limit = Number(localLimits[key]) || 0}
                    {@const pct = limit > 0 ? (spent / limit) * 100 : 0}
                    {@const isOver = limit > 0 && spent > limit}
                    
                    <div class="budget-row-card">
                        <div class="budget-row-top">
                            <div class="row-meta">
                                <span class="row-icon">{meta.icon}</span>
                                <div class="row-text">
                                    <span class="row-name">{meta.name}</span>
                                    <span class="row-spent">Terpakai: {formatRp(spent)}</span>
                                </div>
                            </div>

                            <!-- REALTIME THRESHOLD BADGE -->
                            {#if limit <= 0}
                                <span class="threshold-pill pill-gray">Tanpa Limit</span>
                            {:else if isOver}
                                <span class="threshold-pill pill-red">Overbudget ({pct.toFixed(0)}%)</span>
                            {:else if pct > 90}
                                <span class="threshold-pill pill-red">Kritis ({pct.toFixed(0)}%)</span>
                            {:else if pct >= 75}
                                <span class="threshold-pill pill-yellow">Waspada ({pct.toFixed(0)}%)</span>
                            {:else}
                                <span class="threshold-pill pill-green">Aman ({pct.toFixed(0)}%)</span>
                            {/if}
                        </div>

                        <!-- INPUT WITH QUICK BUTTONS -->
                        <div class="budget-input-group">
                            <div class="input-prefix-wrap">
                                <span class="input-prefix">Rp</span>
                                <input
                                    type="text"
                                    inputmode="numeric"
                                    class="budget-number-input font-mono"
                                    value={limit ? new Intl.NumberFormat('id-ID').format(limit) : ''}
                                    placeholder="0 (Tanpa Batas)"
                                    on:input={(e) => handleAmountChange(key, e)}
                                />
                            </div>

                            <div class="quick-adjust-rack">
                                <button type="button" class="quick-chip" on:click={() => addQuick(key, 200000)}>+200rb</button>
                                <button type="button" class="quick-chip" on:click={() => addQuick(key, 500000)}>+500rb</button>
                                <button type="button" class="quick-chip" on:click={() => addQuick(key, 1000000)}>+1jt</button>
                                <button type="button" class="quick-chip chip-clear" on:click={() => localLimits[key] = 0} title="Hapus Batas">✕</button>
                            </div>
                        </div>

                        <!-- MINI PROGRESS BAR (Green: <75%, Yellow: 75-90%, Red: >90%) -->
                        {#if limit > 0}
                            <div class="mini-bar-track">
                                <div
                                    class="mini-bar-fill"
                                    style="width: {Math.min(pct, 100)}%; background-color: {isOver || pct > 90 ? '#ef4444' : pct >= 75 ? '#f59e0b' : '#10b981'};"
                                ></div>
                            </div>
                        {/if}
                    </div>
                {/each}
            </div>

            <!-- MODAL ACTIONS -->
            <div class="budget-modal-actions">
                <button
                    type="button"
                    class="btn-reset-defaults"
                    on:click={handleResetDefault}
                    title="Kembalikan semua nilai ke standar awal"
                >
                    🔄 Reset Standar
                </button>
                <div class="action-right-group">
                    <button
                        type="button"
                        class="btn-secondary"
                        on:click={closeBudgetModal}
                    >
                        Batal
                    </button>
                    <button
                        type="button"
                        class="btn-primary"
                        on:click={handleSave}
                    >
                        💾 Simpan Anggaran
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    .budget-modal-box {
        max-width: 540px;
        width: 100%;
        text-align: left;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        padding: 22px 24px;
        border-radius: 24px;
    }

    .budget-modal-header {
        display: flex;
        align-items: flex-start;
        gap: 14px;
        position: relative;
        margin-bottom: 16px;
    }

    .header-icon-wrap {
        font-size: 28px;
        width: 44px;
        height: 44px;
        border-radius: 14px;
        background: var(--primary-light, rgba(37, 99, 235, 0.12));
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .header-title-wrap {
        flex: 1;
    }

    .budget-modal-title {
        font-size: 17px;
        font-weight: 800;
        margin: 0 0 3px 0;
        color: var(--text-dark);
        letter-spacing: -0.01em;
    }

    .budget-modal-sub {
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

    .budget-scope-rack {
        display: flex;
        gap: 8px;
        background: var(--input-bg, #0f172a);
        padding: 4px;
        border-radius: 12px;
        border: 1px solid var(--border-color);
        margin-bottom: 14px;
    }

    .budget-scope-btn {
        flex: 1;
        background: transparent;
        border: none;
        padding: 8px 10px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-gray);
        border-radius: 9px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s;
    }

    .budget-scope-btn.active {
        background: var(--primary);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    .budget-summary-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 10px 14px;
        margin-bottom: 14px;
    }

    .summary-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .sum-label {
        font-size: 10.5px;
        font-weight: 600;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.03em;
    }

    .sum-value {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--text-dark);
    }

    .summary-divider {
        width: 1px;
        height: 28px;
        background: var(--border-color);
    }

    .budget-inputs-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-y: auto;
        max-height: 48vh;
        padding-right: 4px;
        margin-bottom: 16px;
    }

    .budget-row-card {
        background: var(--input-bg, #0f172a);
        border: 1px solid var(--border-color);
        border-radius: 14px;
        padding: 10px 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: border-color 0.2s;
    }

    .budget-row-card:hover {
        border-color: rgba(255, 255, 255, 0.16);
    }

    .budget-row-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .row-meta {
        display: flex;
        align-items: center;
        gap: 9px;
    }

    .row-icon {
        font-size: 18px;
    }

    .row-text {
        display: flex;
        flex-direction: column;
    }

    .row-name {
        font-size: 13px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .row-spent {
        font-size: 11px;
        font-weight: 500;
        color: var(--text-muted);
    }

    .threshold-pill {
        font-size: 10.5px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 100px;
        letter-spacing: 0.02em;
        white-space: nowrap;
    }

    .pill-green {
        background: rgba(16, 185, 129, 0.16);
        color: #10b981;
    }

    .pill-yellow {
        background: rgba(245, 158, 11, 0.16);
        color: #f59e0b;
    }

    .pill-red {
        background: rgba(239, 68, 68, 0.16);
        color: #ef4444;
    }

    .pill-gray {
        background: rgba(148, 163, 184, 0.12);
        color: var(--text-muted);
    }

    .budget-input-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .input-prefix-wrap {
        display: flex;
        align-items: center;
        background: rgba(0, 0, 0, 0.18);
        border: 1px solid var(--border-color);
        border-radius: 10px;
        padding: 0 10px;
        flex: 1;
        transition: border-color 0.2s;
    }

    .input-prefix-wrap:focus-within {
        border-color: var(--primary);
    }

    .input-prefix {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        margin-right: 5px;
    }

    .budget-number-input {
        background: transparent;
        border: none;
        outline: none;
        font-size: 13px;
        font-weight: 700;
        color: var(--text-dark);
        width: 100%;
        padding: 7px 0;
    }

    .quick-adjust-rack {
        display: flex;
        gap: 4px;
        flex-shrink: 0;
    }

    .quick-chip {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-color);
        color: var(--text-gray);
        font-size: 10.5px;
        font-weight: 700;
        padding: 4px 7px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s;
    }

    .quick-chip:hover {
        background: var(--primary-light, rgba(37, 99, 235, 0.16));
        color: var(--primary, #3b82f6);
        border-color: var(--primary);
    }

    .chip-clear {
        color: var(--text-muted);
    }

    .chip-clear:hover {
        background: rgba(239, 68, 68, 0.15);
        color: #ef4444;
        border-color: #ef4444;
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

    .budget-modal-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding-top: 10px;
        border-top: 1px solid var(--border-color);
    }

    .btn-reset-defaults {
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 6px 8px;
        border-radius: 8px;
        transition: all 0.2s;
    }

    .btn-reset-defaults:hover {
        color: var(--text-gray);
        background: rgba(255, 255, 255, 0.06);
    }

    .action-right-group {
        display: flex;
        gap: 8px;
    }
</style>

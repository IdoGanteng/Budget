<script>
    import { filteredData, categoryBudgets, formatRp } from '../stores/financeStore.js';
    import { isCategoryBudgetsModalOpen, privacyMode } from '../stores/uiStore.js';

    $: catExpenses = $filteredData.catExpensesMap || {};
    $: budgets = $categoryBudgets || { makan: 1200000, belanja: 800000, transport: 500000, tagihan: 750000 };

    const categories = [
        { key: 'makan', name: 'Makan & Minum', icon: '🍔', defaultBudget: 1200000 },
        { key: 'belanja', name: 'Belanja', icon: '🛍️', defaultBudget: 800000 },
        { key: 'transport', name: 'Transportasi', icon: '🚗', defaultBudget: 500000 },
        { key: 'tagihan', name: 'Tagihan & Rumah', icon: '🏠', defaultBudget: 750000 },
        { key: 'hiburan', name: 'Hiburan & Hobi', icon: '🎮', defaultBudget: 400000 },
        { key: 'kesehatan', name: 'Kesehatan & Medis', icon: '💊', defaultBudget: 300000 }
    ];

    function getPercent(spent, max) {
        if (!max || max <= 0) return 0;
        return Math.min(Math.round((spent / max) * 100), 100);
    }

    function getProgressColor(pct) {
        if (pct >= 90) return '#f43f5e';
        if (pct >= 75) return '#f59e0b';
        return '#10b981';
    }

    function getCategoryStatus(spent, max) {
        const remaining = max - spent;
        if (remaining <= 0) {
            return { text: 'Batas tercapai', type: 'danger' };
        }
        return { text: `Sisa ${formatRp(remaining, $privacyMode)}`, type: 'normal' };
    }
</script>

<div class="glass-panel section-category-budgets" style="padding: 18px 16px; margin-bottom: 16px;">
    <!-- HEADER -->
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">🎯</span>
            <div>
                <h3 style="margin: 0; font-size: 15.5px; font-weight: 800; color: var(--text-dark);">
                    Anggaran Bulanan
                </h3>
                <p style="margin: 0; font-size: 11.5px; color: var(--text-gray);">
                    Pantau batas pengeluaran kategori dengan tenang
                </p>
            </div>
        </div>

        <button
            type="button"
            on:click={() => isCategoryBudgetsModalOpen.set(true)}
            class="manage-users-pill-btn"
            title="Ubah batas anggaran bulanan"
            style="font-size: 11.5px; padding: 6px 12px;"
        >
            <span>⚙️ Atur Batas</span>
        </button>
    </div>

    <!-- CATEGORY BARS LIST -->
    <div style="display: flex; flex-direction: column; gap: 12px;">
        {#each categories as cat}
            {@const spent = catExpenses[cat.key] || 0}
            {@const max = budgets[cat.key] || cat.defaultBudget}
            {@const pct = getPercent(spent, max)}
            {@const status = getCategoryStatus(spent, max)}
            {@const barColor = getProgressColor(pct)}

            <div style="background: var(--list-bg); border: 1px solid var(--border-color); border-radius: 14px; padding: 10px 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 7px;">
                        <span style="font-size: 15px;">{cat.icon}</span>
                        <span style="font-size: 13px; font-weight: 700; color: var(--text-dark);">{cat.name}</span>
                    </div>

                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 11px; font-weight: 700; color: {status.type === 'danger' ? 'var(--expense)' : 'var(--text-gray)'};">
                            {status.text}
                        </span>
                        <span style="font-size: 11.5px; font-weight: 800; color: {barColor}; background: {barColor}15; padding: 1px 6px; border-radius: 6px;">
                            {pct}%
                        </span>
                    </div>
                </div>

                <!-- PROGRESS BAR -->
                <div class="budget-bar-track" style="height: 6px; border-radius: 6px; background: rgba(0,0,0,0.08); overflow: hidden;">
                    <div
                        class="budget-bar-fill"
                        style="width: {pct}%; height: 100%; border-radius: 6px; background: {barColor}; transition: width 0.35s ease;"
                    ></div>
                </div>

                <div style="display: flex; justify-content: space-between; font-size: 10.5px; color: var(--text-gray); margin-top: 4px;">
                    <span>Terpakai: <strong style="color: var(--text-dark);">{formatRp(spent, $privacyMode)}</strong></span>
                    <span>Batas: <strong style="color: var(--text-dark);">{formatRp(max, $privacyMode)}</strong></span>
                </div>
            </div>
        {/each}
    </div>
</div>

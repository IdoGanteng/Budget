<script>
    import { onMount, onDestroy } from 'svelte';
    import Chart from 'chart.js/auto';
    import { filteredData, formatRp, selectedMonth, monthsList } from '../stores/financeStore.js';
    import { usersList } from '../stores/authStore.js';
    import { theme, activeTab } from '../stores/uiStore.js';

    const INDO_MONTHS = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    function formatMonthLabel(mKey) {
        if (!mKey || mKey === 'all') return 'Semua Periode';
        const parts = mKey.split('/');
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            const y = parts[1];
            return `${INDO_MONTHS[m] || parts[0]} ${y}`;
        }
        return mKey;
    }

    let financeCanvas;
    let comparisonCanvas;
    let userExpenseCanvas;

    let financeChart = null;
    let comparisonChart = null;
    let userChart = null;

    $: totals = $filteredData.totals;
    $: filteredInc = $filteredData.filteredInc;
    $: filteredExp = $filteredData.filteredExp;
    $: userExpenses = $filteredData.userExpensesMap || {};
    $: userCounts = $filteredData.userCountsMap || {};
    $: currentTheme = $theme;
    $: users = $usersList || [];

    $: netCashflow = filteredInc - filteredExp;
    $: isSurplus = filteredInc >= filteredExp;
    $: savingsRate = filteredInc > 0 ? Math.max(0, ((filteredInc - filteredExp) / filteredInc) * 100) : 0;

    $: totalUserSpending = Object.values(userExpenses).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    $: computedPockets = $filteredData.computedPockets || [];
    $: activePocketsCount = computedPockets.filter(p => p.amount > 0).length;

    // Reactively re-render charts when data, filter, or theme changes
    $: if ((financeCanvas || comparisonCanvas || userExpenseCanvas) && totals !== undefined && currentTheme) {
        renderCharts();
    }

    function renderCharts() {
        const isDark = currentTheme === 'dark';
        const legendColor = isDark ? '#f8fafc' : '#0f172a';
        const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

        // 1. Asset Allocation Chart
        if (financeCanvas) {
            const ctx1 = financeCanvas.getContext('2d');
            if (financeChart) financeChart.destroy();

            const activePockets = computedPockets.filter(p => p.amount > 0);
            const displayList = activePockets.length > 0 ? activePockets : computedPockets;

            const labels = displayList.map(p => p.name);
            const data = displayList.map(p => Math.max(0, p.amount));
            const backgroundColor = displayList.map(p => p.color);

            financeChart = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor,
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                                padding: 12,
                                boxWidth: 8,
                                boxHeight: 8,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 4,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.label}: ${formatRp(context.raw || 0)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 2. Arus Kas Chart
        if (comparisonCanvas) {
            const ctx2 = comparisonCanvas.getContext('2d');
            if (comparisonChart) comparisonChart.destroy();
            comparisonChart = new Chart(ctx2, {
                type: 'bar',
                data: {
                    labels: ['Arus Kas'],
                    datasets: [
                        { label: 'Pemasukan', data: [filteredInc], backgroundColor: '#10b981', borderRadius: 8, maxBarThickness: 42 },
                        { label: 'Pengeluaran', data: [filteredExp], backgroundColor: '#f43f5e', borderRadius: 8, maxBarThickness: 42 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '700', size: 12 }
                            }
                        },
                        y: {
                            grid: { color: gridCol },
                            ticks: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '500' },
                                callback: function(value) {
                                    if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                                    if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                                    return value;
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                                boxWidth: 8,
                                boxHeight: 8,
                                padding: 12,
                                usePointStyle: true,
                                pointStyle: 'circle'
                            }
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 4,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    return ` ${context.dataset.label}: ${formatRp(context.raw)}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // 3. User Expense Chart
        if (userExpenseCanvas) {
            const ctx3 = userExpenseCanvas.getContext('2d');
            const uNames = Object.keys(userExpenses);
            const uAmounts = Object.values(userExpenses);
            const defaultPalette = ['#6366f1', '#ec4899', '#0ea5e9', '#f59e0b', '#10b981', '#a855f7', '#f97316'];
            
            const uBackgroundColors = uNames.map((name, idx) => {
                const uObj = users.find(u => u.name === name);
                return (uObj && uObj.color) || defaultPalette[idx % defaultPalette.length];
            });

            if (userChart) userChart.destroy();
            userChart = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: uNames.length > 0 ? uNames : ['Belum Ada Pengeluaran'],
                    datasets: [{
                        data: uAmounts.length > 0 ? uAmounts : [1],
                        backgroundColor: uAmounts.length > 0 ? uBackgroundColors : ['rgba(148, 163, 184, 0.2)'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '70%',
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            backgroundColor: isDark ? '#0f172a' : '#ffffff',
                            titleColor: isDark ? '#ffffff' : '#0f172a',
                            bodyColor: isDark ? '#cbd5e1' : '#334155',
                            borderColor: isDark ? 'rgba(255,255,255,0.1)' : '#e2e8f0',
                            borderWidth: 1,
                            padding: 10,
                            boxPadding: 4,
                            usePointStyle: true,
                            callbacks: {
                                label: function(context) {
                                    if (uAmounts.length === 0) return ' Belum ada data';
                                    return ` ${context.label}: ${formatRp(context.raw || 0)}`;
                                }
                            }
                        }
                    }
                }
            });
        }
    }

    onMount(() => {
        setTimeout(renderCharts, 100);
    });

    onDestroy(() => {
        if (financeChart) financeChart.destroy();
        if (comparisonChart) comparisonChart.destroy();
        if (userChart) userChart.destroy();
    });
</script>

<div class="analytics-page-container">
    <!-- 1. HEADER & TOP ACTIONS -->
    <div class="analytics-header">
        <div class="analytics-header-titles">
            <h1 class="analytics-main-title">
                <span class="title-icon">📊</span>
                <span>Laporan &amp; Analisa Finansial</span>
            </h1>
            <p class="analytics-main-subtitle">
                Visualisasi arus kas bulanan, alokasi portofolio, dan evaluasi kesehatan finansial.
            </p>
        </div>
        <div class="analytics-header-actions">
            <!-- Period / Month Selector -->
            <div class="analytics-period-wrapper">
                <span class="period-select-icon">📅</span>
                <select class="analytics-period-select" bind:value={$selectedMonth} title="Pilih Periode Analisa">
                    <option value="all">Semua Periode</option>
                    {#each $monthsList as m}
                        <option value={m}>{formatMonthLabel(m)}</option>
                    {/each}
                </select>
            </div>

            <!-- Cetak Laporan Button -->
            <button
                type="button"
                class="analytics-action-btn"
                on:click={() => activeTab.set('report')}
                title="Buka Lembar Cetak Laporan A4 Lengkap"
            >
                <svg class="action-btn-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M6 9V2h12v7"></path>
                    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                    <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                <span>Cetak Laporan (A4)</span>
            </button>
        </div>
    </div>

    <!-- 2. CHART CARDS (ARUS KAS & PORTOFOLIO) -->
    <div class="analytics-charts-grid">
        <!-- Card 1: Alokasi Portofolio -->
        <div class="analytics-card">
            <div class="card-header">
                <div class="header-left">
                    <h2 class="card-title">Alokasi Portofolio</h2>
                    <p class="card-desc">Komposisi sebaran saldo antar kantong</p>
                </div>
                <div class="card-header-tags">
                    {#if totals?.totalWealth}
                        <span class="card-tag tag-wealth">{formatRp(totals.totalWealth)}</span>
                    {/if}
                    {#if activePocketsCount > 0}
                        <span class="card-tag">{activePocketsCount} Kantong Aktif</span>
                    {/if}
                </div>
            </div>
            <div class="chart-canvas-wrapper">
                <canvas bind:this={financeCanvas}></canvas>
            </div>
        </div>

        <!-- Card 2: Arus Kas -->
        <div class="analytics-card">
            <div class="card-header">
                <div class="header-left">
                    <h2 class="card-title">Arus Kas ({$selectedMonth === 'all' ? 'Semua Periode' : formatMonthLabel($selectedMonth)})</h2>
                    <p class="card-desc">Perbandingan total masuk vs keluar</p>
                </div>
                <span class="card-tag {isSurplus ? 'tag-surplus' : 'tag-deficit'}">
                    {isSurplus ? '+' : ''}{formatRp(netCashflow)}
                </span>
            </div>
            <div class="chart-canvas-wrapper">
                <canvas bind:this={comparisonCanvas}></canvas>
            </div>
        </div>
    </div>

    <!-- 3. MULTI-USER EXPENSE COMPARISON SECTION -->
    <div class="analytics-card section-multiuser">
        <div class="card-header">
            <div class="header-left">
                <div class="title-with-badge">
                    <h2 class="card-title">👥 Pengeluaran Antar Pengguna</h2>
                    <span class="pill-badge">Multi-User</span>
                </div>
                <p class="card-desc">Distribusi pengeluaran riil periode {$selectedMonth === 'all' ? 'semua waktu' : formatMonthLabel($selectedMonth)}</p>
            </div>
            {#if totalUserSpending > 0}
                <div class="total-spending-badge">
                    <span class="spending-label">Total Beban:</span>
                    <span class="spending-val">{formatRp(totalUserSpending)}</span>
                </div>
            {/if}
        </div>

        {#if Object.keys(userExpenses).length === 0}
            <div class="empty-state-box">
                <span class="empty-icon">👥</span>
                <p class="empty-text">Belum ada data pengeluaran antar pengguna pada filter ini.</p>
            </div>
        {:else}
            <div class="multiuser-content-layout">
                <!-- Donut chart on the left -->
                <div class="multiuser-chart-col">
                    <div class="user-chart-wrapper">
                        <canvas bind:this={userExpenseCanvas}></canvas>
                    </div>
                    <div class="chart-sub-caption">
                        <span>Porsi Pengeluaran Anggota</span>
                    </div>
                </div>

                <!-- Vertically aligned flex-column for user stats on the right -->
                <div class="multiuser-stats-col">
                    {#each Object.entries(userExpenses) as [name, amount]}
                        {@const uObj = users.find(u => u.name === name) || { avatar: '👤', color: '#2563eb' }}
                        {@const count = userCounts[name] || 0}
                        {@const pct = totalUserSpending > 0 ? Math.round((amount / totalUserSpending) * 100) : 0}
                        <div class="user-stat-card">
                            <!-- [Avatar] Name in one row -->
                            <div class="user-stat-header">
                                <div class="user-avatar-badge" style="background: {uObj.color || '#2563eb'};">
                                    {#if uObj.picture}
                                        <img src={uObj.picture} alt={name} class="user-avatar-img" />
                                    {:else}
                                        <span class="user-avatar-text">{uObj.avatar || name.charAt(0).toUpperCase()}</span>
                                    {/if}
                                </div>
                                <span class="user-stat-name">{name}</span>
                                <span class="user-pct-badge">{pct}%</span>
                            </div>

                            <!-- Massive, bold font for the total amount -->
                            <div class="user-stat-amount">
                                {formatRp(amount)}
                            </div>

                            <!-- Subtle muted text for the transaction count -->
                            <div class="user-stat-count">
                                {count} kali pengeluaran
                            </div>
                        </div>
                    {/each}
                </div>
            </div>
        {/if}
    </div>

    <!-- 4. SMART FINANCIAL INSIGHT WIDGET -->
    <div class="analytics-card section-insights">
        <div class="card-header">
            <div class="header-left">
                <div class="title-with-badge">
                    <h2 class="card-title">📈 Smart Financial Insights</h2>
                    <span class="pill-badge badge-ai">✦ AI Financial Health</span>
                </div>
                <p class="card-desc">Evaluasi kesehatan finansial otomatis dan strategi pengelolaan anggaran</p>
            </div>
        </div>

        {#if filteredInc === 0 && filteredExp === 0}
            <div class="empty-state-box">
                <span class="empty-icon">📊</span>
                <p class="empty-text">Belum ada data transaksi yang cukup untuk dianalisa pada bulan ini.</p>
            </div>
        {:else}
            <!-- Metrics Tiles -->
            <div class="insight-metrics-grid">
                <!-- Metric 1: Status Arus Kas -->
                <div class="insight-tile">
                    <span class="tile-label">Status Arus Kas</span>
                    <div class="tile-status-row">
                        {#if isSurplus}
                            <span class="status-pill status-surplus">
                                <span class="pulse-dot dot-surplus"></span>
                                SURPLUS (Sehat)
                            </span>
                        {:else}
                            <span class="status-pill status-deficit">
                                <span class="pulse-dot dot-deficit"></span>
                                DEFISIT (Perlu Evaluasi)
                            </span>
                        {/if}
                    </div>
                    <span class="tile-subtext">
                        {isSurplus ? 'Pemasukan melampaui pengeluaran bulan ini' : 'Pengeluaran melebihi pemasukan bulan ini'}
                    </span>
                </div>

                <!-- Metric 2: Rasio Tabungan / Sisa -->
                <div class="insight-tile">
                    <span class="tile-label">Rasio Sisa / Tabungan</span>
                    <div class="tile-main-stat">
                        <span class="tile-number text-savings">{savingsRate.toFixed(1)}%</span>
                    </div>
                    <div class="progress-bar-wrap">
                        <div class="progress-bar-fill" style="width: {Math.min(savingsRate, 100)}%;"></div>
                    </div>
                    <span class="tile-subtext">Dari pemasukan dialokasikan ke sisa kas/tabungan</span>
                </div>

                <!-- Metric 3: Arus Kas Bersih (Net) -->
                <div class="insight-tile">
                    <span class="tile-label">Arus Kas Bersih (Net)</span>
                    <div class="tile-main-stat">
                        <span class="tile-number {isSurplus ? 'text-income' : 'text-expense'}">
                            {isSurplus ? '+' : ''}{formatRp(netCashflow)}
                        </span>
                    </div>
                    <span class="tile-subtext">
                        {isSurplus ? 'Akumulasi cadangan kas positif' : 'Defisit neraca berjalan bulan ini'}
                    </span>
                </div>
            </div>

            <!-- AI-Style Tip / Rekomendasi Finansial -->
            <div class="ai-tip-box">
                <div class="ai-tip-header">
                    <div class="ai-icon-bubble">💡</div>
                    <div class="ai-header-content">
                        <h3 class="ai-tip-title">Rekomendasi Finansial</h3>
                        <span class="ai-tip-tag">✦ Analisa Otomatis</span>
                    </div>
                </div>
                <div class="ai-tip-body">
                    <p class="ai-tip-text">
                        {#if isSurplus}
                            <strong>Arus kas Anda dalam kondisi prima!</strong> Pemasukan Anda berhasil menutup seluruh kebutuhan operasional dengan surplus <strong>{formatRp(netCashflow)}</strong> ({savingsRate.toFixed(1)}% rasio simpanan). Pertahankan kedisiplinan pencatatan ini dan pertimbangkan untuk mengalokasikan surplus ke kantong simpanan darurat atau akumulasi aset emas.
                        {:else}
                            <strong>Perhatian: Arus kas bulan ini mengalami defisit sebesar {formatRp(Math.abs(netCashflow))}.</strong> Total pengeluaran melebihi kapasitas arus kas masuk. Disarankan untuk segera meninjau pos pengeluaran tersier (seperti belanja konsumtif &amp; hiburan), menunda pembelian impulsif, dan memprioritaskan alokasi dana pada pos kebutuhan pokok hingga rasio arus kas kembali seimbang.
                        {/if}
                    </p>
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    /* ==========================================================================
       CONTAINER & TYPOGRAPHY FOUNDATION
       ========================================================================== */
    .analytics-page-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding-bottom: 32px;
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    /* ==========================================================================
       1. HEADER & TOP ACTIONS
       ========================================================================== */
    .analytics-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 16px;
        margin-bottom: 4px;
    }

    .analytics-header-titles {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .analytics-main-title {
        margin: 0;
        font-size: 22px;
        font-weight: 800;
        letter-spacing: -0.02em;
        display: flex;
        align-items: center;
        gap: 8px;
        color: #0f172a;
    }

    :global(html.dark) .analytics-main-title,
    :global([data-theme="dark"]) .analytics-main-title {
        color: #ffffff;
    }

    .title-icon {
        font-size: 22px;
        line-height: 1;
    }

    .analytics-main-subtitle {
        margin: 0;
        font-size: 13.5px;
        font-weight: 500;
        color: #475569;
        line-height: 1.45;
    }

    :global(html.dark) .analytics-main-subtitle,
    :global([data-theme="dark"]) .analytics-main-subtitle {
        color: #94a3b8;
    }

    .analytics-header-actions {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .analytics-period-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
    }

    .period-select-icon {
        position: absolute;
        left: 12px;
        pointer-events: none;
        font-size: 14px;
        line-height: 1;
        z-index: 2;
    }

    .analytics-period-select {
        appearance: none;
        -webkit-appearance: none;
        padding: 8px 32px 8px 34px !important;
        min-height: 38px !important;
        border-radius: 12px !important;
        font-size: 13px !important;
        font-weight: 700 !important;
        font-family: inherit !important;
        cursor: pointer;
        background: #ffffff !important;
        border: 1px solid #cbd5e1 !important;
        color: #0f172a !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 10px center !important;
        background-size: 12px !important;
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    :global(html.dark) .analytics-period-select,
    :global([data-theme="dark"]) .analytics-period-select {
        background: #161f30 !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        color: #f8fafc !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") !important;
        background-repeat: no-repeat !important;
        background-position: right 10px center !important;
        background-size: 12px !important;
    }

    .analytics-period-select:hover,
    .analytics-period-select:focus {
        border-color: #2563eb !important;
        outline: none;
    }

    /* Outlined Premium Action Button */
    .analytics-action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 9px 18px;
        border-radius: 12px;
        font-size: 13px;
        font-weight: 700;
        font-family: inherit;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        background: #ffffff;
        border: 1px solid #cbd5e1;
        color: #0f172a;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    }

    .analytics-action-btn:hover {
        background: #f8fafc;
        border-color: #2563eb;
        color: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
    }

    .analytics-action-btn:active {
        transform: translateY(0);
    }

    :global(html.dark) .analytics-action-btn,
    :global([data-theme="dark"]) .analytics-action-btn {
        background: #161f30;
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #f8fafc;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    }

    :global(html.dark) .analytics-action-btn:hover,
    :global([data-theme="dark"]) .analytics-action-btn:hover {
        background: #1e293b;
        border-color: #3b82f6;
        color: #60a5fa;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.25);
    }

    .action-btn-icon {
        flex-shrink: 0;
        stroke: currentColor;
    }

    /* ==========================================================================
       SHARED PREMIUM CARD CONTAINER (SEAMLESS BANK JAGO STYLE)
       ========================================================================== */
    .analytics-card {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 20px;
        padding: 22px;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
        transition: border-color 0.2s ease, box-shadow 0.2s ease;
        box-sizing: border-box;
        width: 100%;
    }

    :global(html.dark) .analytics-card,
    :global([data-theme="dark"]) .analytics-card {
        background: #161f30;
        border: 1px solid rgba(255, 255, 255, 0.07);
        box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        margin-bottom: 18px;
    }

    .header-left {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }

    .title-with-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .card-title {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: #0f172a;
        letter-spacing: -0.01em;
    }

    :global(html.dark) .card-title,
    :global([data-theme="dark"]) .card-title {
        color: #ffffff;
    }

    .card-desc {
        margin: 0;
        font-size: 12.5px;
        font-weight: 500;
        color: #64748b;
    }

    :global(html.dark) .card-desc,
    :global([data-theme="dark"]) .card-desc {
        color: #94a3b8;
    }

    .card-header-tags {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
    }

    .card-tag {
        font-size: 11.5px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 100px;
        background: #f1f5f9;
        color: #334155;
        border: 1px solid #e2e8f0;
        white-space: nowrap;
    }

    :global(html.dark) .card-tag,
    :global([data-theme="dark"]) .card-tag {
        background: rgba(255, 255, 255, 0.06);
        color: #cbd5e1;
        border-color: rgba(255, 255, 255, 0.08);
    }

    .tag-wealth {
        background: #eff6ff !important;
        color: #1d4ed8 !important;
        border-color: #bfdbfe !important;
    }

    :global(html.dark) .tag-wealth,
    :global([data-theme="dark"]) .tag-wealth {
        background: rgba(37, 99, 235, 0.15) !important;
        color: #60a5fa !important;
        border-color: rgba(59, 130, 246, 0.3) !important;
    }

    .tag-surplus {
        background: #ecfdf5 !important;
        color: #047857 !important;
        border-color: #a7f3d0 !important;
    }

    :global(html.dark) .tag-surplus,
    :global([data-theme="dark"]) .tag-surplus {
        background: rgba(16, 185, 129, 0.15) !important;
        color: #34d399 !important;
        border-color: rgba(52, 211, 153, 0.3) !important;
    }

    .tag-deficit {
        background: #fef2f2 !important;
        color: #b91c1c !important;
        border-color: #fecaca !important;
    }

    :global(html.dark) .tag-deficit,
    :global([data-theme="dark"]) .tag-deficit {
        background: rgba(244, 63, 94, 0.15) !important;
        color: #fb7185 !important;
        border-color: rgba(251, 113, 133, 0.3) !important;
    }

    .pill-badge {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 9px;
        border-radius: 100px;
        background: #eff6ff;
        color: #1d4ed8;
        border: 1px solid #bfdbfe;
    }

    :global(html.dark) .pill-badge,
    :global([data-theme="dark"]) .pill-badge {
        background: rgba(37, 99, 235, 0.15);
        color: #60a5fa;
        border-color: rgba(59, 130, 246, 0.3);
    }

    .badge-ai {
        background: #f5f3ff !important;
        color: #6d28d9 !important;
        border-color: #ddd6fe !important;
    }

    :global(html.dark) .badge-ai,
    :global([data-theme="dark"]) .badge-ai {
        background: rgba(139, 92, 246, 0.18) !important;
        color: #c084fc !important;
        border-color: rgba(168, 85, 247, 0.3) !important;
    }

    /* ==========================================================================
       2. CHARTS GRID (ARUS KAS & PORTOFOLIO)
       ========================================================================== */
    .analytics-charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 18px;
    }

    .chart-canvas-wrapper {
        height: 220px;
        position: relative;
        width: 100%;
    }

    /* ==========================================================================
       3. MULTI-USER SECTION (LAYOUT REFINEMENT)
       ========================================================================== */
    .section-multiuser {
        margin-top: 2px;
    }

    .total-spending-badge {
        display: flex;
        align-items: baseline;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 12px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
    }

    :global(html.dark) .total-spending-badge,
    :global([data-theme="dark"]) .total-spending-badge {
        background: rgba(15, 23, 42, 0.6);
        border-color: rgba(255, 255, 255, 0.08);
    }

    .spending-label {
        font-size: 11.5px;
        font-weight: 600;
        color: #64748b;
    }

    :global(html.dark) .spending-label,
    :global([data-theme="dark"]) .spending-label {
        color: #94a3b8;
    }

    .spending-val {
        font-size: 13.5px;
        font-weight: 800;
        color: #0f172a;
    }

    :global(html.dark) .spending-val,
    :global([data-theme="dark"]) .spending-val {
        color: #ffffff;
    }

    .multiuser-content-layout {
        display: grid;
        grid-template-columns: 240px 1fr;
        gap: 28px;
        align-items: center;
    }

    @media (max-width: 768px) {
        .multiuser-content-layout {
            grid-template-columns: 1fr;
            gap: 20px;
        }
    }

    .multiuser-chart-col {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .user-chart-wrapper {
        height: 190px;
        width: 100%;
        max-width: 220px;
        position: relative;
    }

    .chart-sub-caption {
        font-size: 11.5px;
        font-weight: 600;
        color: #64748b;
        text-align: center;
    }

    :global(html.dark) .chart-sub-caption,
    :global([data-theme="dark"]) .chart-sub-caption {
        color: #94a3b8;
    }

    /* Right Column: Clean Vertically Aligned Flex-Column for User Stats */
    .multiuser-stats-col {
        display: flex;
        flex-direction: column;
        gap: 12px;
        justify-content: center;
        width: 100%;
    }

    .user-stat-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .user-stat-card:hover {
        background: #ffffff;
        border-color: #cbd5e1;
        box-shadow: 0 4px 12px rgba(15, 23, 42, 0.05);
        transform: translateX(2px);
    }

    :global(html.dark) .user-stat-card,
    :global([data-theme="dark"]) .user-stat-card {
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    :global(html.dark) .user-stat-card:hover,
    :global([data-theme="dark"]) .user-stat-card:hover {
        background: rgba(30, 41, 59, 0.7);
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    }

    /* 1. [Avatar] Name in one row */
    .user-stat-header {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .user-avatar-badge {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        color: #ffffff;
        font-weight: 800;
        font-size: 12px;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
    }

    .user-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .user-stat-name {
        font-size: 13.5px;
        font-weight: 700;
        color: #1e293b;
        letter-spacing: -0.01em;
    }

    :global(html.dark) .user-stat-name,
    :global([data-theme="dark"]) .user-stat-name {
        color: #f1f5f9;
    }

    .user-pct-badge {
        margin-left: auto;
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 100px;
        background: #e2e8f0;
        color: #334155;
    }

    :global(html.dark) .user-pct-badge,
    :global([data-theme="dark"]) .user-pct-badge {
        background: rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
    }

    /* 2. Massive, bold font for the total amount */
    .user-stat-amount {
        font-size: 22px;
        font-weight: 900;
        color: #0f172a;
        letter-spacing: -0.03em;
        line-height: 1.2;
    }

    :global(html.dark) .user-stat-amount,
    :global([data-theme="dark"]) .user-stat-amount {
        color: #ffffff;
    }

    /* 3. Subtle muted text for the transaction count */
    .user-stat-count {
        font-size: 12.5px;
        font-weight: 500;
        color: #64748b;
    }

    :global(html.dark) .user-stat-count,
    :global([data-theme="dark"]) .user-stat-count {
        color: #94a3b8;
    }

    /* Empty state */
    .empty-state-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 36px 16px;
        text-align: center;
        color: #64748b;
    }

    :global(html.dark) .empty-state-box,
    :global([data-theme="dark"]) .empty-state-box {
        color: #94a3b8;
    }

    .empty-icon {
        font-size: 28px;
    }

    .empty-text {
        margin: 0;
        font-size: 13.5px;
        font-weight: 500;
    }

    /* ==========================================================================
       4. SMART FINANCIAL INSIGHTS WIDGET
       ========================================================================== */
    .section-insights {
        display: flex;
        flex-direction: column;
        gap: 18px;
    }

    .insight-metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
    }

    .insight-tile {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    :global(html.dark) .insight-tile,
    :global([data-theme="dark"]) .insight-tile {
        background: rgba(15, 23, 42, 0.55);
        border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .tile-label {
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #64748b;
    }

    :global(html.dark) .tile-label,
    :global([data-theme="dark"]) .tile-label {
        color: #94a3b8;
    }

    .tile-status-row {
        display: flex;
        align-items: center;
        padding: 2px 0;
    }

    /* Status Pill (Elevated Badge) */
    .status-pill {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 13px;
        border-radius: 100px;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: -0.01em;
    }

    .status-surplus {
        background: #ecfdf5;
        color: #047857;
        border: 1px solid #a7f3d0;
    }

    :global(html.dark) .status-surplus,
    :global([data-theme="dark"]) .status-surplus {
        background: rgba(16, 185, 129, 0.16);
        color: #34d399;
        border: 1px solid rgba(52, 211, 153, 0.3);
    }

    .status-deficit {
        background: #fef2f2;
        color: #b91c1c;
        border: 1px solid #fecaca;
    }

    :global(html.dark) .status-deficit,
    :global([data-theme="dark"]) .status-deficit {
        background: rgba(244, 63, 94, 0.16);
        color: #fb7185;
        border: 1px solid rgba(251, 113, 133, 0.3);
    }

    .pulse-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        display: inline-block;
    }

    .dot-surplus {
        background: #10b981;
        box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.35);
    }

    .dot-deficit {
        background: #f43f5e;
        box-shadow: 0 0 0 2px rgba(244, 63, 94, 0.35);
    }

    .tile-main-stat {
        display: flex;
        align-items: baseline;
    }

    .tile-number {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.02em;
    }

    .text-savings {
        color: #2563eb;
    }

    :global(html.dark) .text-savings,
    :global([data-theme="dark"]) .text-savings {
        color: #60a5fa;
    }

    .text-income {
        color: #059669;
    }

    :global(html.dark) .text-income,
    :global([data-theme="dark"]) .text-income {
        color: #34d399;
    }

    .text-expense {
        color: #e11d48;
    }

    :global(html.dark) .text-expense,
    :global([data-theme="dark"]) .text-expense {
        color: #fb7185;
    }

    .progress-bar-wrap {
        width: 100%;
        height: 6px;
        background: #e2e8f0;
        border-radius: 100px;
        overflow: hidden;
        margin-top: 2px;
    }

    :global(html.dark) .progress-bar-wrap,
    :global([data-theme="dark"]) .progress-bar-wrap {
        background: rgba(255, 255, 255, 0.1);
    }

    .progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #2563eb);
        border-radius: 100px;
        transition: width 0.4s ease;
    }

    .tile-subtext {
        font-size: 11.5px;
        font-weight: 500;
        color: #64748b;
        line-height: 1.4;
    }

    :global(html.dark) .tile-subtext,
    :global([data-theme="dark"]) .tile-subtext {
        color: #94a3b8;
    }

    /* AI Financial Recommendation Box */
    .ai-tip-box {
        background: #eff6ff;
        border: 1px solid #bfdbfe;
        border-radius: 18px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 12px;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.05);
    }

    :global(html.dark) .ai-tip-box,
    :global([data-theme="dark"]) .ai-tip-box {
        background: rgba(30, 58, 138, 0.22);
        border: 1px solid rgba(59, 130, 246, 0.28);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }

    .ai-tip-header {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .ai-icon-bubble {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        background: #dbeafe;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        flex-shrink: 0;
        box-shadow: 0 2px 6px rgba(37, 99, 235, 0.15);
    }

    :global(html.dark) .ai-icon-bubble,
    :global([data-theme="dark"]) .ai-icon-bubble {
        background: rgba(37, 99, 235, 0.35);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }

    .ai-header-content {
        display: flex;
        align-items: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .ai-tip-title {
        margin: 0;
        font-size: 15.5px;
        font-weight: 800;
        color: #1e3a8a;
        letter-spacing: -0.01em;
    }

    :global(html.dark) .ai-tip-title,
    :global([data-theme="dark"]) .ai-tip-title {
        color: #93c5fd;
    }

    .ai-tip-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 100px;
        background: #dbeafe;
        color: #1d4ed8;
    }

    :global(html.dark) .ai-tip-tag,
    :global([data-theme="dark"]) .ai-tip-tag {
        background: rgba(59, 130, 246, 0.25);
        color: #bfdbfe;
    }

    .ai-tip-body {
        padding-left: 2px;
    }

    .ai-tip-text {
        margin: 0;
        font-size: 13.5px;
        font-weight: 500;
        line-height: 1.65;
        color: #1e293b;
    }

    :global(html.dark) .ai-tip-text,
    :global([data-theme="dark"]) .ai-tip-text {
        color: #e2e8f0;
    }

    .ai-tip-text strong {
        font-weight: 700;
        color: #0f172a;
    }

    :global(html.dark) .ai-tip-text strong,
    :global([data-theme="dark"]) .ai-tip-text strong {
        color: #ffffff;
    }
</style>

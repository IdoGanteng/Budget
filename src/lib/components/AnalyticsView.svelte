<script>
    import { onMount, onDestroy } from 'svelte';
    import Chart from 'chart.js/auto';
    import { filteredData, formatRp } from '../stores/financeStore.js';
    import { usersList } from '../stores/authStore.js';
    import { theme } from '../stores/uiStore.js';

    let financeCanvas;
    let comparisonCanvas;
    let userExpenseCanvas;

    let financeChart = null;
    let comparisonChart = null;
    let userChart = null;

    $: totals = $filteredData.totals;
    $: filteredInc = $filteredData.filteredInc;
    $: filteredExp = $filteredData.filteredExp;
    $: userExpenses = $filteredData.userExpensesMap;
    $: userCounts = $filteredData.userCountsMap;
    $: currentTheme = $theme;
    $: users = $usersList;

    $: netCashflow = filteredInc - filteredExp;
    $: isSurplus = filteredInc >= filteredExp;
    $: savingsRate = filteredInc > 0 ? Math.max(0, ((filteredInc - filteredExp) / filteredInc) * 100) : 0;

    // Reactively re-render charts when data changes
    $: if (financeCanvas && comparisonCanvas && totals) {
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
            financeChart = new Chart(ctx1, {
                type: 'doughnut',
                data: {
                    labels: ['Kas', 'Simpanan', 'Pribadi', 'Tring', 'Jago'],
                    datasets: [{
                        data: [
                            totals.cash > 0 ? totals.cash : 0,
                            totals.totalSimAll,
                            totals.totalPriAll,
                            totals.totalTrgRp,
                            totals.totalJagAll
                        ],
                        backgroundColor: ['#34d399', '#c084fc', '#FF7A00', '#FDB813', '#fb923c'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '68%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 12 },
                                padding: 10,
                                boxWidth: 10,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
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
                        { label: 'Masuk', data: [filteredInc], backgroundColor: '#34d399', borderRadius: 8, maxBarThickness: 40 },
                        { label: 'Keluar', data: [filteredExp], backgroundColor: '#fb7185', borderRadius: 8, maxBarThickness: 40 }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            grid: { display: false },
                            ticks: { color: legendColor, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } }
                        },
                        y: {
                            grid: { color: gridCol },
                            ticks: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
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
                            position: 'top',
                            labels: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                                boxWidth: 10,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
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
            const uColors = ['#818cf8', '#f472b6', '#38bdf8', '#fbbf24', '#34d399', '#c084fc', '#fb923c'];

            if (userChart) userChart.destroy();
            userChart = new Chart(ctx3, {
                type: 'doughnut',
                data: {
                    labels: uNames.length > 0 ? uNames : ['Belum Ada Pengeluaran'],
                    datasets: [{
                        data: uAmounts.length > 0 ? uAmounts : [1],
                        backgroundColor: uAmounts.length > 0 ? uColors.slice(0, uNames.length) : ['rgba(148, 163, 184, 0.2)'],
                        borderWidth: isDark ? 2 : 1,
                        borderColor: isDark ? '#1e293b' : '#ffffff',
                        hoverOffset: 6
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '62%',
                    plugins: {
                        legend: {
                            position: 'right',
                            labels: {
                                color: legendColor,
                                font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                                boxWidth: 10,
                                padding: 8,
                                usePointStyle: true
                            }
                        },
                        tooltip: {
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

<div class="dashboard-tab-view active">
    <div class="mobile-section-header">
        <h2>📊 Laporan &amp; Analisa Finansial</h2>
        <p>Visualisasi arus kas bulanan, alokasi portofolio, dan evaluasi pengeluaran.</p>
    </div>

    <!-- CHARTS GRID -->
    <div class="section-charts" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px;">
        <div class="glass-panel">
            <h2 class="panel-title">Alokasi Portofolio</h2>
            <div style="height: 180px; position: relative;">
                <canvas bind:this={financeCanvas}></canvas>
            </div>
        </div>
        <div class="glass-panel">
            <h2 class="panel-title">Arus Kas (Bulan Ini)</h2>
            <div style="height: 180px; position: relative;">
                <canvas bind:this={comparisonCanvas}></canvas>
            </div>
        </div>
    </div>

    <!-- MULTI-USER EXPENSE COMPARISON SECTION -->
    <div class="glass-panel section-user-spending">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
            <h2 class="panel-title" style="margin: 0;">👥 Pengeluaran Antar Pengguna</h2>
            <span class="badge">Multi-User</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; align-items: center;">
            <div style="height: 170px; position: relative;">
                <canvas bind:this={userExpenseCanvas}></canvas>
            </div>
            <div class="user-spending-grid">
                {#if Object.keys(userExpenses).length === 0}
                    <div style="color: var(--text-gray); font-size: 13px; text-align: center; width: 100%; padding: 14px;">
                        Belum ada data pengeluaran antar pengguna pada filter ini.
                    </div>
                {:else}
                    {#each Object.entries(userExpenses) as [name, amount]}
                        {@const uObj = users.find(u => u.name === name) || { avatar: '👤', color: 'var(--primary)' }}
                        {@const count = userCounts[name] || 0}
                        <div class="user-spending-card">
                            <div class="user-chip-avatar" style="width: 32px; height: 32px; background: {uObj.color || 'var(--primary)'}; color: white; font-size: 15px;">
                                {#if uObj.picture}
                                    <img src={uObj.picture} alt={name}>
                                {:else}
                                    {uObj.avatar || '👤'}
                                {/if}
                            </div>
                            <div class="user-spending-info">
                                <div class="user-spending-name">{name}</div>
                                <div class="user-spending-amount">{formatRp(amount)}</div>
                                <div class="user-spending-count">{count} kali pengeluaran</div>
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
    </div>

    <!-- FINANCIAL ANALYSIS CARD -->
    <div class="glass-panel section-insights">
        <h2 class="panel-title">📈 Analisa Keuangan &amp; Rekomendasi</h2>
        <div style="display: flex; flex-direction: column; gap: 12px; font-size: 13.5px; color: var(--text-dark);">
            {#if filteredInc === 0 && filteredExp === 0}
                <p style="color: var(--text-gray);">Belum ada data transaksi yang cukup untuk dianalisa pada bulan ini.</p>
            {:else}
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <span style="color: var(--text-gray); font-weight: 600;">Status Arus Kas:</span>
                    <span>
                        {#if isSurplus}
                            <span style="color: var(--income); font-weight: 800;">🟢 SURPLUS (Sehat)</span>
                        {:else}
                            <span style="color: var(--expense); font-weight: 800;">🔴 DEFISIT (Perlu Evaluasi)</span>
                        {/if}
                    </span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
                    <span style="color: var(--text-gray); font-weight: 600;">Rasio Sisa / Tabungan:</span>
                    <span style="font-weight: 800; color: var(--primary);">{savingsRate.toFixed(1)}% dari pemasukan</span>
                </div>
                <div style="margin-top: 8px;">
                    <strong style="display: block; margin-bottom: 4px; color: var(--text-dark); font-size: 15px;">💡 Rekomendasi Finansial:</strong>
                    <p style="color: var(--text-gray); line-height: 1.6;">
                        {#if isSurplus}
                            Arus kas positif! Pertahankan kedisiplinan pencatatan keuangan dan pertimbangkan alokasi ke simpanan atau aset emas.
                        {:else}
                            Pengeluaran melebihi pemasukan pada bulan ini. Tinjau kembali pos pengeluaran dan minimalkan pengeluaran tersier.
                        {/if}
                    </p>
                </div>
            {/if}
        </div>
    </div>
</div>

<script>
    import { heroView, privacyMode, togglePrivacy, openAddTxModal, openTransferModal, sisaScope } from '../stores/uiStore.js';
    import { filteredData, formatRp, categoryBudgetSummary } from '../stores/financeStore.js';
    import { activeUser } from '../stores/authStore.js';

    $: totals = $filteredData.totals;
    $: filteredInc = $filteredData.filteredInc || 0;
    $: filteredExp = $filteredData.filteredExp || 0;
    $: isSurplus = filteredInc >= filteredExp;
    $: computedPockets = $filteredData.computedPockets || [];
    $: displaySisa = $sisaScope === 'cash' ? totals.cash : totals.totalWealth;
    $: savingsRate = $filteredData.savingsRate || 0;
    $: netCashflow = $filteredData.netCashflow || (filteredInc - filteredExp);
    $: txs = $filteredData.filteredList || [];
    $: budgetSummary = $categoryBudgetSummary;

    // Progressive Disclosure hover states
    let showBalanceTooltip = false;
    let hoveredFlow = null; // 'inc' | 'exp' | null

    // Smart AI Insight Widget State
    let activeInsightIndex = 0;
    let isInsightExpanded = false;

    function getGreeting() {
        const hour = new Date().getHours();
        if (hour < 11) return 'Selamat pagi';
        if (hour < 15) return 'Selamat siang';
        if (hour < 18) return 'Selamat sore';
        return 'Selamat malam';
    }

    function getMonthName() {
        return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date());
    }

    // Early-warning threshold insight for categories reaching >= 80%
    $: warningBudgetCategories = (budgetSummary?.items || []).filter(item => item.hasLimit && item.percentage >= 80);

    $: budgetAlertInsights = (() => {
        if (!warningBudgetCategories || warningBudgetCategories.length === 0) return [];
        const topWarn = [...warningBudgetCategories].sort((a, b) => b.percentage - a.percentage)[0];
        const nowDay = new Date().getDate();
        const isMidMonth = nowDay >= 10 && nowDay <= 22;
        const isOver = topWarn.percentage > 100;

        let tag = '⚠️ Peringatan Anggaran';
        if (isOver) {
            tag = '🚨 Anggaran Terlampaui';
        } else if (isMidMonth) {
            tag = '⚠️ Waspada Pertengahan Bulan (80%+)';
        } else {
            tag = '⚠️ Anggaran Kritis (>80%)';
        }

        return [{
            type: 'warning',
            tag,
            icon: isOver ? '🚨' : '⚠️',
            summary: isOver
                ? `Pengeluaran ${topWarn.name} telah melampaui batas anggaran (${topWarn.percentage.toFixed(0)}%, defisit ${formatRp(topWarn.spent - topWarn.limit, $privacyMode)}).`
                : `${isMidMonth ? 'Di pertengahan bulan ini, ' : ''}Kategori ${topWarn.name} sudah menyerap ${topWarn.percentage.toFixed(0)}% batas anggarannya (${formatRp(topWarn.spent, $privacyMode)} dari ${formatRp(topWarn.limit, $privacyMode)}).`,
            metricLabel: 'Realisasi Anggaran',
            metricValue: `${topWarn.percentage.toFixed(0)}%`,
            recommendation: `Batasi pengeluaran pada pos ${topWarn.name}. Sisa anggaran saat ini: ${formatRp(topWarn.remaining, $privacyMode)}.`
        }];
    })();

    // Dynamic smart insights computed from current financial telemetry
    $: insights = [
        ...budgetAlertInsights,
        {
            type: isSurplus ? 'positive' : 'warning',
            tag: isSurplus ? 'Arus Kas Sehat' : 'Defisit Terdeteksi',
            icon: isSurplus ? '✦' : '⚠️',
            summary: isSurplus
                ? `Arus kas bulan ${getMonthName()} surplus ${formatRp(Math.abs(netCashflow), $privacyMode)}. Keuangan Anda berada di zona aman.`
                : `Pengeluaran bulan ini melebihi pemasukan sebesar ${formatRp(Math.abs(netCashflow), $privacyMode)}. Waspadai pos belanja non-primer.`,
            metricLabel: isSurplus ? 'Sisa Ruang Belanja' : 'Defisit Arus Kas',
            metricValue: formatRp(Math.abs(netCashflow), $privacyMode),
            recommendation: isSurplus
                ? 'Pertahankan kebiasaan ini atau alokasikan surplus ke Kantong Simpanan/Emas untuk mempercepat target impian.'
                : 'Prioritaskan pemangkasan pos belanja hiburan & makan di luar untuk menyeimbangkan neraca bulan ini.'
        },
        {
            type: savingsRate >= 20 ? 'positive' : 'info',
            tag: 'Rasio Tabungan',
            icon: '🛡️',
            summary: savingsRate >= 20
                ? `Tingkat tabungan prima sebesar ${savingsRate.toFixed(0)}%! Melebihi standar aman piramida keuangan (20%).`
                : `Tingkat tabungan Anda ${savingsRate.toFixed(0)}%. Disarankan minimal 10-20% dari total pemasukan.`,
            metricLabel: 'Savings Rate',
            metricValue: `${savingsRate.toFixed(0)}%`,
            recommendation: savingsRate >= 20
                ? 'Fondasi keuangan keluarga Anda sangat kuat dan tahan terhadap pengeluaran tak terduga.'
                : 'Terapkan metode Pay Yourself First: sisihkan pos tabungan di awal sebelum belanja konsumtif.'
        },
        {
            type: 'info',
            tag: 'Distribusi Portofolio',
            icon: '🏦',
            summary: `Aset terbagi rapi di ${computedPockets.length} kantong aktif dengan akumulasi total ${formatRp(totals.totalWealth, $privacyMode)}.`,
            metricLabel: 'Kantong Dominan',
            metricValue: computedPockets.length > 0 ? (computedPockets.reduce((prev, curr) => (curr.amount > prev.amount ? curr : prev), computedPockets[0]).name) : '-',
            recommendation: 'Periksa alokasi berkala agar proporsi kas likuid vs investasi tetap seimbang.'
        }
    ];

    $: currentInsight = insights[activeInsightIndex] || insights[0];

    function nextInsight() {
        activeInsightIndex = (activeInsightIndex + 1) % insights.length;
    }

    function prevInsight() {
        activeInsightIndex = (activeInsightIndex - 1 + insights.length) % insights.length;
    }

    // Minimalist SVG Sparkline generator based on live transaction distribution
    function getSparkline(type, width = 76, height = 24) {
        const matches = (txs || []).filter(t => {
            if (type === 'income') return t.type === 'income';
            return t.type === 'expense' || t.type === 'jago' || t.type === 'inv_jago';
        });

        const numPoints = 7;
        let points = [];
        if (matches.length >= 3) {
            const bucketSize = Math.max(1, Math.floor(matches.length / numPoints));
            for (let i = 0; i < numPoints; i++) {
                const slice = matches.slice(i * bucketSize, (i + 1) * bucketSize);
                const sum = slice.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
                points.push(sum);
            }
        } else if (matches.length > 0) {
            const val = Number(matches[0]?.amount) || 100;
            points = [val * 0.35, val * 0.7, val * 0.5, val * 0.9, val * 0.65, val * 0.85, val];
        } else {
            points = [20, 26, 22, 32, 28, 36, 30];
        }

        const max = Math.max(...points, 1);
        const min = Math.min(...points, 0);
        const range = max - min || 1;

        const coords = points.map((p, idx) => {
            const x = (idx / (numPoints - 1)) * (width - 6) + 3;
            const y = height - 4 - ((p - min) / range) * (height - 8);
            return [x, y];
        });

        let d = `M ${coords[0][0]},${coords[0][1]}`;
        for (let i = 1; i < coords.length; i++) {
            const prev = coords[i - 1];
            const curr = coords[i];
            const cX = (prev[0] + curr[0]) / 2;
            d += ` C ${cX},${prev[1]} ${cX},${curr[1]} ${curr[0]},${curr[1]}`;
        }

        return {
            line: d,
            area: `${d} L ${coords[coords.length - 1][0]},${height} L ${coords[0][0]},${height} Z`,
            last: coords[coords.length - 1]
        };
    }

    $: incSpark = getSparkline('income', 74, 22);
    $: expSpark = getSparkline('expense', 74, 22);

    // Expense ratio for animated progress indicator
    $: expRatio = filteredInc > 0 ? Math.min(100, Math.round((filteredExp / filteredInc) * 100)) : (filteredExp > 0 ? 100 : 0);
</script>

<div class="premium-hero-container">
    <!-- SUBTLE AMBIENT BACKDROP LIGHTS -->
    <div class="ambient-glow ambient-glow-primary"></div>
    <div class="ambient-glow ambient-glow-secondary"></div>

    <div class="hero-glass-card">
        <!-- TOP ROW: GREETING & VIEW CONTROLS -->
        <div class="hero-top-bar">
            <!-- GREETING PILL -->
            <div class="hero-user-badge">
                <div class="user-avatar-indicator">🌿</div>
                <div class="user-greeting-meta">
                    <span class="user-salute">{getGreeting()}, <strong>{$activeUser ? $activeUser.name : 'Teman'}</strong></span>
                    <span class="user-subdate">Bulan {getMonthName()}</span>
                </div>
            </div>

            <!-- UNIFIED VIEW TOGGLES & PRIVACY BUTTON -->
            <div class="hero-header-actions">
                <div class="segmented-view-pill" role="tablist">
                    <button
                        type="button"
                        class="seg-btn"
                        class:active={$heroView === 'sisa'}
                        on:click={() => heroView.set('sisa')}
                        role="tab"
                        aria-selected={$heroView === 'sisa'}
                    >
                        <span>💸</span> Sisa Kas
                    </button>
                    <button
                        type="button"
                        class="seg-btn"
                        class:active={$heroView === 'wealth'}
                        on:click={() => heroView.set('wealth')}
                        role="tab"
                        aria-selected={$heroView === 'wealth'}
                    >
                        <span>🏦</span> Portofolio
                    </button>
                </div>

                <!-- SLEEK PRIVACY EYE BUTTON -->
                <button
                    type="button"
                    class="hero-icon-action-btn"
                    on:click={togglePrivacy}
                    title={$privacyMode ? 'Tampilkan Saldo (Privasi Aktif)' : 'Sembunyikan Saldo'}
                    aria-label="Toggle Saldo Privacy"
                >
                    {#if $privacyMode}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                            <line x1="1" y1="1" x2="23" y2="23"/>
                        </svg>
                    {:else}
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                        </svg>
                    {/if}
                </button>
            </div>
        </div>

        <!-- MAIN BALANCE DISPLAY (PRIMARY HERO) -->
        {#if $heroView === 'sisa'}
            <div class="hero-balance-section">
                <!-- SCOPE FILTER PILLS (SIMPLIFIED HERO TAGS) -->
                <div class="balance-meta-header">
                    <div class="balance-caption-group">
                        <span class="balance-caption-title">
                            {$sisaScope === 'cash' ? 'Sisa Kas Utama' : 'Total Saldo Konsolidasi'}
                        </span>
                        <!-- HOVER-TO-REVEAL INFO TOOLTIP ICON -->
                        <!-- svelte-ignore a11y-mouse-events-have-key-events a11y-no-static-element-interactions -->
                        <div
                            class="info-tooltip-trigger"
                            on:mouseenter={() => showBalanceTooltip = true}
                            on:mouseleave={() => showBalanceTooltip = false}
                            role="note"
                        >
                            <span class="info-badge">ⓘ</span>
                            {#if showBalanceTooltip}
                                <div class="floating-tooltip">
                                    {$sisaScope === 'cash'
                                        ? 'Saldo likuid Kas Tunai siap pakai untuk operasional & harian.'
                                        : 'Akumulasi seluruh saldo aktif di semua kantong & tabungan.'}
                                </div>
                            {/if}
                        </div>
                    </div>

                    <!-- MINIMALIST INLINE SCOPE SWITCHER PILLS -->
                    <div class="scope-pill-switch" role="group" aria-label="Filter Scope Saldo">
                        <button
                            type="button"
                            class="scope-pill-btn"
                            class:active={$sisaScope === 'cash'}
                            on:click={() => sisaScope.set('cash')}
                            title="Hanya Kas Utama (Likuid)"
                        >
                            💵 Kas Utama
                        </button>
                        <button
                            type="button"
                            class="scope-pill-btn"
                            class:active={$sisaScope === 'all'}
                            on:click={() => sisaScope.set('all')}
                            title="Semua Kantong Gabungan"
                        >
                            🌐 Semua Kantong
                        </button>
                    </div>
                </div>

                <!-- CRITICAL BALANCE FIGURE -->
                <div class="balance-main-row">
                    <h1 class="hero-amount-display font-mono">
                        {formatRp(displaySisa, $privacyMode)}
                    </h1>
                    <div class="balance-status-indicator" class:safe={isSurplus} class:warning={!isSurplus}>
                        <span class="pulse-status-dot"></span>
                        <span class="status-indicator-text">
                            {$sisaScope === 'cash' ? 'Likuiditas Siap Pakai' : 'Terkonsolidasi'}
                        </span>
                    </div>
                </div>
            </div>

            <!-- VISUALIZED CASHFLOW METRICS WITH MINI SPARKLINES -->
            <div class="hero-cashflow-dashboard">
                <!-- INFLOW BOX -->
                <!-- svelte-ignore a11y-mouse-events-have-key-events a11y-no-static-element-interactions -->
                <div
                    class="flow-card flow-inflow"
                    on:mouseenter={() => hoveredFlow = 'inc'}
                    on:mouseleave={() => hoveredFlow = null}
                    role="group"
                    aria-label="Pemasukan"
                >
                    <div class="flow-left-content">
                        <div class="flow-icon-circle inflow-bg">↓</div>
                        <div class="flow-text-wrap">
                            <span class="flow-label">Pemasukan</span>
                            <span class="flow-value font-mono">{formatRp(filteredInc, $privacyMode)}</span>
                        </div>
                    </div>

                    <!-- MINI SPARKLINE -->
                    <div class="flow-sparkline-wrap" title="Tren pemasukan bulan ini">
                        <svg viewBox="0 0 74 22" class="sparkline-svg">
                            <defs>
                                <linearGradient id="incSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#10b981" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#10b981" stop-opacity="0.0"/>
                                </linearGradient>
                            </defs>
                            <path d={incSpark.area} fill="url(#incSparkGrad)"/>
                            <path d={incSpark.line} fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round"/>
                            <circle cx={incSpark.last[0]} cy={incSpark.last[1]} r="2.5" fill="#34d399"/>
                        </svg>
                    </div>
                </div>

                <div class="flow-separator"></div>

                <!-- OUTFLOW BOX -->
                <!-- svelte-ignore a11y-mouse-events-have-key-events a11y-no-static-element-interactions -->
                <div
                    class="flow-card flow-outflow"
                    on:mouseenter={() => hoveredFlow = 'exp'}
                    on:mouseleave={() => hoveredFlow = null}
                    role="group"
                    aria-label="Pengeluaran"
                >
                    <div class="flow-left-content">
                        <div class="flow-icon-circle outflow-bg">↑</div>
                        <div class="flow-text-wrap">
                            <span class="flow-label">Pengeluaran</span>
                            <span class="flow-value font-mono">{formatRp(filteredExp, $privacyMode)}</span>
                        </div>
                    </div>

                    <!-- MINI SPARKLINE & RATIO RING -->
                    <div class="flow-sparkline-wrap" title="{expRatio}% dari pemasukan terpakai">
                        <svg viewBox="0 0 74 22" class="sparkline-svg">
                            <defs>
                                <linearGradient id="expSparkGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#f43f5e" stop-opacity="0.35"/>
                                    <stop offset="100%" stop-color="#f43f5e" stop-opacity="0.0"/>
                                </linearGradient>
                            </defs>
                            <path d={expSpark.area} fill="url(#expSparkGrad)"/>
                            <path d={expSpark.line} fill="none" stroke="#f43f5e" stroke-width="2" stroke-linecap="round"/>
                            <circle cx={expSpark.last[0]} cy={expSpark.last[1]} r="2.5" fill="#fb7185"/>
                        </svg>
                    </div>
                </div>
            </div>

            <!-- SMART AI-STYLE INSIGHT WIDGET (COMPACT & EXPANDABLE) -->
            <div class="smart-ai-widget" class:widget-warning={currentInsight.type === 'warning'}>
                <div class="ai-widget-header">
                    <div class="ai-identity">
                        <div class="ai-spark-icon">{currentInsight.icon}</div>
                        <div class="ai-badge-group">
                            <span class="ai-brand-tag">SMART INSIGHT</span>
                            <span class="ai-insight-tag">{currentInsight.tag}</span>
                        </div>
                    </div>

                    <!-- INSIGHT SLIDER & EXPAND CONTROLS -->
                    <div class="ai-controls">
                        <div class="ai-pagination-dots">
                            {#each insights as _, i}
                                <button
                                    type="button"
                                    class="ai-dot-btn"
                                    class:active={activeInsightIndex === i}
                                    on:click={() => activeInsightIndex = i}
                                    aria-label="Insight {i + 1}"
                                ></button>
                            {/each}
                        </div>
                        <button type="button" class="ai-arrow-btn" on:click={prevInsight} aria-label="Insight sebelumnya">‹</button>
                        <button type="button" class="ai-arrow-btn" on:click={nextInsight} aria-label="Insight selanjutnya">›</button>
                        <button
                            type="button"
                            class="ai-toggle-btn"
                            class:expanded={isInsightExpanded}
                            on:click={() => isInsightExpanded = !isInsightExpanded}
                            aria-label="Buka tutup detail insight"
                        >
                            <span>{isInsightExpanded ? 'Tutup' : 'Detail'}</span>
                            <span class="toggle-chevron">{isInsightExpanded ? '▴' : '▾'}</span>
                        </button>
                    </div>
                </div>

                <div class="ai-widget-body">
                    <p class="ai-summary-text">
                        {currentInsight.summary}
                    </p>

                    <!-- PROGRESSIVE DISCLOSURE EXPANDED DEEP-DIVE -->
                    {#if isInsightExpanded}
                        <div class="ai-deep-dive-panel">
                            <div class="deep-dive-stat">
                                <span class="stat-caption">{currentInsight.metricLabel}:</span>
                                <strong class="stat-val font-mono">{currentInsight.metricValue}</strong>
                            </div>
                            <div class="deep-dive-advice">
                                <span class="advice-lamp">💡</span>
                                <span class="advice-text">{currentInsight.recommendation}</span>
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

        {:else}
            <!-- VIEW 2: TOTAL PORTOFOLIO (ACCUMULATION) -->
            <div class="hero-balance-section">
                <div class="balance-meta-header">
                    <div class="balance-caption-group">
                        <span class="balance-caption-title">Akumulasi Seluruh Aset & Tabungan</span>
                    </div>
                    <div class="wealth-indicator-badge">
                        <span>👑</span> Total Portofolio
                    </div>
                </div>

                <div class="balance-main-row">
                    <h1 class="hero-amount-display wealth-gradient font-mono">
                        {formatRp(totals.totalWealth, $privacyMode)}
                    </h1>
                </div>

                <!-- SLEEK CLEAN ASSET CHIPS -->
                <div class="wealth-pill-rack">
                    {#each computedPockets as p}
                        {#if p.share > 0}
                            <div class="wealth-micro-chip">
                                <span class="chip-color-dot" style="background: {p.color};"></span>
                                <span class="chip-name">{p.name}</span>
                                <strong class="chip-pct font-mono">{p.share}%</strong>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        {/if}

        <!-- REDESIGNED UNIFIED MODERN ACTION DOCK (SAVES VERTICAL SPACE) -->
        <div class="unified-action-dock" role="toolbar" aria-label="Aksi Cepat Transaksi">
            <button
                type="button"
                class="dock-action-btn action-expense"
                on:click={() => openAddTxModal({ type: 'expense', category: 'makan', pocket: 'cash', title: 'Catat Pengeluaran' })}
                title="Catat Pengeluaran Cepat"
            >
                <div class="dock-icon-box">💸</div>
                <div class="dock-text-box">
                    <span class="dock-title">Catat</span>
                    <span class="dock-sub">Pengeluaran</span>
                </div>
            </button>

            <button
                type="button"
                class="dock-action-btn action-income"
                on:click={() => openAddTxModal({ type: 'income', category: 'gaji', pocket: 'cash', title: 'Catat Pemasukan' })}
                title="Catat Pemasukan Cepat"
            >
                <div class="dock-icon-box">💰</div>
                <div class="dock-text-box">
                    <span class="dock-title">Pemasukan</span>
                    <span class="dock-sub">Tambah Dana</span>
                </div>
            </button>

            <button
                type="button"
                class="dock-action-btn action-transfer"
                on:click={openTransferModal}
                title="Pindah Saldo atau Kelola Kantong"
            >
                <div class="dock-icon-box">⇄</div>
                <div class="dock-text-box">
                    <span class="dock-title">Pindah Saldo</span>
                    <span class="dock-sub">Antar Kantong</span>
                </div>
            </button>
        </div>
    </div>
</div>

<style>
    /* ==========================================================================
       MODERN & PREMIUM HERO CARD STYLING (DARK SLATE GLASSMORPHISM)
       ========================================================================== */
    .premium-hero-container {
        position: relative;
        margin-bottom: 24px;
        width: 100%;
        border-radius: 28px;
    }

    /* Ambient soft background lighting */
    .ambient-glow {
        position: absolute;
        border-radius: 50%;
        filter: blur(55px);
        pointer-events: none;
        opacity: 0.45;
        z-index: 0;
        transition: all 0.5s ease;
    }
    .ambient-glow-primary {
        width: 240px;
        height: 240px;
        top: -40px;
        right: -30px;
        background: radial-gradient(circle, rgba(37, 99, 235, 0.22) 0%, rgba(59, 130, 246, 0.05) 70%, transparent 100%);
    }
    .ambient-glow-secondary {
        width: 200px;
        height: 200px;
        bottom: -30px;
        left: -30px;
        background: radial-gradient(circle, rgba(16, 185, 129, 0.15) 0%, rgba(99, 102, 241, 0.04) 70%, transparent 100%);
    }

    /* Primary Glass Card Container */
    .hero-glass-card {
        position: relative;
        z-index: 1;
        background: linear-gradient(145deg, rgba(22, 31, 48, 0.85) 0%, rgba(15, 23, 42, 0.92) 100%);
        backdrop-filter: blur(28px) saturate(180%);
        -webkit-backdrop-filter: blur(28px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 28px;
        padding: 26px 24px 22px 24px;
        box-shadow: 0 20px 45px -12px rgba(0, 0, 0, 0.65), 
                    inset 0 1px 1px rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-glass-card:hover {
        border-color: rgba(255, 255, 255, 0.12);
        box-shadow: 0 26px 54px -14px rgba(0, 0, 0, 0.75), 
                    0 0 30px rgba(37, 99, 235, 0.12),
                    inset 0 1px 2px rgba(255, 255, 255, 0.15);
    }

    /* TOP ROW BAR */
    .hero-top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    /* GREETING PILL */
    .hero-user-badge {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .user-avatar-indicator {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: rgba(45, 212, 191, 0.12);
        border: 1px solid rgba(45, 212, 191, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
    }
    .user-greeting-meta {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
    }
    .user-salute {
        font-size: 13px;
        color: #e2e8f0;
        font-weight: 500;
    }
    .user-salute strong {
        color: #2dd4bf;
        font-weight: 700;
    }
    .user-subdate {
        font-size: 11px;
        color: #94a3b8;
    }

    /* HEADER ACTIONS */
    .hero-header-actions {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .segmented-view-pill {
        display: inline-flex;
        background: rgba(15, 23, 42, 0.8);
        border: 1px solid rgba(255, 255, 255, 0.08);
        padding: 3px;
        border-radius: 100px;
        gap: 3px;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.4);
    }
    .seg-btn {
        background: transparent;
        border: none;
        border-radius: 100px;
        padding: 5px 13px;
        font-size: 11.5px;
        font-weight: 700;
        color: #94a3b8;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
    }
    .seg-btn:hover {
        color: #ffffff;
    }
    .seg-btn.active {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    .hero-icon-action-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hero-icon-action-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: #ffffff;
        transform: scale(1.06);
        border-color: rgba(255, 255, 255, 0.2);
    }

    /* MAIN BALANCE SECTION */
    .hero-balance-section {
        margin-bottom: 20px;
    }
    .balance-meta-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 8px;
    }
    .balance-caption-group {
        display: flex;
        align-items: center;
        gap: 6px;
        position: relative;
    }
    .balance-caption-title {
        font-size: 12px;
        font-weight: 700;
        color: #94a3b8;
        letter-spacing: 0.3px;
        text-transform: uppercase;
    }

    /* PROGRESSIVE DISCLOSURE TOOLTIP */
    .info-tooltip-trigger {
        position: relative;
        cursor: help;
        display: inline-flex;
        align-items: center;
    }
    .info-badge {
        font-size: 11px;
        color: #64748b;
        transition: color 0.2s ease;
    }
    .info-tooltip-trigger:hover .info-badge {
        color: #60a5fa;
    }
    .floating-tooltip {
        position: absolute;
        top: 22px;
        left: 0;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 11px;
        font-weight: 500;
        line-height: 1.4;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.12);
        white-space: nowrap;
        z-index: 50;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
        pointer-events: none;
        animation: fadeIn 0.2s ease;
    }

    /* INLINE SCOPE SWITCHER PILLS */
    .scope-pill-switch {
        display: inline-flex;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        padding: 2px;
        gap: 2px;
    }
    .scope-pill-btn {
        background: transparent;
        border: none;
        border-radius: 100px;
        padding: 4px 10px;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
    }
    .scope-pill-btn:hover {
        color: #ffffff;
    }
    .scope-pill-btn.active {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
    }

    /* BALANCE AMOUNT & STATUS */
    .balance-main-row {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 12px;
    }
    .hero-amount-display {
        font-size: 38px;
        font-weight: 800;
        letter-spacing: -1px;
        line-height: 1.1;
        color: #ffffff;
        text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5);
    }
    .hero-amount-display.wealth-gradient {
        background: linear-gradient(135deg, #ffffff 40%, #93c5fd 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
    }

    .balance-status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 100px;
        font-size: 11px;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
    }
    .balance-status-indicator.safe {
        background: rgba(16, 185, 129, 0.12);
        border-color: rgba(16, 185, 129, 0.25);
        color: #34d399;
    }
    .balance-status-indicator.warning {
        background: rgba(244, 63, 94, 0.12);
        border-color: rgba(244, 63, 94, 0.25);
        color: #fb7185;
    }
    .pulse-status-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
        animation: pulse 2s infinite ease-in-out;
    }
    @keyframes pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.8); }
    }

    /* WEALTH CHIPS */
    .wealth-indicator-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 100px;
        font-size: 11px;
        font-weight: 700;
        background: rgba(253, 184, 19, 0.14);
        border: 1px solid rgba(253, 184, 19, 0.3);
        color: #FDB813;
    }
    .wealth-pill-rack {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 14px;
    }
    .wealth-micro-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 4px 10px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.08);
        font-size: 11px;
        color: #cbd5e1;
    }
    .chip-color-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
    }
    .chip-pct {
        color: #ffffff;
        font-weight: 800;
    }

    /* VISUALIZED CASHFLOW METRICS (WITH SPARKLINES) */
    .hero-cashflow-dashboard {
        display: flex;
        align-items: center;
        background: rgba(15, 23, 42, 0.65);
        border: 1px solid rgba(255, 255, 255, 0.07);
        border-radius: 18px;
        padding: 10px 14px;
        margin-bottom: 14px;
        gap: 12px;
    }
    .flow-card {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        transition: all 0.2s ease;
    }
    .flow-left-content {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .flow-separator {
        width: 1px;
        height: 36px;
        background: rgba(255, 255, 255, 0.08);
    }
    .flow-icon-circle {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: 800;
        flex-shrink: 0;
    }
    .inflow-bg {
        background: rgba(16, 185, 129, 0.16);
        color: #10b981;
        border: 1px solid rgba(16, 185, 129, 0.25);
    }
    .outflow-bg {
        background: rgba(244, 63, 94, 0.16);
        color: #f43f5e;
        border: 1px solid rgba(244, 63, 94, 0.25);
    }
    .flow-text-wrap {
        display: flex;
        flex-direction: column;
    }
    .flow-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.4px;
    }
    .flow-value {
        font-size: 14.5px;
        font-weight: 800;
        line-height: 1.2;
        margin-top: 1px;
    }
    .flow-inflow .flow-value { color: #34d399; }
    .flow-outflow .flow-value { color: #fb7185; }

    .flow-sparkline-wrap {
        width: 74px;
        height: 22px;
        display: flex;
        align-items: center;
        flex-shrink: 0;
    }
    .sparkline-svg {
        width: 100%;
        height: 100%;
        overflow: visible;
    }

    /* SMART AI INSIGHT WIDGET */
    .smart-ai-widget {
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.08) 0%, rgba(99, 102, 241, 0.04) 100%);
        border: 1px solid rgba(59, 130, 246, 0.22);
        border-radius: 16px;
        padding: 12px 14px;
        margin-bottom: 16px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        position: relative;
        overflow: hidden;
    }
    .smart-ai-widget.widget-warning {
        background: linear-gradient(135deg, rgba(244, 63, 94, 0.08) 0%, rgba(239, 68, 68, 0.03) 100%);
        border-color: rgba(244, 63, 94, 0.25);
    }
    .ai-widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin-bottom: 6px;
    }
    .ai-identity {
        display: flex;
        align-items: center;
        gap: 7px;
    }
    .ai-spark-icon {
        font-size: 13px;
        color: #60a5fa;
        line-height: 1;
    }
    .widget-warning .ai-spark-icon {
        color: #fb7185;
    }
    .ai-badge-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .ai-brand-tag {
        font-size: 9.5px;
        font-weight: 800;
        letter-spacing: 0.6px;
        color: #60a5fa;
        text-transform: uppercase;
    }
    .widget-warning .ai-brand-tag {
        color: #fb7185;
    }
    .ai-insight-tag {
        font-size: 10px;
        font-weight: 700;
        color: #cbd5e1;
        background: rgba(255, 255, 255, 0.06);
        padding: 1px 7px;
        border-radius: 100px;
    }

    .ai-controls {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .ai-pagination-dots {
        display: flex;
        align-items: center;
        gap: 3px;
        margin-right: 4px;
    }
    .ai-dot-btn {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        border: none;
        padding: 0;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .ai-dot-btn.active {
        width: 14px;
        border-radius: 10px;
        background: #3b82f6;
    }
    .ai-arrow-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        font-size: 13px;
        width: 18px;
        height: 18px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 4px;
    }
    .ai-arrow-btn:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.08);
    }
    .ai-toggle-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        font-size: 10.5px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 3px;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .ai-toggle-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
    }
    .toggle-chevron {
        font-size: 9px;
    }

    .ai-summary-text {
        font-size: 11.5px;
        color: #e2e8f0;
        line-height: 1.45;
        font-weight: 500;
        margin: 0;
    }

    /* EXPANDED PANEL */
    .ai-deep-dive-panel {
        margin-top: 10px;
        padding-top: 10px;
        border-top: 1px dashed rgba(255, 255, 255, 0.1);
        animation: fadeIn 0.25s ease-out;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .deep-dive-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
    }
    .stat-caption {
        color: #94a3b8;
    }
    .stat-val {
        color: #60a5fa;
        font-weight: 800;
    }
    .deep-dive-advice {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        font-size: 11px;
        color: #cbd5e1;
        background: rgba(0, 0, 0, 0.25);
        padding: 6px 10px;
        border-radius: 8px;
        line-height: 1.35;
    }
    .advice-lamp {
        font-size: 12px;
        line-height: 1.2;
    }

    /* REDESIGNED UNIFIED MODERN ACTION DOCK */
    .unified-action-dock {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        width: 100%;
    }
    .dock-action-btn {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 9px 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25), inset 0 1px 1px rgba(255, 255, 255, 0.06);
    }
    .dock-action-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px -2px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255, 255, 255, 0.15);
    }
    .dock-action-btn:active {
        transform: scale(0.98);
    }

    .dock-icon-box {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        flex-shrink: 0;
        transition: transform 0.2s ease;
    }
    .dock-action-btn:hover .dock-icon-box {
        transform: scale(1.1);
    }

    .dock-text-box {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        text-align: left;
        line-height: 1.2;
        min-width: 0;
    }
    .dock-title {
        font-size: 12.5px;
        font-weight: 800;
        color: #ffffff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .dock-sub {
        font-size: 10px;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* ACTION FLAVORS */
    .action-expense:hover {
        border-color: rgba(244, 63, 94, 0.4);
        background: linear-gradient(145deg, rgba(244, 63, 94, 0.14) 0%, rgba(15, 23, 42, 0.8) 100%);
    }
    .action-expense .dock-icon-box {
        background: rgba(244, 63, 94, 0.18);
        border: 1px solid rgba(244, 63, 94, 0.3);
    }

    .action-income:hover {
        border-color: rgba(16, 185, 129, 0.4);
        background: linear-gradient(145deg, rgba(16, 185, 129, 0.14) 0%, rgba(15, 23, 42, 0.8) 100%);
    }
    .action-income .dock-icon-box {
        background: rgba(16, 185, 129, 0.18);
        border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .action-transfer:hover {
        border-color: rgba(168, 85, 247, 0.4);
        background: linear-gradient(145deg, rgba(168, 85, 247, 0.14) 0%, rgba(15, 23, 42, 0.8) 100%);
    }
    .action-transfer .dock-icon-box {
        background: rgba(168, 85, 247, 0.18);
        border: 1px solid rgba(168, 85, 247, 0.3);
    }

    /* ==========================================================================
       LIGHT THEME ADAPTATION
       ========================================================================== */
    :global([data-theme="light"]) .hero-glass-card {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.06), 0 4px 6px -2px rgba(15, 23, 42, 0.03) !important;
    }
    :global([data-theme="light"]) .hero-top-bar {
        border-bottom-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .user-salute {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .user-subdate {
        color: #64748b !important;
    }
    :global([data-theme="light"]) .segmented-view-pill {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .seg-btn {
        color: #64748b !important;
    }
    :global([data-theme="light"]) .seg-btn.active {
        background: #ffffff !important;
        color: #2563eb !important;
        border: 1px solid #cbd5e1 !important;
    }
    :global([data-theme="light"]) .hero-icon-action-btn {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
        color: #475569 !important;
    }
    :global([data-theme="light"]) .scope-pill-switch {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .scope-pill-btn {
        color: #64748b !important;
    }
    :global([data-theme="light"]) .scope-pill-btn.active {
        background: #ffffff !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .hero-amount-display {
        color: #0f172a !important;
        text-shadow: none !important;
    }
    :global([data-theme="light"]) .hero-amount-display.wealth-gradient {
        background: linear-gradient(135deg, #1e40af, #2563eb) !important;
        -webkit-background-clip: text !important;
        -webkit-text-fill-color: transparent !important;
    }
    :global([data-theme="light"]) .hero-cashflow-dashboard {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .flow-separator {
        background: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .smart-ai-widget {
        background: #eff6ff !important;
        border-color: #bfdbfe !important;
    }
    :global([data-theme="light"]) .ai-summary-text {
        color: #1e293b !important;
    }
    :global([data-theme="light"]) .deep-dive-advice {
        background: #ffffff !important;
        color: #334155 !important;
    }
    :global([data-theme="light"]) .dock-action-btn {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.04) !important;
    }
    :global([data-theme="light"]) .dock-title {
        color: #0f172a !important;
    }

    /* RESPONSIVE DESIGN */
    @media (max-width: 640px) {
        .hero-glass-card {
            padding: 18px 16px;
            border-radius: 22px;
        }
        .hero-amount-display {
            font-size: 29px;
        }
        .hero-cashflow-dashboard {
            flex-direction: column;
            gap: 10px;
        }
        .flow-separator {
            width: 100%;
            height: 1px;
        }
        .unified-action-dock {
            grid-template-columns: 1fr;
            gap: 8px;
        }
    }
</style>

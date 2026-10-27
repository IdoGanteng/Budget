<script>
    import { openAddTxModal, openTransferModal, openAddPocketModal, openRecurringModal, showConfirmModal, privacyMode } from '../stores/uiStore.js';
    import { filteredData, formatRp, deleteCustomPocket } from '../stores/financeStore.js';

    let pocketTab = 'cards'; // 'cards' | 'analytics'
    let selectedPocket = null;
    let hoveredSegment = null; // for interactive portfolio ribbon
    let hoveredCardId = null;

    $: totals = $filteredData.totals;
    $: shares = $filteredData.shares;
    $: pockets = $filteredData.computedPockets || [];

    // Dynamic metrics across all pockets (including custom pockets)
    $: liquidityPockets = pockets.filter(p => p.id === 'cash' || p.categoryTag === 'Kantong Bayar');
    $: totalLiquidityVal = liquidityPockets.reduce((sum, p) => sum + (p.amount || 0), 0);
    $: liquidityShare = Math.min(100, liquidityPockets.reduce((sum, p) => sum + (p.share || 0), 0));

    $: savingsPockets = pockets.filter(p => p.id === 'simpanan' || p.id === 'tabungan' || p.categoryTag === 'Kantong Nabung' || p.categoryTag === 'Kantong Impian' || p.categoryTag === 'Kebutuhan Rutin');
    $: totalSavingsVal = savingsPockets.reduce((sum, p) => sum + (p.amount || 0), 0);
    $: savingsShare = Math.min(100, savingsPockets.reduce((sum, p) => sum + (p.share || 0), 0));

    $: goldPockets = pockets.filter(p => p.id === 'tring' || p.id === 'jago' || p.categoryTag === 'Investasi' || p.isGram);
    $: totalGoldVal = goldPockets.reduce((sum, p) => sum + (p.amount || 0), 0);
    $: goldShare = Math.min(100, goldPockets.reduce((sum, p) => sum + (p.share || 0), 0));

    $: sortedPockets = [...pockets].sort((a, b) => b.amount - a.amount);

    function openDetail(p) {
        selectedPocket = p;
    }

    function closeDetail() {
        selectedPocket = null;
    }

    function handleQuickAction(p) {
        selectedPocket = null;
        // For investment/gold pockets, fund source should be cash instead of deducting from gold itself
        const fundingPocket = (p.id === 'tring' || p.id === 'jago') ? 'cash' : p.id;
        openAddTxModal({
            type: p.actionType || 'expense',
            category: p.actionCategory || 'makan',
            pocket: fundingPocket,
            title: p.actionTitle || `Catat di ${p.name}`
        });
    }

    function handleDeletePocket(p) {
        showConfirmModal({
            icon: '🗑️',
            title: 'Hapus Kantong',
            desc: `Apakah Anda yakin ingin menghapus kantong <b>"${p.name}"</b>? Catatan transaksi yang ada tidak akan terhapus.`,
            confirmText: 'Ya, Hapus',
            isDanger: true,
            onConfirm: () => {
                deleteCustomPocket(p.id);
            }
        });
    }

    function handleTransfer() {
        selectedPocket = null;
        openTransferModal();
    }

    function handlePocketBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeDetail();
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && selectedPocket) closeDetail(); }} />

<section class="pockets-container-section" id="kantong-section">
    <!-- SECTION HEADER WITH VIEW SWITCHER -->
    <div class="pockets-header">
        <div class="header-info-group">
            <div class="header-title-row">
                <h2 class="section-title">Kantong Saya</h2>
                <div class="view-switch-pills" role="tablist">
                    <button
                        type="button"
                        class="view-pill"
                        class:active={pocketTab === 'cards'}
                        on:click={() => pocketTab = 'cards'}
                        role="tab"
                        aria-selected={pocketTab === 'cards'}
                    >
                        <span>🗂️</span> Kartu
                    </button>
                    <button
                        type="button"
                        class="view-pill"
                        class:active={pocketTab === 'analytics'}
                        on:click={() => pocketTab = 'analytics'}
                        role="tab"
                        aria-selected={pocketTab === 'analytics'}
                    >
                        <span>📊</span> Analisa
                    </button>
                </div>
            </div>
            <p class="section-subtitle">Alokasi pos kas, tabungan, dan instrumen investasi Anda</p>
        </div>

        <div class="header-action-group">
            <button
                type="button"
                class="ghost-action-pill"
                on:click={openRecurringModal}
                title="Buka Jadwal Transaksi & Tagihan Rutin"
            >
                <span>📅</span> Tagihan Rutin
            </button>
            <button
                type="button"
                class="primary-action-pill"
                on:click={openAddPocketModal}
                title="Tambah Kantong Baru"
            >
                <span class="pill-plus">＋</span> Tambah Kantong
            </button>
            <button
                type="button"
                class="ghost-action-pill"
                on:click={openTransferModal}
                title="Pindah Saldo Antar Kantong"
            >
                <span>⇄</span> Pindah Dana
            </button>
        </div>
    </div>

    <!-- 1. MODE KARTU (CARD VIEW) -->
    {#if pocketTab === 'cards'}
        <!-- INTERACTIVE PORTFOLIO ALLOCATION RIBBON (CLEAN, NO OVERLAPPING TEXT) -->
        <div class="portfolio-ribbon-card">
            <div class="ribbon-headline">
                <div class="ribbon-title-col">
                    <span class="ribbon-title">Distribusi Alokasi Portofolio</span>
                    <span class="ribbon-hint">Sentuh segmen warna untuk rincian alokasi</span>
                </div>
                <div class="ribbon-total-col font-mono">
                    <span class="ribbon-total-label">Total Aset</span>
                    <span class="ribbon-total-value">{formatRp(totals.totalWealth, $privacyMode)}</span>
                </div>
            </div>

            <!-- INTERACTIVE RIBBON TRACK -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="ribbon-interactive-track" on:mouseleave={() => hoveredSegment = null} role="group" aria-label="Grafik Distribusi Portofolio">
                {#each pockets as p}
                    {#if p.share > 0}
                        <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                        <div
                            class="ribbon-segment"
                            class:highlighted={hoveredSegment && hoveredSegment.id === p.id}
                            style="width: {p.share}%; background: {p.color};"
                            on:mouseenter={() => hoveredSegment = p}
                            on:click={() => openDetail(p)}
                            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(p); } }}
                            role="button"
                            tabindex="0"
                            title="{p.name}: {p.share}% ({formatRp(p.amount, $privacyMode)})"
                        ></div>
                    {/if}
                {/each}
            </div>

            <!-- FLOATING DYNAMIC REVEAL TOOLTIP (REPLACES MESSY LABELS) -->
            <div class="ribbon-tooltip-dock">
                {#if hoveredSegment}
                    <div class="floating-segment-badge">
                        <span class="segment-dot" style="background: {hoveredSegment.color};"></span>
                        <strong class="segment-name">{hoveredSegment.name}</strong>
                        <span class="segment-pct font-mono">{hoveredSegment.share}% alokasi</span>
                        <span class="segment-sep">•</span>
                        <span class="segment-amount font-mono">{formatRp(hoveredSegment.amount, $privacyMode)}</span>
                    </div>
                {:else}
                    <!-- MINIMALIST DOTS PREVIEW -->
                    <div class="clean-dots-legend">
                        {#each pockets as p}
                            {#if p.share > 0}
                                <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                                <button
                                    type="button"
                                    class="micro-legend-item"
                                    on:mouseenter={() => hoveredSegment = p}
                                    on:click={() => openDetail(p)}
                                    title="Klik untuk detail {p.name}"
                                >
                                    <span class="micro-dot" style="background: {p.color};"></span>
                                    <span class="micro-name">{p.name}</span>
                                    <span class="micro-pct font-mono">{p.share}%</span>
                                </button>
                            {/if}
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- REFINED POCKETS GRID (PROGRESSIVE DISCLOSURE) -->
        <div class="refined-pockets-grid">
            {#each pockets as p}
                <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                <div
                    class="premium-pocket-card"
                    class:is-hovered={hoveredCardId === p.id}
                    on:mouseenter={() => hoveredCardId = p.id}
                    on:mouseleave={() => hoveredCardId = null}
                    on:click={() => openDetail(p)}
                    on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(p); } }}
                    role="button"
                    tabindex="0"
                    title="Klik untuk detail {p.name}"
                    style="--pocket-theme: {p.color};"
                >
                    <div class="pocket-card-body">
                        <!-- TOP ROW: IDENTITY & BALANCE -->
                        <div class="pocket-main-row">
                            <!-- LEFT: POCKET IDENTIFIER -->
                            <div class="pocket-id-cluster">
                                <div class="pocket-avatar-badge" style="background: {p.color}1c; color: {p.color}; border: 1px solid {p.color}35;">
                                    {p.icon}
                                </div>
                                <div class="pocket-title-col">
                                    <h3 class="pocket-heading">{p.name}</h3>
                                    <div class="pocket-sub-cluster">
                                        <span class="pocket-tag-micro">{p.categoryTag}</span>
                                        <span class="pocket-role-text">{p.subdesc}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- RIGHT: HERO BALANCE (PROMINENT) -->
                            <div class="pocket-balance-cluster">
                                <span class="pocket-balance-val font-mono">{formatRp(p.amount, $privacyMode)}</span>
                                {#if p.extraInfo}
                                    <span class="pocket-unit-sub font-mono">
                                        {$privacyMode ? '*** Gr' : p.extraInfo}
                                    </span>
                                {:else if p.target > 0}
                                    <span class="pocket-target-sub font-mono">
                                        Target: {formatRp(p.target, $privacyMode)}
                                    </span>
                                {/if}
                            </div>
                        </div>

                        <!-- PROGRESSIVE DISCLOSURE FOOTER: DIMMED UNTIL CARD HOVER -->
                        <div class="pocket-disclosure-footer" class:active-glow={hoveredCardId === p.id}>
                            <!-- PROGRESS TRACK -->
                            <div class="card-progress-track">
                                <div
                                    class="card-progress-bar"
                                    style="width: {p.targetProgress !== null && p.targetProgress !== undefined ? p.targetProgress : p.share}%; background: {p.color};"
                                ></div>
                            </div>

                            <!-- FOOTER STATS REVEAL -->
                            <div class="card-footer-meta">
                                <span class="footer-health-status {p.healthType}">
                                    {p.healthStatus}
                                </span>
                                <div class="footer-share-reveal">
                                    <span class="share-val font-mono">{p.share}%</span>
                                    <span class="share-label">porsi</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            {/each}

            <!-- ACTION CARD: TAMBAH KANTONG BARU -->
            <button
                type="button"
                class="add-new-pocket-card"
                on:click={openAddPocketModal}
                title="Buat pos kantong baru"
            >
                <div class="add-pocket-icon-box">＋</div>
                <div class="add-pocket-text-col">
                    <strong class="add-title">Tambah Kantong Baru</strong>
                    <span class="add-desc">Buat pos tabungan, belanja, atau impian personal</span>
                </div>
            </button>
        </div>

    <!-- 2. MODE ANALISA & ALOKASI -->
    {:else}
        <div class="analytics-dashboard-panel">
            <!-- TOP 3 HEALTH METRICS SCORECARDS -->
            <div class="scorecards-trio">
                <!-- METRIC 1: LIKUIDITAS -->
                <div class="modern-metric-card card-cyan">
                    <div class="metric-card-top">
                        <span class="metric-icon-wrap">💧</span>
                        <span class="metric-pill pill-cyan">Likuiditas</span>
                    </div>
                    <div class="metric-figure font-mono">{liquidityShare}%</div>
                    <div class="metric-nominal font-mono">{formatRp(totalLiquidityVal, $privacyMode)}</div>
                    <p class="metric-annotation">Dana siap pakai untuk operasional harian.</p>
                </div>

                <!-- METRIC 2: TABUNGAN -->
                <div class="modern-metric-card card-purple">
                    <div class="metric-card-top">
                        <span class="metric-icon-wrap">🛡️</span>
                        <span class="metric-pill pill-purple">Cadangan</span>
                    </div>
                    <div class="metric-figure font-mono">{savingsShare}%</div>
                    <div class="metric-nominal font-mono">{formatRp(totalSavingsVal, $privacyMode)}</div>
                    <p class="metric-annotation">Tabungan pokok & target masa depan aman.</p>
                </div>

                <!-- METRIC 3: INVESTASI & EMAS -->
                <div class="modern-metric-card card-gold">
                    <div class="metric-card-top">
                        <span class="metric-icon-wrap">🪙</span>
                        <span class="metric-pill pill-gold">Investasi</span>
                    </div>
                    <div class="metric-figure font-mono">{goldShare}%</div>
                    <div class="metric-nominal font-mono">{formatRp(totalGoldVal, $privacyMode)}</div>
                    <p class="metric-annotation">Lindung nilai inflasi & portofolio emas.</p>
                </div>
            </div>

            <!-- COMPARATIVE RANKING MATRIX -->
            <div class="ranking-panel-card">
                <div class="ranking-card-header">
                    <h3 class="ranking-title">🏆 Peringkat & Komposisi Kantong</h3>
                    <span class="ranking-caption">Urutan berdasarkan akumulasi saldo tertinggi</span>
                </div>
                <div class="ranking-items-list">
                    {#each sortedPockets as item, index}
                        <div
                            class="ranking-row-item"
                            on:click={() => openDetail(item)}
                            on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(item); } }}
                            role="button"
                            tabindex="0"
                            title="Klik untuk detail {item.name}"
                        >
                            <div class="ranking-item-top">
                                <div class="ranking-left-cluster">
                                    <span class="rank-index">#{index + 1}</span>
                                    <div class="rank-icon-badge" style="background: {item.color}1c; color: {item.color}; border: 1px solid {item.color}35;">
                                        {item.icon}
                                    </div>
                                    <div class="rank-label-col">
                                        <strong class="rank-name">{item.name}</strong>
                                        <span class="rank-role">{item.role}</span>
                                    </div>
                                </div>
                                <div class="ranking-right-cluster">
                                    <span class="rank-amount font-mono">{formatRp(item.amount, $privacyMode)}</span>
                                    <span class="rank-share-badge font-mono" style="background: {item.color}15; color: {item.color}; border: 1px solid {item.color}30;">
                                        {item.share}%
                                    </span>
                                </div>
                            </div>

                            <div class="rank-bar-bg">
                                <div class="rank-bar-fill" style="width: {item.share}%; background: {item.color};"></div>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- SMART ADVICE BANNER -->
            <div class="smart-advice-banner">
                <div class="advice-lamp-icon">💡</div>
                <div class="advice-text-col">
                    <strong>Rekomendasi Portofolio Pintar:</strong>
                    {#if shares.cashShare > 40}
                        <span>Porsi kas likuid Anda ({shares.cashShare}%) cukup tinggi. Pertimbangkan mengalihkan sebagian ke Emas atau Tabungan Simpanan untuk potensi imbal hasil lebih optimal.</span>
                    {:else if shares.cashShare < 15}
                        <span>Porsi kas siap pakai ({shares.cashShare}%) relatif tipis. Jaga cadangan kas harian agar tidak mengganggu pos tabungan pokok saat ada kebutuhan mendadak.</span>
                    {:else}
                        <span>Komposisi portofolio Anda seimbang! Proporsi antara likuiditas ({shares.cashShare}%), tabungan ({(shares.simShare + shares.priShare)}%), dan investasi ({(shares.trgShare + shares.jagShare)}%) telah memenuhi kaidah keuangan terencana.</span>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</section>

<!-- INTERACTIVE POCKET DEEP-DIVE MODAL -->
{#if selectedPocket}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-backdrop-overlay"
        on:click={handlePocketBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pocket-detail-title"
    >
        <div class="pocket-modal-container" role="document">
            <div class="modal-top-bar">
                <div class="modal-headline-group">
                    <div class="modal-icon-badge" style="background: {selectedPocket.color}22; border: 1px solid {selectedPocket.color}55;">
                        {selectedPocket.icon}
                    </div>
                    <div>
                        <span class="modal-tag">{selectedPocket.categoryTag}</span>
                        <h3 id="pocket-detail-title" class="modal-title">{selectedPocket.name}</h3>
                    </div>
                </div>
                <button type="button" class="modal-close-icon-btn" on:click={closeDetail} title="Tutup">✕</button>
            </div>

            <div class="modal-body-content">
                <!-- BALANCE DISPLAY -->
                <div class="modal-balance-card">
                    <span class="modal-balance-caption">Saldo Tersimpan</span>
                    <div class="modal-balance-number font-mono">{formatRp(selectedPocket.amount, $privacyMode)}</div>
                    <div class="modal-balance-pills">
                        <span class="modal-share-pill font-mono" style="background: {selectedPocket.color}22; color: {selectedPocket.color};">
                            {selectedPocket.share}% dari Total Portofolio
                        </span>
                        {#if selectedPocket.extraInfo}
                            <span class="modal-extra-pill font-mono">{$privacyMode ? '*** Gr' : selectedPocket.extraInfo}</span>
                        {/if}
                    </div>
                </div>

                <!-- INFO BOX -->
                <div class="modal-meta-box">
                    <div class="meta-field-row">
                        <span class="field-label">Peran Keuangan:</span>
                        <strong class="field-val">{selectedPocket.role}</strong>
                    </div>
                    {#if selectedPocket.target > 0}
                        <div class="meta-field-row">
                            <span class="field-label">Target Dana:</span>
                            <span class="field-val font-mono" style="color: #3b82f6; font-weight: 800;">
                                {formatRp(selectedPocket.target, $privacyMode)} ({selectedPocket.targetProgress || 0}%)
                            </span>
                        </div>
                    {/if}
                    <div class="meta-field-row">
                        <span class="field-label">Status Pos:</span>
                        <span class="field-health-badge {selectedPocket.healthType}">{selectedPocket.healthStatus}</span>
                    </div>
                    <p class="modal-insight-note">
                        {selectedPocket.insight}
                    </p>
                </div>

                <!-- ACTIONS -->
                <div class="modal-actions-container">
                    <div class="modal-action-buttons-row">
                        <button
                            type="button"
                            class="modal-btn-primary"
                            on:click={() => handleQuickAction(selectedPocket)}
                            style="background: {selectedPocket.color};"
                        >
                            <span>➕</span> Catat / Tambah
                        </button>
                        <button
                            type="button"
                            class="modal-btn-secondary"
                            on:click={handleTransfer}
                        >
                            <span>⇄</span> Pindah Saldo
                        </button>
                    </div>

                    {#if selectedPocket.isCustom}
                        <button
                            type="button"
                            class="modal-btn-danger"
                            on:click={() => {
                                const targetPocket = selectedPocket;
                                closeDetail();
                                handleDeletePocket(targetPocket);
                            }}
                        >
                            <span>🗑️</span> Hapus Kantong Ini
                        </button>
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}

<style>
    /* ==========================================================================
       SECTION CONTAINER & HEADER
       ========================================================================== */
    .pockets-container-section {
        margin-bottom: 24px;
        width: 100%;
    }

    .pockets-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        flex-wrap: wrap;
        gap: 12px;
        margin-bottom: 16px;
        padding: 0 4px;
    }
    .header-info-group {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .header-title-row {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .section-title {
        font-size: 19px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.3px;
        margin: 0;
    }
    .section-subtitle {
        font-size: 12px;
        color: #94a3b8;
        margin: 0;
    }

    .view-switch-pills {
        display: inline-flex;
        align-items: center;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        padding: 2.5px;
        gap: 2px;
    }
    .view-pill {
        background: transparent;
        border: none;
        border-radius: 100px;
        padding: 4px 11px;
        font-size: 11px;
        font-weight: 700;
        color: #94a3b8;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .view-pill:hover {
        color: #ffffff;
    }
    .view-pill.active {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.35);
    }

    .header-action-group {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .primary-action-pill {
        background: #2563eb;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.15);
        padding: 7px 14px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
    }
    .primary-action-pill:hover {
        background: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.35);
    }
    .ghost-action-pill {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: #cbd5e1;
        padding: 7px 14px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ghost-action-pill:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
    }

    /* ==========================================================================
       PORTFOLIO ALLOCATION RIBBON (INTERACTIVE & CLEAN)
       ========================================================================== */
    .portfolio-ribbon-card {
        background: linear-gradient(145deg, rgba(22, 31, 48, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 16px 20px;
        margin-bottom: 16px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .ribbon-headline {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
    }
    .ribbon-title-col {
        display: flex;
        flex-direction: column;
    }
    .ribbon-title {
        font-size: 12.5px;
        font-weight: 800;
        color: #cbd5e1;
    }
    .ribbon-hint {
        font-size: 10px;
        color: #64748b;
    }
    .ribbon-total-col {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
    }
    .ribbon-total-label {
        font-size: 9.5px;
        font-weight: 700;
        text-transform: uppercase;
        color: #94a3b8;
    }
    .ribbon-total-value {
        font-size: 13.5px;
        font-weight: 800;
        color: #ffffff;
    }

    /* TRACK & SEGMENTS */
    .ribbon-interactive-track {
        height: 10px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.06);
        overflow: hidden;
        display: flex;
        margin-bottom: 10px;
        transition: height 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .ribbon-interactive-track:hover {
        height: 14px;
    }
    .ribbon-segment {
        height: 100%;
        cursor: pointer;
        transition: filter 0.2s ease, opacity 0.2s ease;
    }
    .ribbon-segment:hover,
    .ribbon-segment.highlighted {
        filter: brightness(1.25);
        box-shadow: inset 0 0 4px rgba(255, 255, 255, 0.5);
    }

    /* REVEAL TOOLTIP DOCK */
    .ribbon-tooltip-dock {
        min-height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .floating-segment-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(15, 23, 42, 0.85);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 4px 12px;
        border-radius: 100px;
        font-size: 11.5px;
        animation: fadeIn 0.2s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }
    .segment-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
    }
    .segment-name {
        color: #ffffff;
        font-weight: 800;
    }
    .segment-pct {
        color: #60a5fa;
        font-weight: 800;
    }
    .segment-sep {
        color: #64748b;
    }
    .segment-amount {
        color: #cbd5e1;
    }

    /* MINIMALIST DOTS */
    .clean-dots-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 10px;
        justify-content: flex-start;
        width: 100%;
    }
    .micro-legend-item {
        background: transparent;
        border: none;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11px;
        color: #94a3b8;
        cursor: pointer;
        padding: 2px 6px;
        border-radius: 6px;
        transition: all 0.2s ease;
    }
    .micro-legend-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #ffffff;
    }
    .micro-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
    }
    .micro-name {
        font-weight: 600;
    }
    .micro-pct {
        color: #64748b;
        font-size: 10px;
    }

    /* ==========================================================================
       POCKET CARDS GRID (PROGRESSIVE DISCLOSURE)
       ========================================================================== */
    .refined-pockets-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 14px;
        width: 100%;
    }
    @media (max-width: 640px) {
        .refined-pockets-grid {
            grid-template-columns: 1fr;
        }
    }

    .premium-pocket-card {
        background: linear-gradient(145deg, rgba(22, 31, 48, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-top: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 22px;
        padding: 18px 20px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.06);
        position: relative;
        overflow: hidden;
    }
    .premium-pocket-card:hover,
    .premium-pocket-card.is-hovered {
        transform: translateY(-4px);
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow: 0 18px 36px -8px rgba(0, 0, 0, 0.7),
                    0 0 24px -4px var(--pocket-theme, #3b82f6),
                    inset 0 1px 2px rgba(255, 255, 255, 0.15);
    }
    .premium-pocket-card:active {
        transform: scale(0.99);
    }

    .pocket-card-body {
        display: flex;
        flex-direction: column;
        gap: 12px;
        width: 100%;
    }

    /* TOP ROW CLUSTERS */
    .pocket-main-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
    }
    .pocket-id-cluster {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
        flex: 1;
    }
    .pocket-avatar-badge {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 19px;
        flex-shrink: 0;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .premium-pocket-card:hover .pocket-avatar-badge {
        transform: scale(1.08);
    }

    .pocket-title-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
    }
    .pocket-heading {
        font-size: 15px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
    .pocket-sub-cluster {
        display: flex;
        align-items: center;
        gap: 6px;
        line-height: 1.2;
    }
    .pocket-tag-micro {
        font-size: 9.5px;
        font-weight: 800;
        text-transform: uppercase;
        color: #94a3b8;
        letter-spacing: 0.3px;
    }
    .pocket-role-text {
        font-size: 10.5px;
        color: #64748b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    /* BALANCE CLUSTER */
    .pocket-balance-cluster {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        text-align: right;
        flex-shrink: 0;
    }
    .pocket-balance-val {
        font-size: 17.5px;
        font-weight: 800;
        color: #ffffff;
        letter-spacing: -0.3px;
        line-height: 1.2;
    }
    .pocket-unit-sub,
    .pocket-target-sub {
        font-size: 10.5px;
        color: #94a3b8;
        margin-top: 1px;
    }

    /* PROGRESSIVE DISCLOSURE FOOTER */
    .pocket-disclosure-footer {
        display: flex;
        flex-direction: column;
        gap: 6px;
        opacity: 0.35;
        transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .pocket-disclosure-footer.active-glow,
    .premium-pocket-card:hover .pocket-disclosure-footer {
        opacity: 1;
    }

    .card-progress-track {
        height: 4px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }
    .card-progress-bar {
        height: 100%;
        border-radius: 100px;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .card-footer-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10.5px;
    }
    .footer-health-status {
        font-weight: 700;
        color: #94a3b8;
    }
    .footer-health-status.safe { color: #10b981; }
    .footer-health-status.warning { color: #f59e0b; }
    .footer-health-status.info { color: #3b82f6; }

    .footer-share-reveal {
        display: inline-flex;
        align-items: center;
        gap: 3px;
    }
    .share-val {
        font-weight: 800;
        color: #ffffff;
    }
    .share-label {
        color: #64748b;
        font-size: 9.5px;
    }

    /* ADD POCKET ACTION CARD */
    .refined-pockets-grid > .add-new-pocket-card {
        grid-column: 1 / -1;
    }
    .add-new-pocket-card {
        background: rgba(22, 31, 48, 0.45);
        border: 2px dashed rgba(255, 255, 255, 0.12);
        border-radius: 20px;
        padding: 16px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        text-align: left;
        width: 100%;
    }
    .add-new-pocket-card:hover {
        background: rgba(37, 99, 235, 0.1);
        border-color: rgba(59, 130, 246, 0.5);
        transform: translateY(-2px);
        box-shadow: 0 10px 24px -4px rgba(0, 0, 0, 0.4);
    }
    .add-pocket-icon-box {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: rgba(59, 130, 246, 0.15);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #60a5fa;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        font-weight: 800;
        flex-shrink: 0;
        transition: transform 0.25s ease;
    }
    .add-new-pocket-card:hover .add-pocket-icon-box {
        background: #2563eb;
        color: #ffffff;
        transform: rotate(90deg) scale(1.06);
    }
    .add-pocket-text-col {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .add-title {
        color: #ffffff;
        font-size: 14.5px;
    }
    .add-desc {
        color: #94a3b8;
        font-size: 11.5px;
    }

    /* ==========================================================================
       ANALYTICS VIEW
       ========================================================================== */
    .analytics-dashboard-panel {
        display: flex;
        flex-direction: column;
        gap: 16px;
        animation: fadeIn 0.25s ease-out;
    }
    .scorecards-trio {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 12px;
    }
    .modern-metric-card {
        background: linear-gradient(145deg, rgba(22, 31, 48, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 6px;
    }
    .metric-card-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2px;
    }
    .metric-icon-wrap {
        font-size: 18px;
    }
    .metric-pill {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 8px;
        border-radius: 100px;
    }
    .pill-cyan { background: rgba(6, 182, 212, 0.15); color: #06b6d4; border: 1px solid rgba(6, 182, 212, 0.3); }
    .pill-purple { background: rgba(139, 92, 246, 0.15); color: #8b5cf6; border: 1px solid rgba(139, 92, 246, 0.3); }
    .pill-gold { background: rgba(234, 179, 8, 0.15); color: #eab308; border: 1px solid rgba(234, 179, 8, 0.3); }

    .metric-figure {
        font-size: 26px;
        font-weight: 800;
        color: #ffffff;
        line-height: 1.1;
    }
    .metric-nominal {
        font-size: 13.5px;
        font-weight: 700;
        color: #94a3b8;
    }
    .metric-annotation {
        font-size: 11px;
        color: #64748b;
        margin: 0;
        line-height: 1.35;
    }

    /* RANKING MATRIX */
    .ranking-panel-card {
        background: linear-gradient(145deg, rgba(22, 31, 48, 0.75) 0%, rgba(15, 23, 42, 0.85) 100%);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 18px 20px;
    }
    .ranking-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
    }
    .ranking-title {
        font-size: 15px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
    }
    .ranking-caption {
        font-size: 11px;
        color: #94a3b8;
    }

    .ranking-items-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .ranking-row-item {
        background: rgba(15, 23, 42, 0.6);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        padding: 10px 14px;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 8px;
        transition: all 0.2s ease;
    }
    .ranking-row-item:hover {
        background: rgba(255, 255, 255, 0.06);
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-2px);
    }
    .ranking-item-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
    }
    .ranking-left-cluster {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .rank-index {
        font-size: 12px;
        font-weight: 800;
        color: #64748b;
        min-width: 22px;
    }
    .rank-icon-badge {
        width: 32px;
        height: 32px;
        border-radius: 9px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
    }
    .rank-label-col {
        display: flex;
        flex-direction: column;
        gap: 1px;
    }
    .rank-name {
        font-size: 13.5px;
        color: #ffffff;
    }
    .rank-role {
        font-size: 10.5px;
        color: #94a3b8;
    }
    .ranking-right-cluster {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .rank-amount {
        font-size: 14px;
        font-weight: 800;
        color: #ffffff;
    }
    .rank-share-badge {
        font-size: 10.5px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 100px;
    }

    .rank-bar-bg {
        height: 4px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
        width: 100%;
    }
    .rank-bar-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.6s ease;
    }

    /* SMART ADVICE */
    .smart-advice-banner {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
        border: 1px solid rgba(59, 130, 246, 0.25);
        border-radius: 16px;
        padding: 12px 16px;
    }
    .advice-lamp-icon {
        font-size: 18px;
        line-height: 1.2;
    }
    .advice-text-col {
        display: flex;
        flex-direction: column;
        gap: 3px;
        font-size: 12px;
        color: #cbd5e1;
        line-height: 1.45;
    }
    .advice-text-col strong {
        color: #60a5fa;
    }

    /* ==========================================================================
       MODAL STYLES
       ========================================================================== */
    .modal-backdrop-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        padding: 16px;
        animation: fadeIn 0.2s ease;
    }
    .pocket-modal-container {
        background: #161f30;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 24px;
        width: 100%;
        max-width: 440px;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.8);
        overflow: hidden;
        animation: scaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .modal-top-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 18px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .modal-headline-group {
        display: flex;
        align-items: center;
        gap: 12px;
    }
    .modal-icon-badge {
        width: 38px;
        height: 38px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
    }
    .modal-tag {
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        color: #94a3b8;
    }
    .modal-title {
        font-size: 16px;
        font-weight: 800;
        color: #ffffff;
        margin: 0;
    }
    .modal-close-icon-btn {
        background: rgba(255, 255, 255, 0.08);
        border: none;
        color: #94a3b8;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .modal-close-icon-btn:hover {
        background: rgba(255, 255, 255, 0.16);
        color: #ffffff;
    }

    .modal-body-content {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }
    .modal-balance-card {
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 16px;
        padding: 16px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
    }
    .modal-balance-caption {
        font-size: 11px;
        color: #94a3b8;
        text-transform: uppercase;
        font-weight: 700;
    }
    .modal-balance-number {
        font-size: 26px;
        font-weight: 800;
        color: #ffffff;
    }
    .modal-balance-pills {
        display: flex;
        gap: 6px;
        margin-top: 6px;
    }
    .modal-share-pill,
    .modal-extra-pill {
        font-size: 10.5px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.08);
        color: #cbd5e1;
    }

    .modal-meta-box {
        background: rgba(15, 23, 42, 0.4);
        border-radius: 14px;
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .meta-field-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
    }
    .field-label { color: #94a3b8; }
    .field-val { color: #ffffff; }
    .field-health-badge {
        font-size: 10px;
        font-weight: 700;
        padding: 2px 7px;
        border-radius: 100px;
    }
    .field-health-badge.safe { background: rgba(16, 185, 129, 0.15); color: #10b981; }
    .field-health-badge.info { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
    .field-health-badge.warning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }

    .modal-insight-note {
        font-size: 11.5px;
        color: #cbd5e1;
        margin: 6px 0 0 0;
        line-height: 1.4;
        border-top: 1px dashed rgba(255, 255, 255, 0.08);
        padding-top: 8px;
    }

    .modal-actions-container {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    .modal-action-buttons-row {
        display: flex;
        gap: 8px;
    }
    .modal-btn-primary {
        flex: 1;
        border: none;
        color: #ffffff;
        font-weight: 800;
        font-size: 12.5px;
        padding: 10px;
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: transform 0.2s ease;
    }
    .modal-btn-primary:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
    }
    .modal-btn-secondary {
        flex: 1;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        font-size: 12.5px;
        padding: 10px;
        border-radius: 12px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
    }
    .modal-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.14);
    }
    .modal-btn-danger {
        width: 100%;
        padding: 9px;
        border-radius: 12px;
        font-size: 11.5px;
        font-weight: 700;
        border: 1px solid rgba(244, 63, 94, 0.3);
        background: rgba(244, 63, 94, 0.1);
        color: #f43f5e;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.2s ease;
    }
    .modal-btn-danger:hover {
        background: rgba(244, 63, 94, 0.2);
    }

    /* ==========================================================================
       LIGHT THEME ADAPTATIONS
       ========================================================================== */
    :global([data-theme="light"]) .section-title {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .section-subtitle {
        color: #64748b !important;
    }
    :global([data-theme="light"]) .portfolio-ribbon-card,
    :global([data-theme="light"]) .premium-pocket-card,
    :global([data-theme="light"]) .modern-metric-card,
    :global([data-theme="light"]) .ranking-panel-card {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05) !important;
    }
    :global([data-theme="light"]) .ribbon-title,
    :global([data-theme="light"]) .pocket-heading,
    :global([data-theme="light"]) .pocket-balance-val,
    :global([data-theme="light"]) .metric-figure,
    :global([data-theme="light"]) .ranking-title,
    :global([data-theme="light"]) .rank-name,
    :global([data-theme="light"]) .rank-amount {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .ribbon-interactive-track {
        background: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .floating-segment-badge {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .segment-name {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .card-progress-track,
    :global([data-theme="light"]) .rank-bar-bg {
        background: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .ranking-row-item {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .add-new-pocket-card {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
    }
    :global([data-theme="light"]) .add-title {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .pocket-modal-container {
        background: #ffffff !important;
        border-color: #cbd5e1 !important;
    }
    :global([data-theme="light"]) .modal-title,
    :global([data-theme="light"]) .modal-balance-number,
    :global([data-theme="light"]) .field-val {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .modal-balance-card,
    :global([data-theme="light"]) .modal-meta-box {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .modal-btn-secondary {
        background: #f1f5f9 !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
    }

    /* KEYFRAMES */
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes scaleUp {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
    }
</style>

<script>
    import { openAddTxModal, openTransferModal } from '../stores/uiStore.js';
    import { filteredData, formatRp } from '../stores/financeStore.js';

    let pocketTab = 'cards'; // 'cards' | 'analytics'
    let selectedPocket = null;

    $: totals = $filteredData.totals;
    $: shares = $filteredData.shares;

    $: pockets = [
        {
            id: 'cash',
            name: 'Kas Tunai',
            categoryTag: 'Kantong Bayar',
            role: 'Likuiditas Harian',
            icon: '💵',
            color: '#00C49F',
            bgClass: 'bg-teal',
            barClass: 'bar-teal',
            pocketClass: 'pocket-teal',
            amount: totals.cash,
            share: shares.cashShare,
            subdesc: 'Kas harian & likuid',
            healthStatus: shares.cashShare >= 15 && shares.cashShare <= 35 ? 'Likuiditas Ideal' : shares.cashShare < 15 ? 'Cadangan Menipis' : 'Kas Berlebih',
            healthType: shares.cashShare >= 15 && shares.cashShare <= 35 ? 'safe' : shares.cashShare < 15 ? 'warning' : 'info',
            insight: 'Digunakan untuk belanja kebutuhan harian, makan, dan operasional rutin.',
            actionType: 'expense',
            actionCategory: 'makan',
            actionTitle: 'Catat Pengeluaran Kas'
        },
        {
            id: 'simpanan',
            name: 'Simpanan Wajib',
            categoryTag: 'Kantong Nabung',
            role: 'Dana Darurat Pokok',
            icon: '🏦',
            color: '#8b5cf6',
            bgClass: 'bg-purple',
            barClass: 'bar-purple',
            pocketClass: 'pocket-purple',
            amount: totals.totalSimAll,
            share: shares.simShare,
            subdesc: 'Tabungan cadangan pokok',
            healthStatus: shares.simShare >= 20 ? 'Cadangan Prima' : 'Tingkatkan Pos',
            healthType: shares.simShare >= 20 ? 'safe' : 'warning',
            insight: 'Pilar perlindungan darurat keluarga yang tidak boleh diganggu untuk konsumsi santai.',
            actionType: 'simpanan',
            actionCategory: 'simpanan',
            actionTitle: 'Tambah Simpanan Wajib'
        },
        {
            id: 'pribadi',
            name: 'Tabungan Pribadi',
            categoryTag: 'Kantong Impian',
            role: 'Target & Impian',
            icon: '🎯',
            color: '#FF7A00',
            bgClass: 'bg-orange',
            barClass: 'bar-orange',
            pocketClass: 'pocket-orange',
            amount: totals.totalPriAll,
            share: shares.priShare,
            subdesc: 'Target & impian bebas',
            healthStatus: shares.priShare > 0 ? 'Fokus Sasaran' : 'Mulai Menabung',
            healthType: shares.priShare > 0 ? 'safe' : 'neutral',
            insight: 'Pos fleksibel untuk self-reward, gadget idaman, hobi, dan liburan terencana.',
            actionType: 'pribadi',
            actionCategory: 'pribadi',
            actionTitle: 'Tambah Tabungan Pribadi'
        },
        {
            id: 'tring',
            name: 'Emas Tring',
            categoryTag: 'Investasi Fisik',
            role: 'Lindung Nilai Batangan',
            icon: '🪙',
            color: '#FDB813',
            bgClass: 'bg-yellow',
            barClass: 'bar-yellow',
            pocketClass: 'pocket-yellow',
            amount: totals.totalTrgRp,
            extraInfo: `${totals.totalTrgAll.toFixed(2)} Gram`,
            share: shares.trgShare,
            subdesc: `Fisik: ${totals.totalTrgAll.toFixed(2)} Gr batangan`,
            healthStatus: 'Proteksi Inflasi',
            healthType: 'safe',
            insight: 'Aset emas batangan fisik tersimpan aman sebagai jangkar stabilitas daya beli.',
            actionType: 'tring',
            actionCategory: 'tring',
            actionTitle: 'Catat Emas Tring'
        },
        {
            id: 'jago',
            name: 'Emas Jago',
            categoryTag: 'Investasi Digital',
            role: 'Emas Digital Likuid',
            icon: '🦁',
            color: '#ea580c',
            bgClass: 'bg-amber',
            barClass: 'bar-amber',
            pocketClass: 'pocket-amber',
            amount: totals.totalJagAll,
            share: shares.jagShare,
            subdesc: 'Portofolio Emas Jago',
            healthStatus: 'Aset Likuid Digital',
            healthType: 'safe',
            insight: 'Portofolio emas digital likuid yang siap dicairkan atau ditambah kapan pun dibutuhkan.',
            actionType: 'jago',
            actionCategory: 'jago',
            actionTitle: 'Catat Emas Jago'
        }
    ];

    $: totalGoldVal = totals.totalTrgRp + totals.totalJagAll;
    $: totalSavingsVal = totals.totalSimAll + totals.totalPriAll;
    $: sortedPockets = [...pockets].sort((a, b) => b.amount - a.amount);

    function openDetail(p) {
        selectedPocket = p;
    }

    function closeDetail() {
        selectedPocket = null;
    }

    function handleQuickAction(p) {
        selectedPocket = null;
        openAddTxModal({ type: p.actionType, category: p.actionCategory, title: p.actionTitle });
    }

    function handleTransfer() {
        selectedPocket = null;
        openTransferModal();
    }
</script>

<div class="jago-pockets-section" id="kantong-section">
    <!-- SECTION HEADER WITH INNOVATIVE VIEW SWITCHER -->
    <div class="jago-section-header">
        <div class="jago-header-title">
            <div class="jago-title-row">
                <h2>Kantong Saya</h2>
                <div class="pocket-view-toggle-pills" role="tablist">
                    <button
                        type="button"
                        class="pocket-toggle-pill"
                        class:active={pocketTab === 'cards'}
                        on:click={() => pocketTab = 'cards'}
                        role="tab"
                        aria-selected={pocketTab === 'cards'}
                    >
                        <span>🗂️</span> Kartu
                    </button>
                    <button
                        type="button"
                        class="pocket-toggle-pill"
                        class:active={pocketTab === 'analytics'}
                        on:click={() => pocketTab = 'analytics'}
                        role="tab"
                        aria-selected={pocketTab === 'analytics'}
                    >
                        <span>📊</span> Analisa
                    </button>
                </div>
            </div>
            <p>Alokasi pos kas, tabungan, dan instrumen investasi Anda</p>
        </div>
        <div class="jago-header-actions">
            <button type="button" class="btn-jago-ghost" on:click={openTransferModal} title="Pindah Saldo Antar Kantong">
                <span>⇄</span> Pindah Dana
            </button>
        </div>
    </div>

    <!-- 1. MODE KARTU (CARD VIEW) -->
    {#if pocketTab === 'cards'}
        <!-- PORTFOLIO ALLOCATION MINI RIBBON -->
        <div class="pocket-ribbon-card">
            <div class="ribbon-header">
                <span class="ribbon-title">Distribusi Alokasi Portofolio</span>
                <span class="ribbon-total font-mono">{formatRp(totals.totalWealth)}</span>
            </div>
            <div class="pocket-ribbon-track">
                {#each pockets as p}
                    {#if p.share > 0}
                        <div
                            class="ribbon-segment"
                            style="width: {p.share}%; background: {p.color};"
                            title="{p.name}: {p.share}% ({formatRp(p.amount)})"
                        ></div>
                    {/if}
                {/each}
            </div>
            <div class="ribbon-legend">
                {#each pockets as p}
                    <div class="legend-item" on:click={() => openDetail(p)} role="button" tabindex="0">
                        <span class="legend-dot" style="background: {p.color};"></span>
                        <span class="legend-name">{p.name}</span>
                        <span class="legend-val font-mono">{p.share}%</span>
                    </div>
                {/each}
            </div>
        </div>

        <!-- 5 POCKET CARDS GRID -->
        <div class="stats-grid jago-pockets-grid section-stats">
            {#each pockets as p}
                <button
                    type="button"
                    class="stat-box jago-pocket-card {p.pocketClass}"
                    on:click={() => openDetail(p)}
                    title="Klik untuk analisa detail {p.name}"
                >
                    <div class="pocket-top">
                        <div class="pocket-badge-wrap">
                            <div class="pocket-icon-badge {p.bgClass}">{p.icon}</div>
                            <div class="pocket-meta">
                                <span class="pocket-type-tag">{p.categoryTag}</span>
                                <h3>{p.name}</h3>
                            </div>
                        </div>
                        <span class="pocket-inspect-chip">Analisa ↗</span>
                    </div>
                    <div class="pocket-balance-wrap">
                        <p class="pocket-amount">{formatRp(p.amount)}</p>
                        <div class="pocket-progress-wrap">
                            <div class="pocket-bar-track">
                                <div class="pocket-bar-fill {p.barClass}" style="width: {p.share}%;"></div>
                            </div>
                            <div class="pocket-footer-stacked">
                                <div class="pocket-share-row">
                                    <span class="pocket-share-label">Alokasi Portofolio</span>
                                    <span class="pocket-share-val font-mono">{p.share}%</span>
                                </div>
                                <p class="pocket-subdesc">{p.subdesc}</p>
                            </div>
                        </div>
                    </div>
                </button>
            {/each}
        </div>

    <!-- 2. MODE ANALISA & ALOKASI (INNOVATIVE ANALYTICS VIEW) -->
    {:else}
        <div class="pocket-analytics-panel">
            <!-- TOP HEALTH SCORECARDS -->
            <div class="analytics-metrics-grid">
                <!-- METRIC 1: DANA KAS SIAP PAKAI -->
                <div class="metric-scorecard card-liquidity">
                    <div class="metric-top">
                        <span class="metric-icon">💧</span>
                        <span class="metric-status-badge badge-safe">Likuiditas</span>
                    </div>
                    <div class="metric-num font-mono">{shares.cashShare}%</div>
                    <div class="metric-sub font-mono">{formatRp(totals.cash)}</div>
                    <p class="metric-desc">Dana siap pakai untuk operasional &amp; belanja bulan ini.</p>
                </div>

                <!-- METRIC 2: TABUNGAN & CADANGAN -->
                <div class="metric-scorecard card-savings">
                    <div class="metric-top">
                        <span class="metric-icon">🛡️</span>
                        <span class="metric-status-badge badge-purple">Cadangan</span>
                    </div>
                    <div class="metric-num font-mono">{(shares.simShare + shares.priShare)}%</div>
                    <div class="metric-sub font-mono">{formatRp(totalSavingsVal)}</div>
                    <p class="metric-desc">Tabungan wajib pokok &amp; target impian terproteksi.</p>
                </div>

                <!-- METRIC 3: LINDUNG NILAI EMAS -->
                <div class="metric-scorecard card-gold">
                    <div class="metric-top">
                        <span class="metric-icon">🪙</span>
                        <span class="metric-status-badge badge-gold">Emas Murni</span>
                    </div>
                    <div class="metric-num font-mono">{(shares.trgShare + shares.jagShare)}%</div>
                    <div class="metric-sub font-mono">{formatRp(totalGoldVal)}</div>
                    <p class="metric-desc">Fisik &amp; digital untuk perlindungan terhadap inflasi.</p>
                </div>
            </div>

            <!-- COMPARATIVE RANKING MATRIX -->
            <div class="pocket-ranking-box">
                <div class="ranking-header">
                    <h3>🏆 Peringkat &amp; Komposisi Kantong</h3>
                    <span class="ranking-caption">Urut berdasarkan akumulasi saldo tertinggi</span>
                </div>
                <div class="ranking-list">
                    {#each sortedPockets as item, index}
                        <div class="ranking-item" on:click={() => openDetail(item)} role="button" tabindex="0">
                            <div class="ranking-left">
                                <span class="rank-number">#{index + 1}</span>
                                <div class="rank-avatar" style="background: {item.color}22; color: {item.color}; border: 1px solid {item.color}44;">
                                    {item.icon}
                                </div>
                                <div class="rank-info">
                                    <div class="rank-name-row">
                                        <strong class="rank-name">{item.name}</strong>
                                        <span class="rank-role-pill">{item.role}</span>
                                    </div>
                                    <div class="rank-track-wrap">
                                        <div class="rank-track">
                                            <div class="rank-fill" style="width: {item.share}%; background: {item.color};"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="ranking-right">
                                <span class="rank-amount font-mono">{formatRp(item.amount)}</span>
                                <span class="rank-share font-mono" style="color: {item.color};">{item.share}%</span>
                            </div>
                        </div>
                    {/each}
                </div>
            </div>

            <!-- SMART RECOMMENDATION ADVICE -->
            <div class="pocket-smart-advice">
                <div class="advice-icon">💡</div>
                <div class="advice-content">
                    <strong>Rekomendasi Alokasi Pintar:</strong>
                    {#if shares.cashShare > 40}
                        <span>Porsi kas likuid Anda ({shares.cashShare}%) cukup tinggi. Pertimbangkan mengalihkan sebagian ke Emas atau Tabungan Simpanan untuk mengoptimalkan potensi imbal hasil.</span>
                    {:else if shares.cashShare < 15}
                        <span>Porsi kas siap pakai ({shares.cashShare}%) relatif tipis. Jaga cadangan kas harian agar tidak mengganggu pos tabungan pokok saat ada pengeluaran mendadak.</span>
                    {:else}
                        <span>Komposisi portofolio Anda sangat sehat dan seimbang! Pembagian antara likuiditas ({shares.cashShare}%), tabungan ({(shares.simShare + shares.priShare)}%), dan emas ({(shares.trgShare + shares.jagShare)}%) telah memenuhi kaidah keuangan terencana.</span>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>

<!-- INTERACTIVE POCKET DEEP-DIVE MODAL -->
{#if selectedPocket}
    <div
        class="modal-overlay active"
        on:click={closeDetail}
        on:keydown={(e) => { if (e.key === 'Escape') closeDetail(); }}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
    >
        <div class="modal-box pocket-detail-modal" on:click|stopPropagation role="document">
            <div class="pocket-modal-header">
                <div class="pocket-modal-title-wrap">
                    <div class="pocket-modal-icon" style="background: {selectedPocket.color}22; border: 1px solid {selectedPocket.color}55;">
                        {selectedPocket.icon}
                    </div>
                    <div>
                        <span class="pocket-modal-tag">{selectedPocket.categoryTag}</span>
                        <h3>{selectedPocket.name}</h3>
                    </div>
                </div>
                <button type="button" class="pocket-modal-close" on:click={closeDetail} title="Tutup">✕</button>
            </div>

            <div class="pocket-modal-body">
                <!-- BALANCE DISPLAY -->
                <div class="pocket-modal-balance-card">
                    <span class="balance-caption">Saldo Tersimpan</span>
                    <div class="balance-number font-mono">{formatRp(selectedPocket.amount)}</div>
                    <div class="balance-meta-row">
                        <span class="share-badge font-mono" style="background: {selectedPocket.color}22; color: {selectedPocket.color};">
                            {selectedPocket.share}% dari Portofolio
                        </span>
                        {#if selectedPocket.extraInfo}
                            <span class="extra-badge font-mono">{selectedPocket.extraInfo}</span>
                        {/if}
                    </div>
                </div>

                <!-- ROLE & INSIGHT -->
                <div class="pocket-modal-info-box">
                    <div class="info-row">
                        <span class="info-label">Peran Keuangan:</span>
                        <strong class="info-val">{selectedPocket.role}</strong>
                    </div>
                    <div class="info-row">
                        <span class="info-label">Status Pos:</span>
                        <span class="health-pill {selectedPocket.healthType}">{selectedPocket.healthStatus}</span>
                    </div>
                    <p class="pocket-insight-text">
                        {selectedPocket.insight}
                    </p>
                </div>

                <!-- ACTIONS -->
                <div class="pocket-modal-actions">
                    <button
                        type="button"
                        class="btn-primary"
                        on:click={() => handleQuickAction(selectedPocket)}
                        style="background: {selectedPocket.color}; border: none;"
                    >
                        <span>➕</span> Catat / Tambah Saldo
                    </button>
                    <button
                        type="button"
                        class="btn-secondary"
                        on:click={handleTransfer}
                    >
                        <span>⇄</span> Pindah Saldo ke Kantong Lain
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<script>
    import { openAddTxModal, openTransferModal } from '../stores/uiStore.js';
    import { filteredData, formatRp } from '../stores/financeStore.js';

    $: totals = $filteredData.totals;
    $: shares = $filteredData.shares;

    function handlePocketClick(key, type, title) {
        openAddTxModal({ type, category: 'investasi', title });
    }
</script>

<div class="jago-pockets-section" id="kantong-section">
    <div class="jago-section-header">
        <div class="jago-header-title">
            <div class="jago-title-row">
                <h2>Kantong Saya</h2>
                <span class="jago-pockets-count-badge">5 Kantong</span>
            </div>
            <p>Alokasi pos kas, tabungan, dan investasi Anda</p>
        </div>
        <div class="jago-header-actions">
            <button type="button" class="btn-jago-ghost" on:click={openTransferModal} title="Pindah Dana Antar Kantong">
                <span>⇄</span> Pindah Dana
            </button>
        </div>
    </div>

    <div class="stats-grid jago-pockets-grid section-stats">
        <!-- 1. KANTONG UTAMA / KAS TUNAI -->
        <button
            type="button"
            class="stat-box c-balance jago-pocket-card pocket-teal"
            on:click={() => openAddTxModal({ type: 'expense', category: 'makan', title: 'Catat Pengeluaran Kas' })}
            title="Klik untuk catat pengeluaran kas"
        >
            <div class="pocket-top">
                <div class="pocket-badge-wrap">
                    <div class="pocket-icon-badge bg-teal">💵</div>
                    <div class="pocket-meta">
                        <span class="pocket-type-tag">Kantong Bayar</span>
                        <h3>Kas Tunai</h3>
                    </div>
                </div>
                <span class="stat-trend trend-flat">Live</span>
            </div>
            <div class="pocket-balance-wrap">
                <p class="pocket-amount">{formatRp(totals.cash)}</p>
                <div class="pocket-progress-wrap">
                    <div class="pocket-bar-track">
                        <div class="pocket-bar-fill bar-teal" style="width: {shares.cashShare}%;"></div>
                    </div>
                    <div class="pocket-footer-stacked">
                        <div class="pocket-share-row">
                            <span class="pocket-share-label">Alokasi</span>
                            <span class="pocket-share-val">{shares.cashShare}%</span>
                        </div>
                        <p class="pocket-subdesc">Kas harian &amp; likuid</p>
                    </div>
                </div>
            </div>
        </button>

        <!-- 2. KANTONG SIMPANAN WAJIB -->
        <button
            type="button"
            class="stat-box c-simpanan jago-pocket-card pocket-purple"
            on:click={() => handlePocketClick('simpanan', 'simpanan', 'Tambah Simpanan Wajib')}
            title="Klik untuk tambah simpanan"
        >
            <div class="pocket-top">
                <div class="pocket-badge-wrap">
                    <div class="pocket-icon-badge bg-purple">🏦</div>
                    <div class="pocket-meta">
                        <span class="pocket-type-tag">Kantong Nabung</span>
                        <h3>Simpanan Wajib</h3>
                    </div>
                </div>
                <span class="stat-trend trend-flat">Live</span>
            </div>
            <div class="pocket-balance-wrap">
                <p class="pocket-amount">{formatRp(totals.totalSimAll)}</p>
                <div class="pocket-progress-wrap">
                    <div class="pocket-bar-track">
                        <div class="pocket-bar-fill bar-purple" style="width: {shares.simShare}%;"></div>
                    </div>
                    <div class="pocket-footer-stacked">
                        <div class="pocket-share-row">
                            <span class="pocket-share-label">Alokasi</span>
                            <span class="pocket-share-val">{shares.simShare}%</span>
                        </div>
                        <p class="pocket-subdesc">Tabungan cadangan pokok</p>
                    </div>
                </div>
            </div>
        </button>

        <!-- 3. KANTONG TABUNGAN PRIBADI -->
        <button
            type="button"
            class="stat-box c-pribadi jago-pocket-card pocket-orange"
            on:click={() => handlePocketClick('pribadi', 'pribadi', 'Tambah Tabungan Pribadi')}
            title="Klik untuk tambah tabungan pribadi"
        >
            <div class="pocket-top">
                <div class="pocket-badge-wrap">
                    <div class="pocket-icon-badge bg-orange">🎯</div>
                    <div class="pocket-meta">
                        <span class="pocket-type-tag">Kantong Impian</span>
                        <h3>Tabungan Pribadi</h3>
                    </div>
                </div>
                <span class="stat-trend trend-flat">Live</span>
            </div>
            <div class="pocket-balance-wrap">
                <p class="pocket-amount">{formatRp(totals.totalPriAll)}</p>
                <div class="pocket-progress-wrap">
                    <div class="pocket-bar-track">
                        <div class="pocket-bar-fill bar-orange" style="width: {shares.priShare}%;"></div>
                    </div>
                    <div class="pocket-footer-stacked">
                        <div class="pocket-share-row">
                            <span class="pocket-share-label">Alokasi</span>
                            <span class="pocket-share-val">{shares.priShare}%</span>
                        </div>
                        <p class="pocket-subdesc">Target &amp; impian bebas</p>
                    </div>
                </div>
            </div>
        </button>

        <!-- 4. KANTONG EMAS TRING -->
        <button
            type="button"
            class="stat-box c-tring jago-pocket-card pocket-yellow"
            on:click={() => handlePocketClick('tring', 'tring', 'Catat Emas Tring')}
            title="Klik untuk catat emas tring"
        >
            <div class="pocket-top">
                <div class="pocket-badge-wrap">
                    <div class="pocket-icon-badge bg-yellow">🪙</div>
                    <div class="pocket-meta">
                        <span class="pocket-type-tag">Investasi Fisik</span>
                        <h3>Emas Tring</h3>
                    </div>
                </div>
                <span class="stat-trend trend-flat">Live</span>
            </div>
            <div class="pocket-balance-wrap">
                <p class="pocket-amount">{formatRp(totals.totalTrgRp)}</p>
                <div class="pocket-progress-wrap">
                    <div class="pocket-bar-track">
                        <div class="pocket-bar-fill bar-yellow" style="width: {shares.trgShare}%;"></div>
                    </div>
                    <div class="pocket-footer-stacked">
                        <div class="pocket-share-row">
                            <span class="pocket-share-label">Alokasi ({totals.totalTrgAll.toFixed(2)} Gr)</span>
                            <span class="pocket-share-val">{shares.trgShare}%</span>
                        </div>
                        <p class="pocket-subdesc">Portofolio Emas Fisik</p>
                    </div>
                </div>
            </div>
        </button>

        <!-- 5. KANTONG EMAS JAGO -->
        <button
            type="button"
            class="stat-box c-jago jago-pocket-card pocket-amber"
            on:click={() => handlePocketClick('jago', 'jago', 'Catat Emas Jago')}
            title="Klik untuk catat emas jago"
        >
            <div class="pocket-top">
                <div class="pocket-badge-wrap">
                    <div class="pocket-icon-badge bg-amber">🦁</div>
                    <div class="pocket-meta">
                        <span class="pocket-type-tag">Investasi Digital</span>
                        <h3>Emas Jago</h3>
                    </div>
                </div>
                <span class="stat-trend trend-flat">Live</span>
            </div>
            <div class="pocket-balance-wrap">
                <p class="pocket-amount">{formatRp(totals.totalJagAll)}</p>
                <div class="pocket-progress-wrap">
                    <div class="pocket-bar-track">
                        <div class="pocket-bar-fill bar-amber" style="width: {shares.jagShare}%;"></div>
                    </div>
                    <div class="pocket-footer-stacked">
                        <div class="pocket-share-row">
                            <span class="pocket-share-label">Alokasi</span>
                            <span class="pocket-share-val">{shares.jagShare}%</span>
                        </div>
                        <p class="pocket-subdesc">Portofolio Emas Jago</p>
                    </div>
                </div>
            </div>
        </button>
    </div>
</div>

<script>
    import { heroView, privacyMode, togglePrivacy, openAddTxModal, openTransferModal, sisaScope } from '../stores/uiStore.js';
    import { filteredData, formatRp } from '../stores/financeStore.js';

    $: totals = $filteredData.totals;
    $: shares = $filteredData.shares;
    $: filteredInc = $filteredData.filteredInc;
    $: filteredExp = $filteredData.filteredExp;
    $: isSurplus = filteredInc >= filteredExp;
    $: computedPockets = $filteredData.computedPockets || [];
    $: displaySisa = $sisaScope === 'cash' ? totals.cash : totals.totalWealth;
</script>

<div class="jago-hero-card">
    <div class="jago-hero-header">
        <!-- SEGMENTED VIEW TOGGLE (SISA BULAN INI VS TOTAL PORTOFOLIO) -->
        <div class="jago-hero-tabs" role="tablist">
            <button
                type="button"
                class="jago-hero-tab"
                class:active={$heroView === 'sisa'}
                on:click={() => heroView.set('sisa')}
                role="tab"
                aria-selected={$heroView === 'sisa'}
            >
                <span>💸</span> Sisa Bulan Ini
            </button>
            <button
                type="button"
                class="jago-hero-tab"
                class:active={$heroView === 'wealth'}
                on:click={() => heroView.set('wealth')}
                role="tab"
                aria-selected={$heroView === 'wealth'}
            >
                <span>🏦</span> Total Portofolio
            </button>
        </div>

        <!-- PRIVACY TOGGLE BUTTON -->
        <button
            type="button"
            class="jago-privacy-btn"
            on:click={togglePrivacy}
            title={$privacyMode ? 'Tampilkan Saldo' : 'Sembunyikan Saldo'}
            aria-label="Toggle Saldo Privacy"
        >
            <span>{$privacyMode ? '🙈' : '👁️'}</span>
        </button>
    </div>

    <!-- VIEW 1: SISA BULAN INI (DEFAULT) -->
    {#if $heroView === 'sisa'}
        <div class="jago-hero-body">
            <div class="jago-hero-balance-wrap">
                <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 8px;">
                    <span class="jago-hero-caption">
                        {$sisaScope === 'cash' ? 'Sisa Kas Utama (Kas Tunai)' : 'Total Saldo Tersedia (Semua Kantong)'}
                    </span>

                    <!-- TOGGLE FILTER KAS UTAMA VS SEMUA KANTONG -->
                    <div class="sisa-scope-toggle" role="group" aria-label="Filter Saldo Sisa">
                        <button
                            type="button"
                            class="sisa-scope-btn"
                            class:active={$sisaScope === 'cash'}
                            on:click={() => sisaScope.set('cash')}
                            title="Hanya tampilkan saldo Kas Tunai"
                        >
                            💵 Kas Utama
                        </button>
                        <button
                            type="button"
                            class="sisa-scope-btn"
                            class:active={$sisaScope === 'all'}
                            on:click={() => sisaScope.set('all')}
                            title="Tampilkan total seluruh kantong"
                        >
                            🌐 Semua Kantong
                        </button>
                    </div>
                </div>

                <div class="jago-hero-balance-row">
                    <div class="jago-hero-amount">{formatRp(displaySisa, $privacyMode)}</div>
                    <div class="jago-hero-badge">
                        <span class="pulse-dot">●</span> {$sisaScope === 'cash' ? 'Kas Utama • Likuid' : 'Semua Kantong • Terkonsolidasi'}
                    </div>
                </div>
            </div>

            <!-- CASHFLOW MINI STATS (PEMASUKAN & PENGELUARAN) -->
            <div class="jago-hero-cashflow">
                <div class="jago-flow-box jago-flow-inc">
                    <div class="jago-flow-icon">↓</div>
                    <div class="jago-flow-info">
                        <span class="jago-flow-label">Pemasukan</span>
                        <span class="jago-flow-val">{formatRp(filteredInc, $privacyMode)}</span>
                    </div>
                </div>
                <div class="jago-flow-divider"></div>
                <div class="jago-flow-box jago-flow-exp">
                    <div class="jago-flow-icon">↑</div>
                    <div class="jago-flow-info">
                        <span class="jago-flow-label">Pengeluaran</span>
                        <span class="jago-flow-val">{formatRp(filteredExp, $privacyMode)}</span>
                    </div>
                </div>
            </div>

            <div class="jago-insight-banner">
                {#if isSurplus}
                    <span>✦</span>
                    <span>Anda masih punya ruang untuk menikmati akhir pekan. Keuangan terkendali!</span>
                {:else}
                    <span style="color:var(--expense);">⚠️</span>
                    <span>Pengeluaran melampaui pemasukan bulan ini. Pertimbangkan mengevaluasi pos tersier.</span>
                {/if}
            </div>
        </div>
    {:else}
        <!-- VIEW 2: TOTAL PORTOFOLIO (ACCUMULATION) -->
        <div class="jago-hero-body">
            <div class="jago-hero-balance-wrap">
                <span class="jago-hero-caption">Akumulasi Seluruh Aset &amp; Tabungan (Multi-Kantong)</span>
                <div class="jago-hero-balance-row">
                    <div class="jago-hero-amount jago-wealth-accent">{formatRp(totals.totalWealth, $privacyMode)}</div>
                    <div class="jago-hero-badge jago-badge-wealth">
                        <span>👑</span> Total Portofolio
                    </div>
                </div>
            </div>

            <!-- WEALTH COMPOSITION PREVIEW -->
            <div class="jago-wealth-composition">
                {#each computedPockets as p}
                    <div class="wealth-chip">
                        <span class="dot-chip" style="background:{p.color};"></span>
                        <span>{p.name}: <strong>{p.share}%</strong></span>
                    </div>
                {/each}
            </div>
        </div>
    {/if}

    <!-- PROMINENT QUICK ACTIONS BAR (BANK JAGO SIGNATURE) -->
    <div class="jago-quick-actions">
        <button
            type="button"
            class="jago-action-btn action-expense"
            on:click={() => openAddTxModal({ type: 'expense', category: 'makan', pocket: 'cash', title: 'Catat Pengeluaran' })}
            title="Catat Pengeluaran Cepat"
        >
            <div class="action-icon-wrap">💸</div>
            <div class="action-text-wrap">
                <strong>+ Catat</strong>
                <small>Pengeluaran kantong</small>
            </div>
        </button>

        <button
            type="button"
            class="jago-action-btn action-income"
            on:click={() => openAddTxModal({ type: 'income', category: 'gaji', pocket: 'cash', title: 'Catat Pemasukan' })}
            title="Catat Pemasukan Cepat"
        >
            <div class="action-icon-wrap">💰</div>
            <div class="action-text-wrap">
                <strong>+ Pemasukan</strong>
                <small>Pemasukan kantong</small>
            </div>
        </button>

        <button
            type="button"
            class="jago-action-btn action-transfer"
            on:click={openTransferModal}
            title="Pindah Saldo atau Kelola Kantong"
        >
            <div class="action-icon-wrap">⇄</div>
            <div class="action-text-wrap">
                <strong>Kelola Kantong</strong>
                <small>Pindah saldo</small>
            </div>
        </button>
    </div>
</div>

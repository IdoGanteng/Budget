<script>
    import { activeTab, openAddTxModal } from '../stores/uiStore.js';

    function handleTabClick(tab) {
        activeTab.set(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
</script>

<nav class="mobile-bottom-bar sm:hidden" aria-label="Navigasi Bawah Mobile">
    <!-- KOLOM 1: BERANDA -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'home'}
        on:click={() => handleTabClick('home')}
        title="Beranda"
    >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Beranda</span>
    </button>

    <!-- KOLOM 2: ANALISA -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'analytics'}
        on:click={() => handleTabClick('analytics')}
        title="Analisa"
    >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>Analisa</span>
    </button>

    <!-- KOLOM 3 (TENGAH): TOMBOL AKSI CATAT (BULAT, TERANGKAT, TANPA LABEL TEKS) -->
    <div class="mobile-fab-wrapper">
        <button
            type="button"
            class="mobile-fab-center"
            on:click={() => openAddTxModal({ type: 'expense', category: 'makan', title: 'Catat Pengeluaran' })}
            title="Catat Transaksi"
            aria-label="Catat Transaksi"
        >
            <span class="mobile-fab-plus">＋</span>
        </button>
    </div>

    <!-- KOLOM 4: KANTONG -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'pockets'}
        on:click={() => handleTabClick('pockets')}
        title="Kantong Portofolio"
    >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
        </svg>
        <span>Kantong</span>
    </button>

    <!-- KOLOM 5: LAPORAN -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'report'}
        on:click={() => handleTabClick('report')}
        title="Laporan Bulanan"
    >
        <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
        <span>Laporan</span>
    </button>
</nav>

<style>
    /* ========================================================= */
    /* 5-COLUMN SYMMETRIC BOTTOM NAVIGATION BAR                  */
    /* ========================================================= */
    .mobile-bottom-bar {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        width: 100%;
        z-index: 1400;
        align-items: center;
        justify-items: center;
        padding-top: 8px;
        padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 12px));
        padding-left: 8px;
        padding-right: 8px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border-top: 1px solid rgba(226, 232, 240, 0.8);
        box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.08);
        box-sizing: border-box;
    }

    :global([data-theme="dark"]) .mobile-bottom-bar,
    :global(.dark) .mobile-bottom-bar {
        background: rgba(15, 23, 42, 0.95);
        border-top-color: rgba(255, 255, 255, 0.08);
        box-shadow: 0 -4px 25px rgba(0, 0, 0, 0.35);
    }

    @media (min-width: 640px) {
        .mobile-bottom-bar {
            display: none !important;
        }
    }

    /* 4 SIDE MENU BUTTONS */
    .mobile-tab-btn {
        background: none;
        border: none;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 4px;
        color: #94a3b8;
        cursor: pointer;
        width: 100%;
        height: 100%;
        padding: 4px 0;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        -webkit-tap-highlight-color: transparent;
        text-align: center;
    }
    .mobile-tab-btn:active {
        transform: scale(0.92);
    }
    .tab-icon {
        width: 20px;
        height: 20px;
        stroke: currentColor;
        transition: transform 0.2s ease, stroke 0.2s ease;
        flex-shrink: 0;
    }
    .mobile-tab-btn span {
        font-size: 11px;
        font-weight: 500;
        line-height: 1;
        letter-spacing: -0.1px;
        white-space: nowrap;
    }

    /* ACTIVE STATES */
    .mobile-tab-btn.active {
        color: #4f46e5;
        font-weight: 600;
    }
    .mobile-tab-btn.active .tab-icon {
        stroke: #4f46e5;
        transform: translateY(-1px);
    }

    :global([data-theme="dark"]) .mobile-tab-btn.active,
    :global(.dark) .mobile-tab-btn.active {
        color: #818cf8;
    }
    :global([data-theme="dark"]) .mobile-tab-btn.active .tab-icon,
    :global(.dark) .mobile-tab-btn.active .tab-icon {
        stroke: #818cf8;
    }

    /* CENTER ELEVATED ACTION BUTTON (+) */
    .mobile-fab-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        height: 100%;
        position: relative;
    }
    .mobile-fab-center {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
        margin-top: -16px;
        border: 3px solid #ffffff;
        cursor: pointer;
        transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
        -webkit-tap-highlight-color: transparent;
        outline: none;
    }

    :global([data-theme="dark"]) .mobile-fab-center,
    :global(.dark) .mobile-fab-center {
        background: linear-gradient(135deg, #4f46e5, #6366f1);
        border-color: #0f172a;
        box-shadow: 0 4px 16px rgba(99, 102, 241, 0.45);
    }

    .mobile-fab-center:active {
        transform: scale(0.92);
        box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
    }
    .mobile-fab-plus {
        font-size: 24px;
        font-weight: 600;
        line-height: 1;
        margin-top: -2px;
        color: #ffffff;
        user-select: none;
    }
</style>

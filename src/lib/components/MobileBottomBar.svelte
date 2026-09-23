<script>
    import { activeTab, openAddTxModal } from '../stores/uiStore.js';

    function handleTabClick(tab) {
        activeTab.set(tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function handleKantongClick() {
        if ($activeTab !== 'home') {
            activeTab.set('home');
        }
        setTimeout(() => {
            const el = document.getElementById('kantong-section') || document.getElementById('section-history');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }, 60);
    }
</script>

<nav class="mobile-bottom-bar" aria-label="Navigasi Bawah Mobile">
    <!-- 1. BERANDA -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'home'}
        on:click={() => handleTabClick('home')}
        title="Beranda"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Beranda</span>
    </button>

    <!-- 2. ANALISA -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'analytics'}
        on:click={() => handleTabClick('analytics')}
        title="Analisa"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>Analisa</span>
    </button>

    <!-- 3. FLOATING ACTION '+' (CENTER) -->
    <div class="mobile-fab-column">
        <button
            type="button"
            class="mobile-fab-center"
            on:click={() => openAddTxModal({ type: 'expense', category: 'makan', title: 'Catat Pengeluaran' })}
            title="Catat Transaksi Cepat"
            aria-label="Catat Transaksi"
        >
            <span class="mobile-fab-plus">＋</span>
        </button>
        <span class="mobile-fab-text">Catat</span>
    </div>

    <!-- 4. KANTONG / RIWAYAT -->
    <button
        type="button"
        class="mobile-tab-btn"
        on:click={handleKantongClick}
        title="Kantong & Riwayat"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"></path>
            <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"></path>
        </svg>
        <span>Kantong</span>
    </button>

    <!-- 5. PENGGUNA -->
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'users'}
        on:click={() => handleTabClick('users')}
        title="Pengguna & Database"
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
        <span>Pengguna</span>
    </button>
</nav>

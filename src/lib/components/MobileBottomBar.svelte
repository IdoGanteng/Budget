<script>
    import { activeTab, openAddTxModal } from '../stores/uiStore.js';
</script>

<nav class="mobile-bottom-bar" aria-label="Navigasi Bawah Mobile">
    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'home'}
        on:click={() => activeTab.set('home')}
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span>Beranda</span>
    </button>

    <button
        type="button"
        class="mobile-tab-btn"
        on:click={() => openAddTxModal({ type: 'expense', category: 'makan', title: 'Catat Pengeluaran' })}
        title="Catat Transaksi"
    >
        <div class="mobile-fab-center">＋</div>
        <span>Catat</span>
    </button>

    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'analytics'}
        on:click={() => activeTab.set('analytics')}
    >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="20" x2="18" y2="10"></line>
            <line x1="12" y1="20" x2="12" y2="4"></line>
            <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span>Analisa</span>
    </button>

    <button
        type="button"
        class="mobile-tab-btn"
        class:active={$activeTab === 'users'}
        on:click={() => activeTab.set('users')}
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

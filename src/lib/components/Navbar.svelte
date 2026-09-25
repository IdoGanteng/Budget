<script>
    import { activeTab, openAddTxModal } from '../stores/uiStore.js';
    import { activeUser } from '../stores/authStore.js';
    import { syncStatus, syncTransactionsFromSheet } from '../stores/financeStore.js';
    import ThemeToggle from './ThemeToggle.svelte';

    function handleSyncClick() {
        syncTransactionsFromSheet(true);
    }
</script>

<div class="app-navbar-container">
    <div class="modern-navbar">
        <div class="brand-section">
            <div class="brand-logo-mini">ARK</div>
            <div class="brand-title">Personal <span>OS</span></div>
        </div>

        <!-- DESKTOP NAV TABS -->
        <div class="desktop-nav-tabs">
            <button
                type="button"
                class="desktop-tab-btn"
                class:active={$activeTab === 'home'}
                on:click={() => activeTab.set('home')}
            >
                <span>🏠</span> Beranda
            </button>
            <button
                type="button"
                class="desktop-tab-btn"
                class:active={$activeTab === 'analytics'}
                on:click={() => activeTab.set('analytics')}
            >
                <span>📊</span> Analisa
            </button>
            <button
                type="button"
                class="desktop-tab-btn"
                class:active={$activeTab === 'pockets'}
                on:click={() => activeTab.set('pockets')}
            >
                <span>👛</span> Kantong
            </button>
            <button
                type="button"
                class="desktop-tab-btn"
                class:active={$activeTab === 'users'}
                on:click={() => activeTab.set('users')}
            >
                <span>👥</span> Pengguna &amp; Database
            </button>
            <button
                type="button"
                class="desktop-catat-btn"
                on:click={() => openAddTxModal({ type: 'expense', title: 'Catat Pengeluaran' })}
                title="Catat Transaksi Cepat"
            >
                <span>＋</span> Catat
            </button>
        </div>

        <div class="nav-actions">
            <!-- SYNC STATUS INDICATOR PILL -->
            <button
                type="button"
                class="sync-status-pill {$syncStatus.statusClass}"
                on:click={handleSyncClick}
                title="Status Sinkronisasi Google Sheets. Klik untuk sinkronisasi manual."
            >
                <span class="status-dot {$syncStatus.dotClass}"></span>
                <span class="sync-status-text">{$syncStatus.text}</span>
            </button>

            <!-- MULTI-USER PROFILE SWITCHER BADGE -->
            <button
                type="button"
                class="nav-user-switcher"
                on:click={() => activeTab.set('users')}
                title="Klik untuk Kelola / Ganti Pengguna"
            >
                <div class="user-avatar-badge">
                    {#if $activeUser.picture}
                        <img src={$activeUser.picture} alt={$activeUser.name} class="nav-avatar-img">
                    {:else}
                        {$activeUser.avatar || '👤'}
                    {/if}
                </div>
                <span class="user-name-label">{$activeUser.name}</span>
                <span class="user-role-badge">{$activeUser.role || 'Member'}</span>
            </button>

            <!-- THEME SWITCHER -->
            <ThemeToggle />
        </div>
    </div>
</div>

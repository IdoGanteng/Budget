<script>
    import { activeTab, theme, toggleTheme, openAddTxModal } from '../stores/uiStore.js';
    import { activeUser, handleLogout } from '../stores/authStore.js';
    import { syncStatus, syncTransactionsFromSheet } from '../stores/financeStore.js';

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
                <span>{$syncStatus.text}</span>
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
            <label class="theme-switch" title="Ganti Tema">
                <input
                    type="checkbox"
                    checked={$theme === 'dark'}
                    on:change={toggleTheme}
                >
                <span class="slider"></span>
            </label>

            <!-- LOGOUT -->
            <button
                type="button"
                class="action-btn"
                on:click={handleLogout}
                title="Keluar Vault"
            >
                🚪
            </button>
        </div>
    </div>
</div>

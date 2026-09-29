<script>
    import { activeTab, openAddTxModal, showConfirmModal } from '../stores/uiStore.js';
    import { activeUser, handleLogout } from '../stores/authStore.js';
    import { syncStatus, syncTransactionsFromSheet } from '../stores/financeStore.js';
    import ThemeToggle from './ThemeToggle.svelte';

    function handleSyncClick() {
        syncTransactionsFromSheet(true);
    }

    function confirmLogout() {
        showConfirmModal({
            icon: '🚪',
            title: 'Konfirmasi Keluar',
            desc: 'Apakah Anda yakin ingin keluar dari sesi Personal OS?',
            confirmText: 'Ya, Keluar',
            isDanger: true,
            onConfirm: () => {
                handleLogout();
            }
        });
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
                class="desktop-tab-btn text-xs md:text-sm px-3 py-1.5 whitespace-nowrap"
                class:active={$activeTab === 'home'}
                on:click={() => activeTab.set('home')}
            >
                <span>🏠</span> Beranda
            </button>
            <button
                type="button"
                class="desktop-tab-btn text-xs md:text-sm px-3 py-1.5 whitespace-nowrap"
                class:active={$activeTab === 'analytics'}
                on:click={() => activeTab.set('analytics')}
            >
                <span>📊</span> Analisa
            </button>
            <button
                type="button"
                class="desktop-tab-btn text-xs md:text-sm px-3 py-1.5 whitespace-nowrap"
                class:active={$activeTab === 'pockets'}
                on:click={() => activeTab.set('pockets')}
            >
                <span>👛</span> Kantong
            </button>
            <button
                type="button"
                class="desktop-tab-btn text-xs md:text-sm px-3 py-1.5 whitespace-nowrap"
                class:active={$activeTab === 'users'}
                on:click={() => activeTab.set('users')}
            >
                <span>👥</span> Pengguna &amp; Database
            </button>
            <button
                type="button"
                class="desktop-catat-btn text-xs md:text-sm px-3 py-1.5 whitespace-nowrap"
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

            <!-- LOGOUT BUTTON -->
            <button
                type="button"
                class="nav-logout-btn"
                on:click={confirmLogout}
                title="Keluar dari sesi Personal OS"
                aria-label="Logout"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
            </button>
        </div>
    </div>
</div>

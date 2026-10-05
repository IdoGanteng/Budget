<script>
    import { activeTab, openAddTxModal, showConfirmModal, theme, toggleTheme, privacyMode, togglePrivacy } from '../stores/uiStore.js';
    import { activeUser, handleLogout } from '../stores/authStore.js';
    import { syncStatus, syncTransactionsFromSheet } from '../stores/financeStore.js';

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
                class:active={$activeTab === 'report'}
                on:click={() => activeTab.set('report')}
            >
                <span>📑</span> Laporan A4
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
                <span>👥</span>
                <span class="nav-label-desktop">Pengguna &amp; Database</span>
                <span class="nav-label-compact">Pengguna</span>
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
            <!-- QUICK REPORT SHORTCUT -->
            <button
                type="button"
                class="nav-report-btn"
                class:active={$activeTab === 'report'}
                on:click={() => activeTab.set('report')}
                title="Buka & Cetak Laporan Keuangan Bulanan (A4)"
                aria-label="Laporan Bulanan A4"
            >
                <span>📑</span>
                <span class="report-btn-text">Laporan</span>
            </button>

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
                    {:else if $activeUser.avatar && $activeUser.avatar.includes('<img')}
                        {@html $activeUser.avatar}
                    {:else}
                        {$activeUser.avatar || '👤'}
                    {/if}
                </div>
                <span class="user-name-label">{$activeUser.name}</span>
            </button>

            <!-- PRIVACY TOGGLE BUTTON -->
            <button
                type="button"
                class="nav-action-icon-btn"
                class:is-active={$privacyMode}
                on:click={togglePrivacy}
                title={$privacyMode ? 'Tampilkan Saldo (Privasi Aktif)' : 'Sembunyikan Saldo'}
                aria-label="Toggle Saldo Privacy"
            >
                {#if $privacyMode}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                    </svg>
                {/if}
            </button>

            <!-- THEME TOGGLE BUTTON -->
            <button
                type="button"
                class="nav-action-icon-btn"
                on:click={toggleTheme}
                title={$theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
                aria-label="Toggle Tema Gelap/Terang"
            >
                {#if $theme === 'dark'}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="4"/>
                        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
                    </svg>
                {:else}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                    </svg>
                {/if}
            </button>

            <!-- LOGOUT BUTTON -->
            <button
                type="button"
                class="nav-action-icon-btn btn-danger"
                on:click={confirmLogout}
                title="Keluar dari sesi Personal OS"
                aria-label="Logout"
            >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                    <polyline points="16 17 21 12 16 7"/>
                    <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        </div>
    </div>
</div>

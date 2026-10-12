<script>
    import { slide } from 'svelte/transition';
    import {
        activeUser,
        usersList,
        setActiveUser,
        saveUsers,
        handleLogout,
        googleClientId,
        saveGoogleClientId
    } from '../stores/authStore.js';
    import {
        financialGoals,
        goldPricePerGram,
        goldApiStatus,
        saveGoldPrice,
        getUserSpreadsheetConfig,
        syncTransactionsFromSheet,
        exportToCSV,
        exportDatabaseJSON,
        importDatabaseJSON,
        clearLocalCache,
        filteredData
    } from '../stores/financeStore.js';
    import {
        isGoalsModalOpen,
        isAppsScriptModalOpen,
        isManageUsersModalOpen,
        showConfirmModal,
        showToast,
        theme,
        toggleTheme
    } from '../stores/uiStore.js';

    $: u = $activeUser;
    $: list = $usersList;
    $: goals = $financialGoals;
    $: totals = $filteredData.totals;
    $: wealthPct = Math.max(0, Math.min((totals.totalWealth / (goals.wealthGoal || 1)) * 100, 100));
    $: goldPct = Math.max(0, Math.min((totals.totalGold / (goals.goldGoal || 1)) * 100, 100));

    let sheetUrl = '';
    let sheetToken = '';
    let manualGoldPrice = '';
    let showDbInfo = false;

    $: {
        const config = getUserSpreadsheetConfig();
        sheetUrl = config.isCustom ? config.url : '';
        sheetToken = config.token || '';
        manualGoldPrice = new Intl.NumberFormat('id-ID').format($goldPricePerGram);
    }

    async function handleTestConnection() {
        if (!sheetUrl) {
            showToast('Masukkan URL Web App Google Apps Script Anda.', 'warning', '⚠️');
            return;
        }
        showToast('Menguji koneksi ke Google Spreadsheet...', 'info', '⏳');
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const res = await fetch(sheetUrl, {
                method: 'POST',
                body: JSON.stringify({ action: 'sync', token: sheetToken }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const json = await res.json();
            if (json && json.status === 'success') {
                const count = Array.isArray(json.data) ? json.data.length : 0;
                showToast(`✅ Berhasil terhubung ke Google Spreadsheet! (${count} transaksi)`, 'success', '🎉');
            } else {
                showToast('Respon diterima: ' + (json.message || 'OK'), 'info', '📊');
            }
        } catch (err) {
            showToast('Gagal menghubungi Spreadsheet. Pastikan Web App disetel "Anyone".', 'error', '❌');
        }
    }

    function handleSaveSpreadsheetSettings(e) {
        if (e) e.preventDefault();
        const updatedUser = { ...u, spreadsheetUrl: sheetUrl.trim(), spreadsheetToken: sheetToken.trim() };
        const updated = list.map(item => {
            if (item.id === u.id) {
                return updatedUser;
            }
            return item;
        });
        saveUsers(updated);
        activeUser.set(updatedUser);
        showToast('Konfigurasi database Google Spreadsheet disimpan!', 'success', '💾');
        if (sheetUrl) {
            syncTransactionsFromSheet(true);
        }
    }

    function handleSaveGoldPrice() {
        const raw = manualGoldPrice.replace(/\./g, '');
        if (raw && !isNaN(raw)) {
            saveGoldPrice(parseFloat(raw));
        }
    }

    function handleGoldInput(e) {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        manualGoldPrice = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    let localGoogleClientId = '';
    $: localGoogleClientId = $googleClientId || '';

    function handleClearCacheConfirm() {
        showConfirmModal({
            icon: '⚠️',
            title: 'Bersihkan Cache Lokal',
            desc: 'Tindakan ini hanya membersihkan cache snapshot lokal browser. Data di Spreadsheet tetap aman.',
            confirmText: 'Bersihkan',
            isDanger: true,
            onConfirm: () => {
                clearLocalCache();
            }
        });
    }

    function handleSaveClientIdSubmit(e) {
        if (e) e.preventDefault();
        saveGoogleClientId(localGoogleClientId);
    }

    let fileInput;

    function handleImportFile(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        showConfirmModal({
            icon: '📥',
            title: 'Impor & Pulihkan Backup JSON',
            desc: `Apakah Anda yakin ingin memulihkan database dari file <b>"${file.name}"</b>? Data transaksi, target, dan anggaran lokal akan diselaraskan dengan isi backup.`,
            confirmText: 'Ya, Pulihkan',
            isDanger: false,
            onConfirm: () => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    importDatabaseJSON(event.target.result);
                };
                reader.readAsText(file);
            }
        });
        e.target.value = '';
    }

    function confirmLogout() {
        showConfirmModal({
            icon: '🚪',
            title: 'Konfirmasi Keluar',
            desc: 'Apakah Anda yakin ingin keluar dari sesi Personal OS saat ini?',
            confirmText: 'Ya, Keluar',
            isDanger: true,
            onConfirm: () => {
                handleLogout();
            }
        });
    }
</script>

<div class="dashboard-tab-view active user-settings-tab">
    <div class="settings-page-container">
        <!-- 1. THE HERO PROFILE (HEADER SIMPLIFICATION) -->
        <div class="profile-hero-card">
            <!-- CENTERED LARGE AVATAR (w-24 h-24 / 96px x 96px) -->
            <div class="hero-avatar-container">
                <div class="hero-avatar" style="background: {u.color || 'var(--primary)'};">
                    {#if u.picture}
                        <img src={u.picture} alt={u.name} class="hero-avatar-img" />
                    {:else if u.avatar && u.avatar.includes('<img')}
                        {@html u.avatar}
                    {:else}
                        <span class="hero-avatar-text">{u.avatar || u.name?.charAt(0) || '👤'}</span>
                    {/if}
                </div>
            </div>

            <!-- NAME & EMAIL DIRECTLY BELOW IN CLEAN BOLD FONT -->
            <div class="hero-profile-meta">
                <div class="hero-name-row">
                    <h2 class="hero-user-name">{u.name}</h2>
                    <span class="hero-role-tag">{u.role || 'Member'}</span>
                </div>
                <p class="hero-user-email">{u.email || 'rebel@personal.os'}</p>
            </div>

            <!-- SUBTLE INLINE STATUS ROW: [Shield Icon] AES-256 • [Google Icon] Connected -->
            <div class="hero-inline-status">
                <span class="status-inline-item">
                    <span class="status-mini-icon">🛡️</span>
                    <span>AES-256</span>
                </span>
                <span class="status-separator">•</span>
                <span class="status-inline-item">
                    <svg viewBox="0 0 24 24" class="google-mini-icon" aria-hidden="true">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Connected</span>
                </span>
            </div>
        </div>

        <!-- 2. PROFILE SWITCHER (IOS / BANK JAGO STYLE LIST GROUP) -->
        <div class="settings-group">
            <div class="settings-group-header">
                <span class="group-title">Ganti Profil</span>
                <button
                    type="button"
                    on:click={() => isManageUsersModalOpen.set(true)}
                    class="unboxed-text-link"
                    title="Kelola Profil Pengguna"
                >
                    + Kelola Profil
                </button>
            </div>

            <div class="settings-card-list">
                {#each list as item}
                    <button
                        type="button"
                        class="settings-row-btn {item.id === u.id ? 'active' : ''}"
                        on:click={() => setActiveUser(item.id)}
                        aria-pressed={item.id === u.id}
                        title="Pilih profil {item.name}"
                    >
                        <div class="row-left">
                            <span class="row-avatar" style="background: {item.color || 'var(--primary)'};">
                                {#if item.picture}
                                    <img src={item.picture} alt={item.name} class="row-avatar-img" />
                                {:else if item.avatar && item.avatar.includes('<img')}
                                    {@html item.avatar}
                                {:else}
                                    {item.avatar || item.name?.charAt(0) || '👤'}
                                {/if}
                            </span>
                            <div class="row-name-wrap">
                                <span class="row-name">{item.name}</span>
                                <span class="row-role">({item.role || 'Member'})</span>
                            </div>
                        </div>

                        {#if item.id === u.id}
                            <span class="row-checkmark" title="Profil Aktif">✓</span>
                        {/if}
                    </button>
                {/each}
            </div>
        </div>

        <!-- 3. DATABASE CONNECTION SECTION (PROGRESSIVE DISCLOSURE) -->
        <div class="settings-group">
            <div class="settings-group-header">
                <div class="group-title-with-info">
                    <span class="group-title">Database Spreadsheet</span>
                    <!-- [i] Tooltip / Accordion Toggle Button -->
                    <button
                        type="button"
                        class="info-icon-btn"
                        on:click={() => showDbInfo = !showDbInfo}
                        title="Informasi koneksi Google Spreadsheet"
                        aria-label="Informasi Spreadsheet"
                    >
                        ℹ️
                    </button>
                </div>
                <span class="badge-subtle {sheetUrl ? 'badge-success' : 'badge-neutral'}">
                    {sheetUrl ? 'Spreadsheet Pribadi' : 'Template Standar'}
                </span>
            </div>

            <!-- EXPANDABLE ACCORDION EXPLANATION -->
            {#if showDbInfo}
                <div class="info-accordion-box" transition:slide={{ duration: 200 }}>
                    <p>
                        Setiap akun dapat memiliki database Google Spreadsheet pribadi. Masukkan URL Web App Apps Script Anda agar riwayat keuangan otomatis tersimpan di Spreadsheet pribadi Anda saat online.
                    </p>
                </div>
            {/if}

            <div class="settings-card-list">
                <!-- DATABASE STATUS LIST ROW: [DB Icon] Spreadsheet URL (left) and connected account (right) -->
                <div class="db-status-list-row">
                    <div class="db-status-left">
                        <span class="db-icon">🗄️</span>
                        <div class="db-meta">
                            <span class="db-title">Spreadsheet URL</span>
                            <span class="db-url-text truncate" title={sheetUrl || 'Template Standar'}>
                                {sheetUrl ? sheetUrl : 'Belum dihubungkan (Penyimpanan Standar)'}
                            </span>
                        </div>
                    </div>
                    <div class="db-status-right">
                        <span class="db-account-email truncate">{u.email || 'rebel@personal.os'}</span>
                    </div>
                </div>

                <!-- CONFIGURATION FORM INSIDE LIST CARD -->
                <form on:submit={handleSaveSpreadsheetSettings} class="db-config-form">
                    <div class="form-field">
                        <label for="settings-sheet-url" class="field-label">URL Web App Google Apps Script</label>
                        <input
                            id="settings-sheet-url"
                            type="url"
                            bind:value={sheetUrl}
                            placeholder="https://script.google.com/macros/s/.../exec"
                            autocomplete="off"
                            class="minimal-input"
                        />
                    </div>

                    <div class="form-field">
                        <label for="settings-sheet-token" class="field-label">Token Akses (Opsional)</label>
                        <input
                            id="settings-sheet-token"
                            type="text"
                            bind:value={sheetToken}
                            placeholder="Token rahasia Anda"
                            autocomplete="off"
                            class="minimal-input"
                        />
                    </div>

                    <div class="form-actions-row">
                        <button
                            type="button"
                            on:click={handleTestConnection}
                            class="action-btn action-btn-secondary"
                        >
                            🔍 Tes Koneksi
                        </button>
                        <button
                            type="submit"
                            class="action-btn action-btn-primary"
                        >
                            💾 Simpan Konfigurasi
                        </button>
                    </div>
                </form>

                <!-- FOOTER QUICK LINKS -->
                <div class="db-card-footer">
                    <button
                        type="button"
                        on:click={() => isAppsScriptModalOpen.set(true)}
                        class="footer-link-btn"
                    >
                        📜 Petunjuk &amp; Kode Script
                    </button>
                    <button
                        type="button"
                        on:click={() => syncTransactionsFromSheet(true)}
                        class="footer-link-btn"
                    >
                        🔄 Sinkronkan Sekarang
                    </button>
                </div>
            </div>
        </div>

        <!-- 4. HARGA EMAS SPOT API -->
        <div class="settings-group">
            <div class="settings-group-header">
                <span class="group-title">Harga Emas / Gram</span>
                <span class="badge-subtle badge-success">{$goldApiStatus}</span>
            </div>

            <div class="settings-card-list p-card-row">
                <div class="gold-input-row">
                    <div class="gold-label-wrap">
                        <span class="gold-icon">🏷️</span>
                        <span class="gold-label">Emas Tring Spot</span>
                    </div>
                    <div class="gold-controls">
                        <input
                            type="text"
                            bind:value={manualGoldPrice}
                            on:input={handleGoldInput}
                            placeholder="1.250.000"
                            class="minimal-input gold-input font-mono"
                        />
                        <button
                            type="button"
                            on:click={handleSaveGoldPrice}
                            class="action-btn action-btn-primary gold-update-btn"
                        >
                            Update
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- 5. PROGRESS TARGET 2026 -->
        <div class="settings-group">
            <div class="settings-group-header">
                <span class="group-title">Progress Target 2026</span>
                <button
                    type="button"
                    on:click={() => isGoalsModalOpen.set(true)}
                    class="unboxed-text-link"
                >
                    Edit Target
                </button>
            </div>

            <div class="settings-card-list goals-card-padding">
                <div class="goals-grid">
                    <div class="goal-item-box">
                        <div class="goal-header">
                            <span class="goal-label">Kekayaan Total</span>
                            <span class="goal-value">{wealthPct.toFixed(1)}%</span>
                        </div>
                        <div class="goal-bar-track">
                            <div class="goal-bar-fill wealth-fill" style="width: {wealthPct}%;"></div>
                        </div>
                    </div>

                    <div class="goal-item-box">
                        <div class="goal-header">
                            <span class="goal-label">Aset Emas</span>
                            <span class="goal-value gold-text">{goldPct.toFixed(1)}%</span>
                        </div>
                        <div class="goal-bar-track">
                            <div class="goal-bar-fill gold-fill" style="width: {goldPct}%;"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- 6. CADANGAN & PEMELIHARAAN DATA -->
        <div class="settings-group">
            <div class="settings-group-header">
                <span class="group-title">Cadangan &amp; Pemeliharaan Data</span>
            </div>

            <div class="settings-card-list p-card-row">
                <div class="backup-actions-grid">
                    <button
                        type="button"
                        on:click={exportToCSV}
                        class="action-btn action-btn-secondary"
                    >
                        <span>📊</span>
                        <span>Ekspor CSV</span>
                    </button>
                    <button
                        type="button"
                        on:click={exportDatabaseJSON}
                        class="action-btn action-btn-primary"
                    >
                        <span>💾</span>
                        <span>Backup JSON</span>
                    </button>
                </div>

                <input
                    type="file"
                    accept=".json"
                    bind:this={fileInput}
                    on:change={handleImportFile}
                    style="display: none;"
                />

                <div class="backup-secondary-actions">
                    <button
                        type="button"
                        on:click={() => fileInput.click()}
                        class="action-btn action-btn-dashed"
                    >
                        <span>📥</span>
                        <span>Impor / Pulihkan Database (JSON)</span>
                    </button>

                    <button
                        type="button"
                        on:click={handleClearCacheConfirm}
                        class="action-btn action-btn-danger"
                    >
                        🗑️ Bersihkan Cache Snapshot Lokal
                    </button>
                </div>
            </div>
        </div>

        <!-- 7. TAMPILAN & PREFERENSI -->
        <div class="settings-group">
            <div class="settings-group-header">
                <span class="group-title">Tampilan &amp; Preferensi</span>
            </div>

            <div class="settings-card-list">
                <div class="preference-row">
                    <div class="pref-left">
                        <span class="pref-icon">🌗</span>
                        <span class="pref-name">Tema Tampilan</span>
                    </div>
                    <button
                        type="button"
                        on:click={toggleTheme}
                        class="theme-toggle-pill"
                        title="Klik untuk ganti tema (Gelap / Terang)"
                    >
                        <span>{$theme === 'dark' ? '🌙 Gelap' : '☀️ Terang'}</span>
                        <span class="theme-switch-label">(Ganti)</span>
                    </button>
                </div>
            </div>
        </div>

        <!-- 8. GOOGLE OAUTH SECURITY SETTINGS -->
        <div class="settings-group">
            <div class="settings-group-header">
                <div class="group-title-with-info">
                    <svg viewBox="0 0 24 24" class="google-mini-icon">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span class="group-title">Google OAuth &amp; Identity</span>
                </div>
                <span class="badge-subtle {$googleClientId ? 'badge-success' : 'badge-neutral'}">
                    {$googleClientId ? 'OAuth Resmi Aktif' : 'Mode Cepat Aktif'}
                </span>
            </div>

            <div class="settings-card-list p-card-row">
                <form on:submit={handleSaveClientIdSubmit} class="oauth-form">
                    <input
                        type="text"
                        bind:value={localGoogleClientId}
                        placeholder="Client ID Google (123xxx.apps.googleusercontent.com)"
                        autocomplete="off"
                        class="minimal-input oauth-input font-mono"
                    />
                    <button
                        type="submit"
                        class="action-btn action-btn-primary oauth-save-btn"
                    >
                        Simpan
                    </button>
                </form>
            </div>
        </div>

        <!-- 9. SESI AKUN & LOGOUT -->
        <div class="settings-group logout-group">
            <div class="settings-card-list p-card-row logout-card">
                <button
                    type="button"
                    on:click={confirmLogout}
                    class="logout-btn"
                >
                    <span>🚪</span>
                    <span>Keluar dari Akun (Logout)</span>
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    /* ==========================================================================
       CONTAINER & BASE SETTINGS LAYOUT (BANK JAGO STREAMLINED AESTHETIC)
       ========================================================================== */
    .settings-page-container {
        max-width: 580px;
        width: 100%;
        margin-left: auto;
        margin-right: auto;
        padding: 16px 16px 80px 16px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        box-sizing: border-box;
        animation: fadeIn 0.25s ease-out;
    }

    /* ==========================================================================
       1. HERO PROFILE CARD (NO EMPTY BANNER, CENTERED, BOLD EMAIL, INLINE STATUS)
       ========================================================================== */
    .profile-hero-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 24px 16px 14px 16px;
        width: 100%;
        box-sizing: border-box;
    }

    .hero-avatar-container {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
    }

    .hero-avatar {
        width: 96px; /* w-24 */
        height: 96px; /* h-24 */
        min-width: 96px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        border: 3.5px solid rgba(255, 255, 255, 0.12);
        box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.4), 0 0 20px -2px rgba(37, 99, 235, 0.15);
        color: #ffffff;
        font-weight: 800;
        transition: transform 0.2s ease;
    }
    .hero-avatar:hover {
        transform: scale(1.03);
    }

    .hero-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        border-radius: 50%;
    }

    .hero-avatar-text {
        font-size: 38px;
        font-weight: 800;
        line-height: 1;
    }

    .hero-profile-meta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        margin-bottom: 12px;
    }

    .hero-name-row {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .hero-user-name {
        margin: 0;
        font-size: 20px;
        font-weight: 800;
        color: var(--text-dark);
        letter-spacing: -0.3px;
    }

    .hero-role-tag {
        font-size: 11px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 6px;
        background: rgba(37, 99, 235, 0.14);
        color: #3b82f6;
        text-transform: capitalize;
    }

    .hero-user-email {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: var(--text-gray);
        letter-spacing: -0.2px;
    }

    /* SUBTLE INLINE STATUS ROW */
    .hero-inline-status {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 5px 14px;
        border-radius: 100px;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.07);
        font-size: 11.5px;
        font-weight: 600;
        color: var(--text-muted);
    }

    .status-inline-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
    }

    .status-mini-icon {
        font-size: 12px;
        line-height: 1;
    }

    .google-mini-icon {
        width: 13px;
        height: 13px;
        flex-shrink: 0;
    }

    .status-separator {
        opacity: 0.4;
        font-size: 10px;
    }

    /* ==========================================================================
       SETTINGS GROUPS & LIST CARDS (IOS / BANK JAGO MINIMALIST)
       ========================================================================== */
    .settings-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: 100%;
    }

    .settings-group-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 6px;
    }

    .group-title-with-info {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .group-title {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.6px;
    }

    .unboxed-text-link {
        background: none;
        border: none;
        color: #3b82f6;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        transition: color 0.15s ease;
        -webkit-tap-highlight-color: transparent;
    }
    .unboxed-text-link:hover {
        color: #60a5fa;
        text-decoration: underline;
    }

    .info-icon-btn {
        background: none;
        border: none;
        cursor: pointer;
        font-size: 13px;
        padding: 0;
        line-height: 1;
        opacity: 0.7;
        transition: opacity 0.15s ease;
    }
    .info-icon-btn:hover {
        opacity: 1;
    }

    /* CARD CONTAINER: HAIRLINE BORDER, SUBTLE SHADOW, BANK JAGO FLUSH LIST */
    .settings-card-list {
        background: var(--card-bg-solid, #161f30);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 18px;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        width: 100%;
        box-sizing: border-box;
    }

    .p-card-row {
        padding: 14px 16px;
    }

    /* LIST ITEMS WITH HAIRLINE SEPARATORS */
    .settings-row-btn {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        transition: background 0.15s ease;
        text-align: left;
        box-sizing: border-box;
        -webkit-tap-highlight-color: transparent;
    }
    .settings-row-btn:not(:last-child) {
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    }
    .settings-row-btn:hover {
        background: rgba(255, 255, 255, 0.03);
    }
    .settings-row-btn:active {
        background: rgba(255, 255, 255, 0.06);
    }
    .settings-row-btn.active {
        background: rgba(37, 99, 235, 0.07);
    }

    .row-left {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .row-avatar {
        width: 36px;
        height: 36px;
        min-width: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 15px;
        font-weight: 700;
        overflow: hidden;
        color: white;
        flex-shrink: 0;
    }

    .row-avatar-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .row-name-wrap {
        display: flex;
        align-items: baseline;
        gap: 6px;
        min-width: 0;
    }

    .row-name {
        font-size: 14px;
        font-weight: 700;
        color: var(--text-dark);
        letter-spacing: -0.2px;
    }

    .row-role {
        font-size: 12px;
        font-weight: 500;
        color: var(--text-muted);
    }

    .row-checkmark {
        color: #10b981;
        font-size: 15px;
        font-weight: 800;
        margin-left: 8px;
    }

    /* ==========================================================================
       PROGRESSIVE DISCLOSURE & DATABASE SECTION
       ========================================================================== */
    .badge-subtle {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 100px;
    }
    .badge-success {
        background: rgba(16, 185, 129, 0.14);
        color: #10b981;
    }
    .badge-neutral {
        background: rgba(148, 163, 184, 0.12);
        color: #94a3b8;
    }

    .info-accordion-box {
        background: rgba(30, 41, 59, 0.5);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 14px;
        padding: 12px 14px;
        font-size: 12px;
        line-height: 1.5;
        color: var(--text-gray);
    }
    .info-accordion-box p {
        margin: 0;
    }

    .db-status-list-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 14px 16px;
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    }

    .db-status-left {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        flex: 1;
    }

    .db-icon {
        font-size: 18px;
        flex-shrink: 0;
    }

    .db-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
    }

    .db-title {
        font-size: 11px;
        font-weight: 700;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.4px;
    }

    .db-url-text {
        font-size: 12.5px;
        font-weight: 600;
        color: var(--text-dark);
        font-family: inherit;
    }

    .db-status-right {
        flex-shrink: 0;
    }

    .db-account-email {
        font-size: 12px;
        font-weight: 700;
        color: var(--text-gray);
        background: rgba(255, 255, 255, 0.05);
        padding: 4px 10px;
        border-radius: 8px;
    }

    .db-config-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px;
    }

    .form-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .field-label {
        font-size: 11.5px;
        font-weight: 700;
        color: var(--text-gray);
    }

    .minimal-input {
        width: 100%;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 12px;
        padding: 10px 14px;
        font-size: 13px;
        color: var(--text-dark);
        box-sizing: border-box;
        outline: none;
        transition: border-color 0.15s ease, background 0.15s ease;
    }
    .minimal-input:focus {
        border-color: #3b82f6;
        background: rgba(15, 23, 42, 0.95);
    }

    .form-actions-row {
        display: flex;
        gap: 10px;
        margin-top: 4px;
        flex-wrap: wrap;
    }

    .action-btn {
        flex: 1;
        min-width: 120px;
        padding: 10px 16px;
        border-radius: 12px;
        font-size: 12.5px;
        font-weight: 700;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        transition: all 0.15s ease;
        border: none;
        box-sizing: border-box;
        font-family: inherit;
    }

    .action-btn-primary {
        background: linear-gradient(135deg, #2563eb, #3b82f6);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }
    .action-btn-primary:hover {
        filter: brightness(1.08);
        transform: translateY(-1px);
    }

    .action-btn-secondary {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        color: var(--text-dark);
    }
    .action-btn-secondary:hover {
        background: rgba(255, 255, 255, 0.1);
        transform: translateY(-1px);
    }

    .action-btn-dashed {
        background: transparent;
        border: 1px dashed #3b82f6;
        color: #3b82f6;
    }
    .action-btn-dashed:hover {
        background: rgba(59, 130, 246, 0.08);
    }

    .action-btn-danger {
        background: rgba(244, 63, 94, 0.1);
        border: 1px solid rgba(244, 63, 94, 0.25);
        color: #f43f5e;
    }
    .action-btn-danger:hover {
        background: rgba(244, 63, 94, 0.18);
    }

    .db-card-footer {
        display: flex;
        border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    }

    .footer-link-btn {
        flex: 1;
        background: transparent;
        border: none;
        padding: 12px 14px;
        font-size: 12px;
        font-weight: 700;
        color: #3b82f6;
        cursor: pointer;
        transition: background 0.15s ease;
        text-align: center;
    }
    .footer-link-btn:not(:last-child) {
        border-right: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
    }
    .footer-link-btn:hover {
        background: rgba(255, 255, 255, 0.03);
    }

    /* ==========================================================================
       GOLD PRICE ROW
       ========================================================================== */
    .gold-input-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .gold-label-wrap {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .gold-icon {
        font-size: 16px;
    }

    .gold-label {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .gold-controls {
        display: flex;
        gap: 8px;
        align-items: center;
        flex: 1;
        max-width: 260px;
    }

    .gold-input {
        padding: 8px 12px;
        font-size: 13px;
        text-align: right;
    }

    .gold-update-btn {
        flex: initial;
        padding: 8px 14px;
        font-size: 12px;
    }

    /* ==========================================================================
       TARGET 2026 PROGRESS
       ========================================================================== */
    .goals-card-padding {
        padding: 16px;
    }

    .goals-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
        gap: 14px;
        width: 100%;
    }

    .goal-item-box {
        display: flex;
        flex-direction: column;
        gap: 8px;
        background: rgba(15, 23, 42, 0.5);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
        border-radius: 14px;
        padding: 12px 14px;
    }

    .goal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .goal-label {
        font-size: 12.5px;
        font-weight: 700;
        color: var(--text-gray);
    }

    .goal-value {
        font-size: 13px;
        font-weight: 800;
        color: #3b82f6;
    }

    .gold-text {
        color: #f59e0b;
    }

    .goal-bar-track {
        height: 6px;
        background: rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        overflow: hidden;
    }

    .goal-bar-fill {
        height: 100%;
        border-radius: 100px;
        transition: width 0.4s ease;
    }

    .wealth-fill {
        background: linear-gradient(90deg, #2563eb, #3b82f6);
    }

    .gold-fill {
        background: linear-gradient(90deg, #f59e0b, #fbbf24);
    }

    /* ==========================================================================
       BACKUP & MAINTENANCE
       ========================================================================== */
    .backup-actions-grid {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        margin-bottom: 10px;
    }

    .backup-secondary-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    /* ==========================================================================
       PREFERENCES & GOOGLE OAUTH
       ========================================================================== */
    .preference-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 16px;
    }

    .pref-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .pref-icon {
        font-size: 16px;
    }

    .pref-name {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text-dark);
    }

    .theme-toggle-pill {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        padding: 6px 12px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: 700;
        color: var(--text-dark);
        cursor: pointer;
        transition: background 0.15s ease;
    }
    .theme-toggle-pill:hover {
        background: rgba(255, 255, 255, 0.12);
    }

    .theme-switch-label {
        font-size: 10.5px;
        color: var(--text-muted);
    }

    .oauth-form {
        display: flex;
        gap: 10px;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
    }

    .oauth-input {
        flex: 1;
        font-size: 11.5px;
        padding: 9px 12px;
    }

    .oauth-save-btn {
        flex: initial;
        padding: 9px 16px;
        font-size: 12px;
    }

    /* ==========================================================================
       LOGOUT SECTION
       ========================================================================== */
    .logout-group {
        margin-top: 6px;
    }

    .logout-card {
        padding: 8px;
    }

    .logout-btn {
        width: 100%;
        background: rgba(244, 63, 94, 0.08);
        border: 1px solid rgba(244, 63, 94, 0.2);
        color: #f43f5e;
        border-radius: 12px;
        padding: 12px 16px;
        font-size: 13.5px;
        font-weight: 800;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.15s ease;
        -webkit-tap-highlight-color: transparent;
    }
    .logout-btn:hover {
        background: rgba(244, 63, 94, 0.15);
        border-color: rgba(244, 63, 94, 0.35);
        transform: translateY(-1px);
    }

    /* ==========================================================================
       LIGHT MODE ADAPTATION
       ========================================================================== */
    :global([data-theme="light"]) .settings-card-list {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05) !important;
    }

    :global([data-theme="light"]) .hero-inline-status {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
        color: #64748b !important;
    }

    :global([data-theme="light"]) .hero-avatar {
        border-color: #ffffff !important;
        box-shadow: 0 8px 24px -4px rgba(15, 23, 42, 0.12) !important;
    }

    :global([data-theme="light"]) .settings-row-btn:not(:last-child) {
        border-bottom-color: #f1f5f9 !important;
    }

    :global([data-theme="light"]) .settings-row-btn:hover {
        background: #f8fafc !important;
    }

    :global([data-theme="light"]) .settings-row-btn.active {
        background: #eff6ff !important;
    }

    :global([data-theme="light"]) .minimal-input {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .minimal-input:focus {
        background: #ffffff !important;
        border-color: #3b82f6 !important;
    }

    :global([data-theme="light"]) .info-accordion-box {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #475569 !important;
    }

    :global([data-theme="light"]) .db-status-list-row {
        border-bottom-color: #f1f5f9 !important;
    }

    :global([data-theme="light"]) .db-account-email {
        background: #f1f5f9 !important;
        color: #475569 !important;
    }

    :global([data-theme="light"]) .db-card-footer {
        border-top-color: #f1f5f9 !important;
    }

    :global([data-theme="light"]) .footer-link-btn:not(:last-child) {
        border-right-color: #f1f5f9 !important;
    }

    :global([data-theme="light"]) .goal-item-box {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }

    :global([data-theme="light"]) .goal-bar-track {
        background: #e2e8f0 !important;
    }

    :global([data-theme="light"]) .action-btn-secondary {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
    }

    :global([data-theme="light"]) .theme-toggle-pill {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
        color: #0f172a !important;
    }
</style>

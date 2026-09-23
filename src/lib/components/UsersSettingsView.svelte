<script>
    import { activeUser, usersList, setActiveUser, handleLogout, saveUsers } from '../stores/authStore.js';
    import {
        financialGoals,
        goldPricePerGram,
        goldApiStatus,
        saveGoldPrice,
        getUserSpreadsheetConfig,
        syncTransactionsFromSheet,
        exportToCSV,
        clearLocalCache,
        filteredData
    } from '../stores/financeStore.js';
    import {
        theme,
        toggleTheme,
        isGoalsModalOpen,
        isAppsScriptModalOpen,
        isManageUsersModalOpen,
        showConfirmModal,
        showToast
    } from '../stores/uiStore.js';

    $: u = $activeUser;
    $: list = $usersList;
    $: goals = $financialGoals;
    $: totals = $filteredData.totals;
    $: wealthPct = Math.min((totals.totalWealth / (goals.wealthGoal || 1)) * 100, 100);
    $: goldPct = Math.min((totals.totalGold / (goals.goldGoal || 1)) * 100, 100);

    let sheetUrl = '';
    let sheetToken = '';
    let manualGoldPrice = '';

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
        const updated = list.map(item => {
            if (item.id === u.id) {
                return { ...item, spreadsheetUrl: sheetUrl.trim(), spreadsheetToken: sheetToken.trim() };
            }
            return item;
        });
        saveUsers(updated);
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
</script>

<div class="dashboard-tab-view active">
    <div class="mobile-section-header">
        <h2>👥 Profil Pengguna &amp; Database</h2>
        <p>Kelola profil akun, koneksi database Google Spreadsheet pribadi, dan preferensi.</p>
    </div>

    <!-- ACTIVE PROFILE HERO CARD -->
    <div class="glass-panel mobile-profile-card">
        <div class="mobile-profile-top">
            <div class="mobile-profile-avatar" style="background: {u.color || 'var(--primary)'};">
                {#if u.picture}
                    <img src={u.picture} alt={u.name} class="nav-avatar-img" style="width:100%; height:100%; border-radius:50%;">
                {:else}
                    {u.avatar || '👤'}
                {/if}
            </div>
            <div class="mobile-profile-info">
                <h3>{u.name}</h3>
                <span class="user-role-badge">{u.role || 'Member'}</span>
                <div class="mobile-profile-email">{u.email || 'user@personal.os'}</div>
            </div>
        </div>
        <div class="mobile-profile-badges">
            <span class="profile-status-badge">🛡️ Vault Terenkripsi AES-256</span>
            <span class="profile-status-badge google-status-badge">
                <svg viewBox="0 0 24 24" style="width:13px;height:13px;"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                Akun Terhubung
            </span>
        </div>
    </div>

    <!-- MULTI-USER SWITCHER -->
    <div class="glass-panel">
        <div class="panel-title">
            <span>Ganti Profil Pengguna</span>
            <button
                type="button"
                on:click={() => isManageUsersModalOpen.set(true)}
                style="background:none; border:none; color:#14b8a6; font-size:12px; font-weight:700; cursor:pointer;"
            >
                + Kelola Profil
            </button>
        </div>
        <div class="user-chips-row">
            {#each list as item}
                <button
                    type="button"
                    class="user-chip-btn"
                    class:active={item.id === u.id}
                    on:click={() => setActiveUser(item.id)}
                >
                    <span class="chip-avatar" style="background: {item.color || 'var(--primary)'};">
                        {item.avatar || '👤'}
                    </span>
                    <span class="chip-name">{item.name}</span>
                </button>
            {/each}
        </div>
    </div>

    <!-- DATABASE GOOGLE SPREADSHEET PRIBADI -->
    <div class="glass-panel section-spreadsheet-db" style="border: 1px solid rgba(20, 184, 166, 0.35);">
        <div class="panel-title" style="display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:20px;">🗄️</span>
                <span>Database Google Spreadsheet Pribadi</span>
            </div>
            <span class="badge" style="font-size:10.5px; background:rgba(16,185,129,0.15); color:#10b981;">
                {sheetUrl ? 'Spreadsheet Pribadi' : 'Template Standar'}
            </span>
        </div>
        <p style="font-size:12.5px; color:var(--text-gray); margin-bottom:12px; line-height:1.5;">
            Setiap akun dapat memiliki database Google Spreadsheet pribadi. Masukkan URL Web App Apps Script Anda agar riwayat keuangan otomatis tersimpan di Spreadsheet pribadi Anda saat online.
        </p>
        
        <div style="background:var(--list-bg); padding:10px 14px; border-radius:12px; margin-bottom:12px; font-size:12px; color:var(--text-gray); display:flex; align-items:center; justify-content:space-between;">
            <span>👤 Akun Pemilik Database:</span>
            <strong style="color:var(--text-dark);">{u.email || 'user@personal.os'}</strong>
        </div>

        <form on:submit={handleSaveSpreadsheetSettings} style="gap:12px;">
            <div>
                <label style="font-size:12px; font-weight:700; color:var(--text-gray); display:block; margin-bottom:6px;">
                    URL Web App Google Apps Script
                </label>
                <input
                    type="url"
                    bind:value={sheetUrl}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    autocomplete="off"
                    style="font-size:13px; padding:10px 14px;"
                >
            </div>
            <div>
                <label style="font-size:12px; font-weight:700; color:var(--text-gray); display:block; margin-bottom:6px;">
                    Token Akses (Opsional)
                </label>
                <input
                    type="text"
                    bind:value={sheetToken}
                    placeholder="RebelAman2026"
                    autocomplete="off"
                    style="font-size:13px; padding:10px 14px;"
                >
            </div>
            <div style="display:flex; gap:8px; margin-top:4px; flex-wrap:wrap;">
                <button
                    type="button"
                    on:click={handleTestConnection}
                    class="btn-primary"
                    style="flex:1; background:#0284c7; padding:11px; border-radius:12px; font-size:12.5px;"
                >
                    🔍 Tes Koneksi
                </button>
                <button
                    type="submit"
                    class="btn-primary"
                    style="flex:1; padding:11px; border-radius:12px; font-size:12.5px;"
                >
                    💾 Simpan Konfigurasi
                </button>
            </div>
        </form>

        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
            <button
                type="button"
                on:click={() => isAppsScriptModalOpen.set(true)}
                class="btn-secondary"
                style="flex:1; padding:10px; border-radius:12px; font-size:12px; border:1px dashed var(--primary); background:transparent; color:#14b8a6; cursor:pointer;"
            >
                📜 Lihat Petunjuk &amp; Kode Script
            </button>
            <button
                type="button"
                on:click={() => syncTransactionsFromSheet(true)}
                class="btn-secondary"
                style="flex:1; padding:10px; border-radius:12px; font-size:12px; border:1px solid var(--border-color); background:var(--list-bg); color:var(--text-dark); cursor:pointer;"
            >
                🔄 Sinkronkan Sekarang
            </button>
        </div>
    </div>

    <!-- HARGA EMAS SPOT API -->
    <div class="glass-panel section-gold" style="display: flex; justify-content: space-between; align-items: center; gap:14px; flex-wrap: wrap;">
        <span style="font-weight: 700; font-size: 13.5px; display: flex; align-items: center; gap: 8px;">
            <span>🏷️ Harga Emas Tring / Gram:</span>
            <small style="color:#10b981; font-weight:600; font-size:11.5px;">{$goldApiStatus}</small>
        </span>
        <div style="display: flex; gap: 8px; flex:1; max-width: 300px;">
            <input
                type="text"
                bind:value={manualGoldPrice}
                on:input={handleGoldInput}
                placeholder="1.250.000"
                style="margin:0; min-height: 38px;"
            >
            <button
                type="button"
                on:click={handleSaveGoldPrice}
                class="btn-primary"
                style="width: auto; padding: 8px 16px; border-radius: 12px; min-height: 38px; font-size: 13px;"
            >
                Update
            </button>
        </div>
    </div>

    <!-- TARGET 2026 PROGRESS CARD -->
    <div class="glass-panel section-goals">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; width: 100%;">
            <h2 style="font-size: 16px; font-weight: 800; color: var(--text-dark); margin: 0;">🎯 Progress Target 2026</h2>
            <button
                type="button"
                on:click={() => isGoalsModalOpen.set(true)}
                style="width: auto; font-size: 11.5px; font-weight: 700; padding: 6px 14px; border-radius: 100px; border: 1px solid var(--border-color); cursor: pointer; background: var(--list-bg); color: #14b8a6;"
            >
                Edit Target
            </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; width: 100%;">
            <div style="background: var(--list-bg); padding: 16px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 8px;">
                    <span style="color: var(--text-gray);">Kekayaan Total</span>
                    <span style="color: #14b8a6; font-weight: 800;">{wealthPct.toFixed(1)}%</span>
                </div>
                <div class="budget-bar-track">
                    <div class="budget-bar-fill" style="width: {wealthPct}%; background: linear-gradient(90deg, #0f766e, #14b8a6);"></div>
                </div>
            </div>
            
            <div style="background: var(--list-bg); padding: 16px; border-radius: 16px; border: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 700; margin-bottom: 8px;">
                    <span style="color: var(--text-gray);">Aset Emas</span>
                    <span style="color: var(--tring); font-weight: 800;">{goldPct.toFixed(1)}%</span>
                </div>
                <div class="budget-bar-track">
                    <div class="budget-bar-fill" style="width: {goldPct}%; background: linear-gradient(90deg, var(--tring), #f59e0b);"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- CADANGAN & BACKUP -->
    <div class="glass-panel">
        <div class="panel-title">Cadangan &amp; Pemeliharaan Data</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <button
                type="button"
                on:click={exportToCSV}
                class="btn-primary"
                style="padding:12px; border-radius:14px; display:flex; align-items:center; justify-content:center; gap:8px;"
            >
                📥 Ekspor Transaksi ke CSV
            </button>
            <button
                type="button"
                on:click={handleClearCacheConfirm}
                class="btn-danger"
                style="padding:12px; border-radius:14px;"
            >
                🗑️ Bersihkan Cache Lokal
            </button>
        </div>
    </div>

    <!-- PREFERENCES & LOGOUT -->
    <div class="glass-panel">
        <div class="panel-title">Tampilan &amp; Keamanan</div>
        <div style="display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; background:var(--list-bg); padding:12px 14px; border-radius:14px; border:1px solid var(--border-color);">
                <span style="font-weight:700; font-size:13px; display:flex; align-items:center; gap:8px;">
                    <span>🌗</span> Mode Gelap
                </span>
                <label class="theme-switch" title="Ganti Tema">
                    <input
                        type="checkbox"
                        checked={$theme === 'dark'}
                        on:change={toggleTheme}
                    >
                    <span class="slider"></span>
                </label>
            </div>
            <button
                type="button"
                on:click={handleLogout}
                class="btn-danger"
                style="padding:12px; border-radius:14px; display:flex; align-items:center; justify-content:center; gap:8px; border-color:var(--expense); background:var(--expense-light);"
            >
                🚪 Keluar dari Vault (Logout)
            </button>
        </div>
    </div>
</div>

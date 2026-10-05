<script>
    import { isGooglePickerModalOpen, showToast } from '../stores/uiStore.js';
    import {
        usersList,
        executeGoogleLoginSuccess,
        googleClientId,
        saveGoogleClientId
    } from '../stores/authStore.js';

    let activeTab = 'accounts'; // 'accounts' | 'clientId' | 'newAccount'
    let customName = '';
    let customEmail = '';
    let clientIdInput = '';

    $: list = $usersList;
    $: googleUsers = list.filter(u => u.email && (u.role === 'Google Account' || u.email.includes('@') || u.picture));
    $: clientIdInput = $googleClientId || '';

    function handleSelectAccount(name, email, picture) {
        isGooglePickerModalOpen.set(false);
        const sub = 'google_sub_' + Math.abs(name.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0));
        executeGoogleLoginSuccess({
            name,
            email,
            picture,
            sub
        });
    }

    function handleCustomSubmit(e) {
        if (e) e.preventDefault();
        const n = customName.trim();
        const em = customEmail.trim();
        if (!n || !em) return;
        if (!em.includes('@')) {
            showToast('Format email tidak valid', 'warning', '⚠️');
            return;
        }
        handleSelectAccount(n, em, '');
        activeTab = 'accounts';
    }

    function handleSaveClientId(e) {
        if (e) e.preventDefault();
        saveGoogleClientId(clientIdInput);
        activeTab = 'accounts';
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            isGooglePickerModalOpen.set(false);
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isGooglePickerModalOpen) isGooglePickerModalOpen.set(false); }} />

{#if $isGooglePickerModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active google-picker-mode"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-label="Google Identity"
    >
        <div class="google-picker-card" role="document">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="google-header-logo" style="margin-bottom: 0;">
                    <svg viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Google Identity</span>
                </div>
                <button
                    type="button"
                    class="action-btn"
                    style="border-radius: 50%; width: 32px; height: 32px; font-size: 14px;"
                    on:click={() => isGooglePickerModalOpen.set(false)}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <!-- Tab Switcher -->
            <div style="display: flex; gap: 6px; background: var(--list-bg, #f1f5f9); padding: 4px; border-radius: 12px; margin-bottom: 14px;">
                <button
                    type="button"
                    class="sisa-scope-btn"
                    class:active={activeTab === 'accounts'}
                    on:click={() => activeTab = 'accounts'}
                    style="flex: 1; font-size: 11.5px; padding: 6px;"
                >
                    Pilih Akun
                </button>
                <button
                    type="button"
                    class="sisa-scope-btn"
                    class:active={activeTab === 'newAccount'}
                    on:click={() => activeTab = 'newAccount'}
                    style="flex: 1; font-size: 11.5px; padding: 6px;"
                >
                    + Akun Baru
                </button>
                <button
                    type="button"
                    class="sisa-scope-btn"
                    class:active={activeTab === 'clientId'}
                    on:click={() => activeTab = 'clientId'}
                    style="flex: 1; font-size: 11.5px; padding: 6px;"
                >
                    ⚙️ OAuth ID
                </button>
            </div>

            {#if activeTab === 'accounts'}
                <h3 class="google-picker-title">Lanjutkan dengan Google</h3>
                <p class="google-picker-subtitle">
                    Pilih akun tersimpan untuk membuka vault keuangan mandiri Anda.
                </p>

                <div class="google-account-list">
                    {#if googleUsers.length > 0}
                        {#each googleUsers as u}
                            <button
                                type="button"
                                class="google-account-item"
                                on:click={() => handleSelectAccount(u.name, u.email, u.picture || '')}
                            >
                                {#if u.picture}
                                    <img src={u.picture} class="google-avatar-img" alt={u.name}>
                                {:else}
                                    <div class="google-avatar-placeholder" style="background: {u.color || '#0f766e'};">
                                        {u.avatar || u.name.charAt(0)}
                                    </div>
                                {/if}
                                <div class="google-acc-details">
                                    <div class="google-acc-name">
                                        {u.name} <span style="color:#10b981; font-size:11px;">✓ Tersimpan</span>
                                    </div>
                                    <div class="google-acc-email">{u.email}</div>
                                </div>
                            </button>
                        {/each}
                    {:else}
                        <button
                            type="button"
                            class="google-account-item"
                            on:click={() => handleSelectAccount('Akun Google Saya', 'user@gmail.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face')}
                        >
                            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" class="google-avatar-img" alt="Akun">
                            <div class="google-acc-details">
                                <div class="google-acc-name">Akun Google Saya <span style="color:#10b981; font-size:11px;">✓ Siap Pakai</span></div>
                                <div class="google-acc-email">user@gmail.com</div>
                            </div>
                        </button>
                    {/if}

                    <button type="button" class="google-account-item" on:click={() => activeTab = 'newAccount'}>
                        <div class="google-avatar-placeholder" style="background:#0284c7; color:#ffffff; font-weight:800;">＋</div>
                        <div class="google-acc-details">
                            <div class="google-acc-name" style="color:#0284c7; font-weight:700;">Masuk dengan Email Google Lain</div>
                            <div class="google-acc-email">Daftar atau masukkan alamat @gmail.com</div>
                        </div>
                    </button>
                </div>

                <div class="google-picker-footer">
                    Setiap akun Google memiliki ruang database terisolasi dan dapat dihubungkan ke spreadsheet masing-masing.
                </div>

            {:else if activeTab === 'newAccount'}
                <h3 class="google-picker-title">Daftar / Masuk Akun Google</h3>
                <p class="google-picker-subtitle">
                    Masukkan nama dan email Google Anda untuk membuat profil vault baru.
                </p>

                <form on:submit={handleCustomSubmit} style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px; text-align: left;">
                    <div>
                        <label for="google-custom-name" style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Nama Lengkap</label>
                        <input
                            id="google-custom-name"
                            type="text"
                            bind:value={customName}
                            placeholder="Misal: Aldian Ridho"
                            required
                            autocomplete="name"
                            style="width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 12px;"
                        >
                    </div>
                    <div>
                        <label for="google-custom-email" style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Email Google (@gmail.com)</label>
                        <input
                            id="google-custom-email"
                            type="email"
                            bind:value={customEmail}
                            placeholder="nama@gmail.com"
                            required
                            autocomplete="email"
                            style="width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 12px;"
                        >
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="button" on:click={() => activeTab = 'accounts'} class="btn-danger" style="flex: 1; border-radius: 12px; padding: 11px;">Kembali</button>
                        <button type="submit" class="btn-primary" style="flex: 1.5; border-radius: 12px; padding: 11px;">Daftar &amp; Masuk ➔</button>
                    </div>
                </form>

            {:else if activeTab === 'clientId'}
                <h3 class="google-picker-title">Google OAuth Client ID</h3>
                <p class="google-picker-subtitle">
                    Untuk menggunakan tombol popup Google resmi, masukkan <b>Client ID</b> dari Google Cloud Console Anda.
                </p>

                <form on:submit={handleSaveClientId} style="display: flex; flex-direction: column; gap: 12px; margin-top: 14px; text-align: left;">
                    <div>
                        <label for="google-client-id-val" style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Google Client ID (Web Client)</label>
                        <input
                            id="google-client-id-val"
                            type="text"
                            bind:value={clientIdInput}
                            placeholder="123456789-xxxx.apps.googleusercontent.com"
                            autocomplete="off"
                            style="width: 100%; box-sizing: border-box; padding: 11px 14px; border-radius: 12px; font-family: monospace; font-size: 11px;"
                        >
                    </div>
                    <div style="font-size: 11.5px; color: var(--text-gray); line-height: 1.4;">
                        💡 Jika belum memiliki Client ID, Anda tetap bisa masuk secara instan menggunakan tab <b>Pilih Akun</b>.
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 6px;">
                        <button type="button" on:click={() => activeTab = 'accounts'} class="btn-danger" style="flex: 1; border-radius: 12px; padding: 11px;">Kembali</button>
                        <button type="submit" class="btn-primary" style="flex: 1.5; border-radius: 12px; padding: 11px;">Simpan Client ID</button>
                    </div>
                </form>
            {/if}
        </div>
    </div>
{/if}

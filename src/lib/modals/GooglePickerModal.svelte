<script>
    import { isGooglePickerModalOpen } from '../stores/uiStore.js';
    import { usersList, executeGoogleLoginSuccess } from '../stores/authStore.js';

    let isCustomSignup = false;
    let customName = '';
    let customEmail = '';

    $: list = $usersList;
    $: googleUsers = list.filter(u => u.email && (u.role === 'Google Account' || u.email.includes('@') || u.picture));

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
        handleSelectAccount(n, em, '');
    }
</script>

{#if $isGooglePickerModalOpen}
    <div class="modal-overlay active google-picker-mode" on:click={() => isGooglePickerModalOpen.set(false)}>
        <div class="google-picker-card" on:click|stopPropagation>
            <div class="google-header-logo">
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Google</span>
            </div>

            {#if !isCustomSignup}
                <h3 class="google-picker-title">Pilih atau Buat Akun</h3>
                <p class="google-picker-subtitle">
                    Setiap akun memiliki vault mandiri &amp; database Google Spreadsheet tersendiri.
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
                            on:click={() => handleSelectAccount('Ido Ganteng', 'aldianridhoku@gmail.com', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face')}
                        >
                            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face" class="google-avatar-img" alt="Ido">
                            <div class="google-acc-details">
                                <div class="google-acc-name">Ido Ganteng <span style="color:#10b981; font-size:11px;">✓ Akun Utama</span></div>
                                <div class="google-acc-email">aldianridhoku@gmail.com</div>
                            </div>
                        </button>
                    {/if}

                    <button type="button" class="google-account-item" on:click={() => isCustomSignup = true}>
                        <div class="google-avatar-placeholder" style="background:#0284c7; color:#ffffff; font-weight:800;">＋</div>
                        <div class="google-acc-details">
                            <div class="google-acc-name" style="color:#0284c7; font-weight:700;">Masuk / Buat Akun Google Baru</div>
                            <div class="google-acc-email">Daftar dengan email Google Anda</div>
                        </div>
                    </button>
                </div>

                <div class="google-picker-footer">
                    Data Anda diamankan dengan enkripsi lokal AES-256. Setiap akun Google memiliki basis data terpisah dan dapat dihubungkan ke spreadsheet masing-masing.
                </div>

                <button
                    type="button"
                    on:click={() => isGooglePickerModalOpen.set(false)}
                    class="btn-danger"
                    style="width: 100%; margin-top: 14px; border-radius: 12px; font-size: 13px;"
                >
                    Batal
                </button>
            {:else}
                <p style="font-size:12.5px; color:var(--text-gray); margin-top:2px;">
                    Akun baru Anda akan memiliki database vault lokal &amp; spreadsheet sendiri.
                </p>
                <form on:submit={handleCustomSubmit} style="gap: 12px; margin-top: 14px; text-align: left;">
                    <div>
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Nama Lengkap</label>
                        <input type="text" bind:value={customName} placeholder="Misal: Aldian Ridho" required autocomplete="name" style="padding: 11px 14px;">
                    </div>
                    <div>
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Email Google (@gmail.com)</label>
                        <input type="email" bind:value={customEmail} placeholder="nama@gmail.com" required autocomplete="email" style="padding: 11px 14px;">
                    </div>
                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button type="button" on:click={() => isCustomSignup = false} class="btn-danger" style="flex: 1; border-radius: 12px;">Kembali</button>
                        <button type="submit" class="btn-primary" style="flex: 1; border-radius: 12px;">Daftar &amp; Masuk</button>
                    </div>
                </form>
            {/if}
        </div>
    </div>
{/if}

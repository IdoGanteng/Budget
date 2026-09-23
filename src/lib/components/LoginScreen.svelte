<script>
    import { isGooglePickerModalOpen } from '../stores/uiStore.js';
    import { handleVaultLogin } from '../stores/authStore.js';

    let username = '';
    let password = '';
    let showPassword = false;
    let errorMessage = '';

    function onSubmit(e) {
        if (e) e.preventDefault();
        errorMessage = '';
        const res = handleVaultLogin(username, password);
        if (!res.success && res.message) {
            errorMessage = res.message;
        }
    }

    function triggerGoogle() {
        if (window.google && window.google.accounts && window.google.accounts.id) {
            try {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        isGooglePickerModalOpen.set(true);
                    }
                });
                return;
            } catch (e) {}
        }
        isGooglePickerModalOpen.set(true);
    }
</script>

<div id="login-wrapper">
    <div id="login-container">
        <div class="login-brand-header">
            <div class="login-logo-badge">🔐</div>
            <h1>Personal OS</h1>
            <p class="subtitle">Keuangan lebih jelas, keputusan lebih tenang.</p>
        </div>

        <div class="login-box-card">
            <div style="text-align: left;">
                <h2 style="font-size: 19px; font-weight: 800; color: var(--text-dark);">Selamat Datang</h2>
                <p style="font-size: 13px; color: var(--text-gray); margin-top: 2px;">
                    Setiap akun Google memiliki ruang vault mandiri &amp; database spreadsheet tersendiri.
                </p>
            </div>

            <!-- TOMBOL LOGIN / BUAT AKUN GOOGLE RESMI & AMAN (ALA INSTAGRAM) -->
            <button
                type="button"
                class="btn-google-primary"
                on:click={triggerGoogle}
                title="Masuk / Buat Akun menggunakan Google"
            >
                <svg viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Masuk / Buat Akun dengan Google</span>
            </button>

            <div class="or-divider">
                <hr>
                <span>atau dengan password vault</span>
                <hr>
            </div>

            <!-- FORM LOGIN MASTER KEY -->
            <form on:submit={onSubmit} style="gap: 12px;">
                <input
                    type="text"
                    bind:value={username}
                    placeholder="Username (misal: Rebel)"
                    autocomplete="username"
                    required
                >
                <div class="password-wrapper">
                    {#if showPassword}
                        <input
                            type="text"
                            bind:value={password}
                            placeholder="Password Vault"
                            autocomplete="current-password"
                            required
                        >
                    {:else}
                        <input
                            type="password"
                            bind:value={password}
                            placeholder="Password Vault"
                            autocomplete="current-password"
                            required
                        >
                    {/if}
                    <button
                        type="button"
                        class="toggle-password"
                        on:click={() => showPassword = !showPassword}
                        aria-label="Toggle Password Visibility"
                    >
                        {showPassword ? '🙈' : '👀'}
                    </button>
                </div>
                {#if errorMessage}
                    <div style="color: var(--expense); font-size: 12px; text-align: left;">{errorMessage}</div>
                {/if}
                <button type="submit">Buka Vault</button>
            </form>
        </div>
    </div>
</div>

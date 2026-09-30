<script>
    import { onMount } from 'svelte';
    import { isGooglePickerModalOpen, theme, toggleTheme } from '../stores/uiStore.js';
    import {
        handleVaultLogin,
        handleQuickLogin,
        usersList,
        googleClientId,
        handleGoogleCredentialResponse
    } from '../stores/authStore.js';

    let username = '';
    let password = '';
    let showPassword = false;
    let errorMessage = '';
    let googleBtnRef;

    $: savedUsers = $usersList || [];

    onMount(() => {
        initGoogleSignIn();
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (window.google?.accounts?.id && $googleClientId) {
                initGoogleSignIn();
                clearInterval(interval);
            } else if (attempts >= 20) {
                clearInterval(interval);
            }
        }, 250);

        return () => {
            clearInterval(interval);
        };
    });

    function initGoogleSignIn() {
        if (typeof window !== 'undefined' && window.google?.accounts?.id && $googleClientId) {
            try {
                window.google.accounts.id.initialize({
                    client_id: $googleClientId,
                    callback: handleGoogleCredentialResponse,
                    auto_select: false,
                    cancel_on_tap_outside: true
                });
                if (googleBtnRef) {
                    googleBtnRef.innerHTML = '';
                    window.google.accounts.id.renderButton(googleBtnRef, {
                        theme: $theme === 'dark' ? 'filled_black' : 'outline',
                        size: 'large',
                        text: 'signin_with',
                        shape: 'pill',
                        width: 300,
                        logo_alignment: 'left'
                    });
                }
            } catch (err) {
                console.warn('Google Identity initialization notice:', err);
            }
        }
    }

    $: if ($googleClientId && googleBtnRef) {
        initGoogleSignIn();
    }

    function onSubmit(e) {
        if (e) e.preventDefault();
        errorMessage = '';
        const res = handleVaultLogin(username, password);
        if (!res.success && res.message) {
            errorMessage = res.message;
        }
    }

    function triggerGoogleLogin() {
        if (window.google?.accounts?.id && $googleClientId) {
            try {
                window.google.accounts.id.prompt((notification) => {
                    if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        isGooglePickerModalOpen.set(true);
                    }
                });
                return;
            } catch (e) {
                console.warn('GIS prompt error:', e);
            }
        }
        // Fallback or no client ID configured yet: open Google modal
        isGooglePickerModalOpen.set(true);
    }
</script>

<div id="login-wrapper">
    <div id="login-container">
        <!-- Top Controls: Theme Toggle -->
        <div style="display: flex; justify-content: space-between; align-items: center; width: 100%; margin-bottom: 8px;">
            <span class="badge" style="font-size: 11px; font-weight: 700; color: #14b8a6; background: rgba(20, 184, 166, 0.12);">
                ✦ Personal OS v2.0
            </span>
            <button
                type="button"
                on:click={toggleTheme}
                class="action-btn"
                style="width: 36px; height: 36px; border-radius: 50%; font-size: 15px;"
                title="Ganti Tema Tampilan"
                aria-label="Toggle Theme"
            >
                {$theme === 'dark' ? '☀️' : '🌙'}
            </button>
        </div>

        <!-- Brand Header (MemFinance Style) -->
        <div class="login-brand-header">
            <div class="login-logo-badge">🔐</div>
            <h1 style="font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px;">Personal OS</h1>
            <p class="subtitle" style="font-size: 13.5px; color: var(--text-gray); margin-bottom: 20px;">
                Keuangan lebih jelas, keputusan lebih tenang.
            </p>
        </div>

        <div class="login-box-card" style="display: flex; flex-direction: column; gap: 16px;">
            <!-- GOOGLE SIGN IN BUTTON -->
            <div style="display: flex; flex-direction: column; align-items: center; gap: 8px; width: 100%;">
                {#if $googleClientId}
                    <div bind:this={googleBtnRef} style="min-height: 44px; display: flex; justify-content: center; width: 100%;"></div>
                {/if}

                <button
                    type="button"
                    class="btn-google-primary"
                    on:click={triggerGoogleLogin}
                    title="Masuk dengan Akun Google"
                >
                    <svg viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Masuk dengan Google</span>
                </button>
            </div>

            <!-- QUICK ONE-CLICK PROFILE ACCESS (LOCAL PROFILES) -->
            {#if savedUsers.length > 0}
                <div style="background: var(--list-bg); border: 1px solid var(--border-color); border-radius: 16px; padding: 12px; text-align: left;">
                    <div style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
                        <span>⚡ Masuk Cepat Profil Lokal:</span>
                        <span style="font-size: 10px; color: #10b981; font-weight: 800;">1-Klik</span>
                    </div>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        {#each savedUsers as u}
                            <button
                                type="button"
                                class="form-user-btn"
                                on:click={() => handleQuickLogin(u)}
                                title="Masuk langsung sebagai {u.name}"
                                style="font-size: 12px; padding: 6px 10px; border-radius: 10px; display: flex; align-items: center; gap: 6px; background: var(--card-bg); border: 1px solid var(--border-color); cursor: pointer;"
                            >
                                {#if u.picture}
                                    <img src={u.picture} alt={u.name} style="width: 18px; height: 18px; border-radius: 50%; object-fit: cover; display: inline-block; vertical-align: middle;">
                                {:else if u.avatar && u.avatar.includes('<img')}
                                    {@html u.avatar}
                                {:else}
                                    <span style="font-size: 13px;">{u.avatar || '👤'}</span>
                                {/if}
                                <strong style="color: var(--text-dark);">{u.name}</strong>
                            </button>
                        {/each}
                    </div>
                </div>
            {/if}

            <div class="or-divider">
                <hr>
                <span>atau password vault</span>
                <hr>
            </div>

            <!-- FORM LOGIN MASTER KEY / VAULT -->
            <form on:submit={onSubmit} style="display: flex; flex-direction: column; gap: 10px;">
                <input
                    type="text"
                    bind:value={username}
                    placeholder="Username (misal: Rebel)"
                    autocomplete="username"
                    required
                    style="border-radius: 14px; padding: 12px 14px; font-size: 13.5px;"
                >
                <div class="password-wrapper">
                    {#if showPassword}
                        <input
                            type="text"
                            bind:value={password}
                            placeholder="Password Vault"
                            autocomplete="current-password"
                            required
                            style="border-radius: 14px; padding: 12px 14px; font-size: 13.5px; width: 100%; box-sizing: border-box;"
                        >
                    {:else}
                        <input
                            type="password"
                            bind:value={password}
                            placeholder="Password Vault"
                            autocomplete="current-password"
                            required
                            style="border-radius: 14px; padding: 12px 14px; font-size: 13.5px; width: 100%; box-sizing: border-box;"
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
                    <div style="color: var(--expense); font-size: 12px; text-align: left; font-weight: 600;">
                        {errorMessage}
                    </div>
                {/if}

                <button
                    type="submit"
                    class="btn-primary"
                    style="padding: 13px; border-radius: 14px; font-size: 14px; font-weight: 800; margin-top: 4px;"
                >
                    Buka Vault ➔
                </button>
            </form>

            <div style="font-size: 11.5px; color: var(--text-gray); line-height: 1.4; text-align: center; margin-top: 4px;">
                🛡️ Data Anda disimpan terenkripsi secara lokal &amp; mandiri di browser Anda.
            </div>
        </div>
    </div>
</div>

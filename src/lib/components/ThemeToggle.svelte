<script>
    import { theme, toggleTheme } from '../stores/uiStore.js';
</script>

<button
    type="button"
    class="theme-toggle-btn"
    class:is-dark={$theme === 'dark'}
    on:click={toggleTheme}
    role="switch"
    aria-checked={$theme === 'dark'}
    title={$theme === 'dark' ? 'Mode Gelap (Klik untuk beralih ke Mode Terang)' : 'Mode Terang (Klik untuk beralih ke Mode Gelap)'}
    aria-label="Beralih Mode Gelap atau Terang"
>
    <span class="theme-icon sun" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
    </span>

    <span class="theme-icon moon" aria-hidden="true">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
    </span>

    <span class="theme-thumb" aria-hidden="true">
        {#if $theme === 'dark'}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
        {:else}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5" fill="#f59e0b"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
        {/if}
    </span>
</button>

<style>
    .theme-toggle-btn {
        position: relative;
        width: 58px;
        height: 32px;
        border-radius: 100px;
        border: 1px solid var(--border-color);
        background: var(--list-bg);
        cursor: pointer;
        padding: 3px;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.25), 0 2px 6px rgba(0, 0, 0, 0.15);
        transition: border-color 0.25s ease, background 0.25s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.25s ease;
        outline: none;
        user-select: none;
        -webkit-tap-highlight-color: transparent;
    }
    .theme-toggle-btn:hover {
        transform: translateY(-2px);
        border-color: var(--primary);
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(139, 92, 246, 0.25);
    }
    .theme-toggle-btn:active {
        transform: scale(0.96);
    }
    :global([data-theme="light"]) .theme-toggle-btn {
        background: #e2e8f0;
        border-color: #cbd5e1;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    :global([data-theme="light"]) .theme-toggle-btn:hover {
        border-color: #8b5cf6;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(124, 58, 237, 0.15);
    }

    .theme-icon {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: opacity 0.25s ease, transform 0.25s ease;
        z-index: 1;
        pointer-events: none;
    }
    .theme-icon.sun {
        color: #f59e0b;
        opacity: 0.45;
    }
    .theme-icon.moon {
        color: #c084fc;
        opacity: 0.45;
    }

    .theme-toggle-btn.is-dark .theme-icon.moon {
        opacity: 0.25;
    }
    .theme-toggle-btn:not(.is-dark) .theme-icon.sun {
        opacity: 0.25;
    }

    .theme-thumb {
        position: absolute;
        top: 3px;
        left: 4px;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease, box-shadow 0.3s ease;
        z-index: 2;
        background: #ffffff;
        color: #f59e0b;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 0 10px rgba(245, 158, 11, 0.4);
    }

    .theme-toggle-btn.is-dark .theme-thumb {
        transform: translateX(26px);
        background: linear-gradient(135deg, #8b5cf6, #7c3aed);
        color: #ffffff;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4), 0 0 14px rgba(139, 92, 246, 0.6);
    }
</style>

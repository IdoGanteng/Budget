<script>
    import { toasts } from '../stores/uiStore.js';

    function getBorderColor(type) {
        if (type === 'success') return 'var(--income)';
        if (type === 'error') return 'var(--expense)';
        if (type === 'warning') return 'var(--tring)';
        return 'var(--primary)';
    }
</script>

<div id="toast-container">
    {#each $toasts as t (t.id)}
        <div class="toast-msg" style="border-left: 4px solid {getBorderColor(t.type)};">
            <span class="toast-icon">{t.icon || '✨'}</span>
            <span class="toast-text">{@html t.message}</span>
        </div>
    {/each}
</div>

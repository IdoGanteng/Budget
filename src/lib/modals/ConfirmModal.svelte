<script>
    import { confirmModalState, closeConfirmModal } from '../stores/uiStore.js';

    $: state = $confirmModalState;

    function handleConfirm() {
        if (state.onConfirm) state.onConfirm();
        closeConfirmModal();
    }
</script>

{#if state.isOpen}
    <div class="modal-overlay active" on:click={closeConfirmModal}>
        <div class="modal-box" on:click|stopPropagation>
            <div class="modal-icon">{state.icon || '⚠️'}</div>
            <h3>{state.title}</h3>
            <div style="font-size: 13.5px; color: var(--text-gray); margin-bottom: 16px; line-height: 1.5;">
                {@html state.desc}
            </div>
            <div class="modal-actions">
                <button
                    type="button"
                    class="btn-danger"
                    on:click={closeConfirmModal}
                    style="flex: 1; padding: 12px; border-radius: 14px;"
                >
                    {state.cancelText || 'Batal'}
                </button>
                <button
                    type="button"
                    class={state.isDanger ? 'btn-danger' : 'btn-primary'}
                    on:click={handleConfirm}
                    style="flex: 1; padding: 12px; border-radius: 14px; {state.isDanger ? 'background: var(--expense); color: white;' : ''}"
                >
                    {state.confirmText || 'Ya'}
                </button>
            </div>
        </div>
    </div>
{/if}

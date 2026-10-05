<script>
    import { isGoalsModalOpen } from '../stores/uiStore.js';
    import { financialGoals, saveGoals } from '../stores/financeStore.js';

    let wealthStr = '';
    let goldStr = '';

    $: if ($isGoalsModalOpen) {
        const g = $financialGoals;
        wealthStr = new Intl.NumberFormat('id-ID').format(g.wealthGoal || 50000000);
        goldStr = new Intl.NumberFormat('id-ID').format(g.goldGoal || 10000000);
    }

    function formatInput(val) {
        const raw = val.replace(/[^0-9]/g, '');
        return raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function handleSave(e) {
        if (e) e.preventDefault();
        const wVal = parseInt(wealthStr.replace(/\./g, ''), 10) || 0;
        const gVal = parseInt(goldStr.replace(/\./g, ''), 10) || 0;
        if (wVal > 0 && gVal > 0) {
            saveGoals(wVal, gVal);
            isGoalsModalOpen.set(false);
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            isGoalsModalOpen.set(false);
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isGoalsModalOpen) isGoalsModalOpen.set(false); }} />

{#if $isGoalsModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="goals-modal-title"
    >
        <div class="modal-box" style="text-align: left; max-width: 420px;" role="document">
            <div style="font-size: 32px; margin-bottom: 12px;">🎯</div>
            <h3 id="goals-modal-title">Pengaturan Target 2026</h3>
            <p>Tentukan target finansial impian kamu tahun ini.</p>

            <form on:submit={handleSave} style="gap: 16px;">
                <div>
                    <label for="goal-wealth-val" style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Target Kekayaan Total (Rp)
                    </label>
                    <input
                        id="goal-wealth-val"
                        type="text"
                        value={wealthStr}
                        on:input={(e) => wealthStr = formatInput(e.target.value)}
                        placeholder="50.000.000"
                        required
                    >
                </div>

                <div>
                    <label for="goal-gold-val" style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Target Aset Emas (Rp)
                    </label>
                    <input
                        id="goal-gold-val"
                        type="text"
                        value={goldStr}
                        on:input={(e) => goldStr = formatInput(e.target.value)}
                        placeholder="10.000.000"
                        required
                    >
                </div>

                <div class="modal-actions" style="margin-top: 10px;">
                    <button
                        type="button"
                        on:click={() => isGoalsModalOpen.set(false)}
                        class="btn-danger"
                        style="flex: 1; padding: 12px; border-radius: 14px;"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        style="flex: 1; padding: 12px; border-radius: 14px;"
                    >
                        Simpan
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

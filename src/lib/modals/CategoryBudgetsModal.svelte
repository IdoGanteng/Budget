<script>
    import { isCategoryBudgetsModalOpen, showToast } from '../stores/uiStore.js';
    import { categoryBudgets, saveBudgets, CATEGORIES } from '../stores/financeStore.js';

    let budgets = {
        makan: 1200000,
        belanja: 800000,
        transport: 500000,
        tagihan: 750000,
        hiburan: 400000,
        kesehatan: 300000
    };

    let inputValues = {};

    $: if ($isCategoryBudgetsModalOpen) {
        const stored = $categoryBudgets || {};
        budgets = {
            makan: stored.makan || 1200000,
            belanja: stored.belanja || 800000,
            transport: stored.transport || 500000,
            tagihan: stored.tagihan || 750000,
            hiburan: stored.hiburan || 400000,
            kesehatan: stored.kesehatan || 300000
        };
        for (const [k, v] of Object.entries(budgets)) {
            inputValues[k] = new Intl.NumberFormat('id-ID').format(v);
        }
    }

    function handleInput(key, e) {
        const raw = e.target.value.replace(/[^0-9]/g, '');
        inputValues[key] = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function handleSave(e) {
        if (e) e.preventDefault();
        const updated = {};
        for (const [k, vStr] of Object.entries(inputValues)) {
            const num = parseInt((vStr || '').replace(/\./g, ''), 10) || 0;
            updated[k] = num;
        }
        saveBudgets(updated);
        isCategoryBudgetsModalOpen.set(false);
    }

    const budgetFields = [
        { key: 'makan', label: 'Makan & Minum', icon: '🍔' },
        { key: 'belanja', label: 'Belanja & Keperluan', icon: '🛍️' },
        { key: 'transport', label: 'Transportasi & Bensin', icon: '🚗' },
        { key: 'tagihan', label: 'Tagihan & Utilitas', icon: '🏠' },
        { key: 'hiburan', label: 'Hiburan & Hobi', icon: '🎮' },
        { key: 'kesehatan', label: 'Kesehatan & Medis', icon: '💊' }
    ];
</script>

{#if $isCategoryBudgetsModalOpen}
    <div
        class="modal-overlay active"
        on:click={() => isCategoryBudgetsModalOpen.set(false)}
        role="dialog"
        aria-modal="true"
    >
        <div
            class="modal-box"
            style="text-align: left; max-width: 460px; max-height: 88vh; max-height: 88dvh; overflow-y: auto;"
            on:click|stopPropagation
            role="document"
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="font-size: 24px; width: 44px; height: 44px; border-radius: 12px; background: rgba(15, 118, 110, 0.15); display: flex; align-items: center; justify-content: center;">
                        📊
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800;">Atur Batas Anggaran Bulanan</h3>
                        <p style="margin: 0; font-size: 12px; color: var(--text-gray);">
                            Tentukan batas wajar pengeluaran per kategori setiap bulan
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    class="action-btn"
                    style="border-radius: 50%; width: 32px; height: 32px; font-size: 14px;"
                    on:click={() => isCategoryBudgetsModalOpen.set(false)}
                    aria-label="Tutup"
                >
                    ✕
                </button>
            </div>

            <form on:submit={handleSave} style="display: flex; flex-direction: column; gap: 12px; margin-top: 10px;">
                {#each budgetFields as f}
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-dark); display: flex; align-items: center; gap: 6px;">
                            <span>{f.icon}</span>
                            <span>{f.label}</span>
                        </label>
                        <div style="position: relative;">
                            <span style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); font-size: 13px; font-weight: 700; color: var(--text-gray);">Rp</span>
                            <input
                                type="text"
                                inputmode="numeric"
                                value={inputValues[f.key] || ''}
                                on:input={(e) => handleInput(f.key, e)}
                                placeholder="1.000.000"
                                style="padding-left: 42px; font-weight: 700; font-size: 14px; width: 100%; box-sizing: border-box;"
                            >
                        </div>
                    </div>
                {/each}

                <div style="background: var(--list-bg); border-radius: 14px; padding: 12px; font-size: 12px; color: var(--text-gray); line-height: 1.45; margin-top: 4px;">
                    💡 <b>Filosofi Mindful Budgeting:</b> Batas anggaran membantu Anda memantau pengeluaran dengan tenang tanpa rasa bersalah.
                </div>

                <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button
                        type="button"
                        on:click={() => isCategoryBudgetsModalOpen.set(false)}
                        class="btn-danger"
                        style="flex: 1; border-radius: 14px; padding: 12px;"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        style="flex: 1.5; border-radius: 14px; padding: 12px; font-weight: 800;"
                    >
                        Simpan Anggaran ➔
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

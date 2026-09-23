<script>
    import { isCategoryBudgetsModalOpen } from '../stores/uiStore.js';
    import { categoryBudgets, saveBudgets } from '../stores/financeStore.js';

    let makanStr = '';
    let belanjaStr = '';
    let transportStr = '';
    let tagihanStr = '';

    $: if ($isCategoryBudgetsModalOpen) {
        const b = $categoryBudgets;
        makanStr = new Intl.NumberFormat('id-ID').format(b.makan || 1200000);
        belanjaStr = new Intl.NumberFormat('id-ID').format(b.belanja || 800000);
        transportStr = new Intl.NumberFormat('id-ID').format(b.transport || 500000);
        tagihanStr = new Intl.NumberFormat('id-ID').format(b.tagihan || 750000);
    }

    function formatInput(val) {
        const raw = val.replace(/[^0-9]/g, '');
        return raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function handleSave(e) {
        if (e) e.preventDefault();
        const parseVal = str => parseInt(str.replace(/\./g, ''), 10) || 0;
        saveBudgets({
            makan: parseVal(makanStr),
            belanja: parseVal(belanjaStr),
            transport: parseVal(transportStr),
            tagihan: parseVal(tagihanStr)
        });
        isCategoryBudgetsModalOpen.set(false);
    }
</script>

{#if $isCategoryBudgetsModalOpen}
    <div class="modal-overlay active" on:click={() => isCategoryBudgetsModalOpen.set(false)}>
        <div class="modal-box" style="text-align: left; max-width: 420px;" on:click|stopPropagation>
            <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
            <h3>Atur Anggaran Kategori</h3>
            <p>Tentukan batas pengeluaran bulanan per kategori untuk mengontrol keuangan.</p>

            <form on:submit={handleSave} style="gap: 12px; text-align: left;">
                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        🍔 Anggaran Makan (Rp)
                    </label>
                    <input
                        type="text"
                        value={makanStr}
                        on:input={(e) => makanStr = formatInput(e.target.value)}
                        required
                    >
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        🛍️ Anggaran Belanja (Rp)
                    </label>
                    <input
                        type="text"
                        value={belanjaStr}
                        on:input={(e) => belanjaStr = formatInput(e.target.value)}
                        required
                    >
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        🚗 Anggaran Transportasi (Rp)
                    </label>
                    <input
                        type="text"
                        value={transportStr}
                        on:input={(e) => transportStr = formatInput(e.target.value)}
                        required
                    >
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        🏠 Anggaran Tagihan (Rp)
                    </label>
                    <input
                        type="text"
                        value={tagihanStr}
                        on:input={(e) => tagihanStr = formatInput(e.target.value)}
                        required
                    >
                </div>

                <div class="modal-actions" style="margin-top: 8px;">
                    <button
                        type="button"
                        on:click={() => isCategoryBudgetsModalOpen.set(false)}
                        class="btn-danger"
                        style="flex: 1; border-radius: 12px;"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        style="flex: 1; border-radius: 12px;"
                    >
                        Simpan Anggaran
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

<script>
    import { isEditTxModalOpen, editingTx, showToast } from '../stores/uiStore.js';
    import { editTransaction, pocketsList, normalizePocketId } from '../stores/financeStore.js';

    let desc = '';
    let amountStr = '';
    let selectedType = 'expense';
    let selectedPocket = 'cash';
    let withdrawSource = 'tabungan';
    let txId = '';

    $: if ($isEditTxModalOpen && $editingTx) {
        txId = $editingTx.id;
        desc = $editingTx.desc;
        selectedType = $editingTx.type;
        selectedPocket = $editingTx.pocket ? normalizePocketId($editingTx.pocket) : ($editingTx.source && $editingTx.source !== 'pribadi' ? normalizePocketId($editingTx.source) : 'cash');
        withdrawSource = normalizePocketId($editingTx.source || 'tabungan');

        const isGram = ($editingTx.type === 'tring' || $editingTx.type === 'inv_tring' || ($editingTx.type === 'withdraw' && $editingTx.source === 'tring'));
        if (isGram) {
            amountStr = String($editingTx.amount);
        } else {
            amountStr = new Intl.NumberFormat('id-ID').format($editingTx.amount);
        }
    }

    function handleAmountInput(e) {
        const isGram = (selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring'));
        if (isGram) {
            amountStr = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
        } else {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            amountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
        }
    }

    async function handleSave(e) {
        if (e) e.preventDefault();
        const d = desc.trim();
        if (!d) return;

        const isGram = (selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring'));
        const amt = isGram ? parseFloat(amountStr.replace(',', '.')) : parseInt(amountStr.replace(/\./g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Nominal tidak valid', 'warning', '⚠️');
            return;
        }

        await editTransaction(txId, {
            desc: d,
            type: selectedType,
            amount: amt,
            pocket: selectedPocket,
            source: selectedType === 'withdraw' ? withdrawSource : selectedPocket
        });

        isEditTxModalOpen.set(false);
    }
</script>

{#if $isEditTxModalOpen}
    <div class="modal-overlay active" on:click={() => isEditTxModalOpen.set(false)}>
        <div class="modal-box" style="text-align: left; max-width: 420px;" on:click|stopPropagation>
            <div style="font-size: 32px; margin-bottom: 12px;">✏️</div>
            <h3>Edit Transaksi</h3>
            <p>Perbarui keterangan, nominal, tipe, atau kantong transaksi.</p>

            <form on:submit={handleSave} style="gap: 14px;">
                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Keterangan
                    </label>
                    <input
                        type="text"
                        bind:value={desc}
                        placeholder="Contoh: Makan siang, Belanja, Tagihan"
                        required
                        autocomplete="off"
                    >
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Nominal / Gram
                    </label>
                    <input
                        type="text"
                        value={amountStr}
                        on:input={handleAmountInput}
                        placeholder="Misal: 50.000"
                        required
                        autocomplete="off"
                    >
                </div>

                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Tipe Transaksi
                    </label>
                    <select bind:value={selectedType}>
                        <optgroup label="Uang Harian">
                            <option value="expense">Pengeluaran (-)</option>
                            <option value="income">Pemasukan (+)</option>
                        </optgroup>
                        <optgroup label="Ambil Tabungan & Aset">
                            <option value="withdraw">Ambil dari Tabungan / Aset (-)</option>
                        </optgroup>
                        <optgroup label="Tabungan & Aset">
                            <option value="simpanan">Simpanan Wajib (+)</option>
                            <option value="pribadi">Tabungan Pribadi (+)</option>
                            <option value="tring">Emas Tring (+)</option>
                            <option value="jago">Emas Jago (- Kas)</option>
                        </optgroup>
                    </select>
                </div>

                <!-- SELECT KANTONG / WALLET -->
                <div>
                    <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        {selectedType === 'income' ? 'Simpan Ke / Kantong Tujuan' : selectedType === 'expense' ? 'Sumber Dana / Kantong' : 'Kantong Terkait'}
                    </label>
                    <select bind:value={selectedPocket}>
                        {#each $pocketsList as p}
                            <option value={p.id}>
                                {p.icon} {p.fullName || p.name}
                            </option>
                        {/each}
                    </select>
                </div>

                {#if selectedType === 'withdraw'}
                    <div>
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                            Sumber Tabungan
                        </label>
                        <select bind:value={withdrawSource}>
                            {#each $pocketsList as p}
                                <option value={p.id}>{p.icon} {p.fullName || p.name}</option>
                            {/each}
                        </select>
                    </div>
                {/if}

                <div class="modal-actions" style="margin-top: 10px;">
                    <button
                        type="button"
                        on:click={() => isEditTxModalOpen.set(false)}
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

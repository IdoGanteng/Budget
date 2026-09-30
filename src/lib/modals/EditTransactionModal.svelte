<script>
    import { isEditTxModalOpen, editingTx, showToast } from '../stores/uiStore.js';
    import { editTransaction, pocketsList, normalizePocketId } from '../stores/financeStore.js';

    let desc = '';
    let amountStr = '';
    let selectedType = 'expense';
    let selectedCategory = 'makan';
    let selectedPocket = 'cash';
    let withdrawSource = 'tabungan';
    let transferSource = 'cash';
    let txId = '';

    $: if ($isEditTxModalOpen && $editingTx) {
        txId = $editingTx.id;
        desc = $editingTx.desc;
        selectedType = $editingTx.type;
        selectedCategory = $editingTx.category || 'makan';

        if ($editingTx.type === 'transfer') {
            transferSource = normalizePocketId($editingTx.source || 'cash');
            selectedPocket = normalizePocketId($editingTx.category || $editingTx.pocket || 'tabungan');
        } else {
            selectedPocket = $editingTx.pocket ? normalizePocketId($editingTx.pocket) : ($editingTx.source && $editingTx.source !== 'pribadi' ? normalizePocketId($editingTx.source) : 'cash');
            withdrawSource = normalizePocketId($editingTx.source || 'tabungan');
            transferSource = 'cash';
        }

        const isGram = ($editingTx.type === 'tring' || $editingTx.type === 'inv_tring' ||
                       ($editingTx.type === 'withdraw' && $editingTx.source === 'tring') ||
                       ($editingTx.type === 'transfer' && ($editingTx.source === 'tring' || $editingTx.category === 'tring' || $editingTx.pocket === 'tring')));
        if (isGram) {
            amountStr = String($editingTx.amount);
        } else {
            amountStr = new Intl.NumberFormat('id-ID').format($editingTx.amount);
        }
    }

    function checkIsGram() {
        return (selectedType === 'tring' ||
               (selectedType === 'withdraw' && withdrawSource === 'tring') ||
               (selectedType === 'transfer' && (transferSource === 'tring' || selectedPocket === 'tring')));
    }

    function handleAmountInput(e) {
        const isGram = checkIsGram();
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

        const isGram = checkIsGram();
        const amt = isGram ? parseFloat(amountStr.replace(',', '.')) : parseInt(amountStr.replace(/\./g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Nominal tidak valid', 'warning', '⚠️');
            return;
        }

        if (selectedType === 'transfer') {
            if (transferSource === selectedPocket) {
                showToast('Kantong sumber dan tujuan tidak boleh sama!', 'warning', '⚠️');
                return;
            }
            await editTransaction(txId, {
                desc: d,
                type: 'transfer',
                amount: amt,
                source: transferSource,
                pocket: selectedPocket,
                category: selectedPocket
            });
        } else if (selectedType === 'withdraw') {
            if (withdrawSource === selectedPocket) {
                showToast('Sumber dan tujuan penarikan tidak boleh sama!', 'warning', '⚠️');
                return;
            }
            await editTransaction(txId, {
                desc: d,
                type: 'withdraw',
                amount: amt,
                source: withdrawSource,
                pocket: selectedPocket,
                category: selectedCategory
            });
        } else if (selectedType === 'tring') {
            await editTransaction(txId, {
                desc: d,
                type: 'tring',
                amount: amt,
                source: selectedPocket,
                pocket: selectedPocket,
                category: selectedCategory
            });
        } else {
            await editTransaction(txId, {
                desc: d,
                type: selectedType,
                amount: amt,
                pocket: selectedPocket,
                source: selectedPocket,
                category: selectedCategory
            });
        }

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
                        <optgroup label="Pindah Dana & Penarikan">
                            <option value="transfer">⇄ Pindah Antar Kantong (Transfer)</option>
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

                {#if selectedType !== 'transfer'}
                    <div>
                        <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                            Kategori Transaksi
                        </label>
                        <select bind:value={selectedCategory} style="font-size: 14px; font-weight: 600;">
                            <option value="makan">🍔 Makan &amp; Minum</option>
                            <option value="belanja">🛍️ Belanja</option>
                            <option value="transport">🚗 Transportasi</option>
                            <option value="tagihan">🏠 Tagihan &amp; Utilitas</option>
                            <option value="hiburan">🎮 Hiburan &amp; Hobi</option>
                            <option value="kesehatan">💊 Kesehatan</option>
                            <option value="gaji">💼 Gaji / Bisnis</option>
                            <option value="investasi">🪙 Investasi / Emas</option>
                            <option value="lainnya">📦 Lainnya</option>
                        </select>
                    </div>
                {/if}

                {#if selectedType === 'transfer'}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                                Dari Kantong (Sumber)
                            </label>
                            <select bind:value={transferSource} style="font-size: 14px; font-weight: 600;">
                                {#each $pocketsList as p}
                                    <option value={p.id}>{p.icon} {p.fullName || p.name}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                                Ke Kantong (Tujuan)
                            </label>
                            <select bind:value={selectedPocket} style="font-size: 14px; font-weight: 600;">
                                {#each $pocketsList as p}
                                    <option value={p.id}>{p.icon} {p.fullName || p.name}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                {:else if selectedType === 'withdraw'}
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                                Sumber Tabungan
                            </label>
                            <select bind:value={withdrawSource} style="font-size: 14px; font-weight: 600;">
                                {#each $pocketsList as p}
                                    <option value={p.id}>{p.icon} {p.fullName || p.name}</option>
                                {/each}
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                                Masuk Ke Kantong
                            </label>
                            <select bind:value={selectedPocket} style="font-size: 14px; font-weight: 600;">
                                {#each $pocketsList as p}
                                    <option value={p.id}>{p.icon} {p.fullName || p.name}</option>
                                {/each}
                            </select>
                        </div>
                    </div>
                {:else}
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

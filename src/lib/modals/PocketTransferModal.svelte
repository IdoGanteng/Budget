<script>
    import { isTransferModalOpen, closeTransferModal, showToast } from '../stores/uiStore.js';
    import { transferPockets, pocketsList } from '../stores/financeStore.js';

    let fromPocket = 'cash';
    let toPocket = 'tabungan';
    let amountStr = '';
    let customDesc = '';

    $: isGram = (fromPocket === 'tring' || toPocket === 'tring');
    $: labelText = isGram
        ? (fromPocket === 'tring' ? 'Jumlah Gram Emas yang Dijual (Gr)' : 'Jumlah Gram Emas yang Dibeli (Gr)')
        : 'Nominal Transfer (Rp)';

    function handleAmountInput(e) {
        if (isGram) {
            amountStr = e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.');
        } else {
            const raw = e.target.value.replace(/[^0-9]/g, '');
            amountStr = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
        }
    }

    function addQuick(delta) {
        let cur = parseInt(amountStr.replace(/\./g, ''), 10) || 0;
        cur += delta;
        amountStr = new Intl.NumberFormat('id-ID').format(cur);
    }

    async function handleTransferSubmit(e) {
        if (e) e.preventDefault();
        if (fromPocket === toPocket) {
            showToast('Kantong sumber dan tujuan tidak boleh sama!', 'error', '⚠️');
            return;
        }

        const amt = isGram ? parseFloat(amountStr.replace(',', '.')) : parseInt(amountStr.replace(/\./g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Masukkan nominal transfer yang valid!', 'error', '⚠️');
            return;
        }

        await transferPockets(fromPocket, toPocket, amt, customDesc.trim());
        amountStr = '';
        customDesc = '';
        closeTransferModal();
    }
</script>

{#if $isTransferModalOpen}
    <div class="modal-overlay active" on:click={closeTransferModal}>
        <div class="modal-box" style="text-align: left; max-width: 440px;" on:click|stopPropagation>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(255, 122, 0, 0.16); color: #FF7A00; font-size: 20px; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                        ⇄
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800;">Pindah Saldo Antar Kantong</h3>
                        <p style="margin: 0; font-size: 12px; color: var(--text-gray);">Transfer alokasi dana antar kantong pengguna</p>
                    </div>
                </div>
                <button
                    type="button"
                    class="sheet-close-btn"
                    on:click={closeTransferModal}
                    style="background:none; border:none; font-size:18px; color:var(--text-gray); cursor:pointer;"
                >
                    ✕
                </button>
            </div>

            <form on:submit={handleTransferSubmit} style="gap: 14px;">
                <!-- DARI KANTONG -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Dari Kantong (Sumber)
                    </label>
                    <select
                        bind:value={fromPocket}
                        style="background: var(--input-bg); border-color: var(--border-color); color: var(--text-dark); border-radius: 12px; padding: 10px 12px; font-size: 13px; width: 100%;"
                    >
                        {#each $pocketsList as p}
                            <option value={p.id}>{p.icon} {p.name} {p.fullName && p.fullName !== p.name ? `(${p.fullName})` : ''}</option>
                        {/each}
                    </select>
                </div>

                <!-- KE KANTONG -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Ke Kantong (Tujuan)
                    </label>
                    <select
                        bind:value={toPocket}
                        style="background: var(--input-bg); border-color: var(--border-color); color: var(--text-dark); border-radius: 12px; padding: 10px 12px; font-size: 13px; width: 100%;"
                    >
                        {#each $pocketsList as p}
                            <option value={p.id}>{p.icon} {p.name} {p.fullName && p.fullName !== p.name ? `(${p.fullName})` : ''}</option>
                        {/each}
                    </select>
                </div>

                <!-- NOMINAL / JUMLAH -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        {labelText}
                    </label>
                    <input
                        type="text"
                        value={amountStr}
                        on:input={handleAmountInput}
                        placeholder={isGram ? 'Contoh: 0.5' : 'Contoh: 100.000'}
                        autocomplete="off"
                        required
                        style="font-size: 15px; font-weight: 700; padding: 12px 14px; border-radius: 12px;"
                    >
                </div>

                <!-- QUICK NOMINAL CHIPS -->
                {#if !isGram}
                    <div class="quick-amount-row" style="margin-top: -6px;">
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(50000)}>+50rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(100000)}>+100rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(250000)}>+250rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(500000)}>+500rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(1000000)}>+1jt</button>
                    </div>
                {/if}

                <!-- CATATAN / KETERANGAN -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">
                        Keterangan / Catatan
                    </label>
                    <input
                        type="text"
                        bind:value={customDesc}
                        placeholder="Misal: Sisihkan ke tabungan impian"
                        autocomplete="off"
                        style="border-radius: 12px;"
                    >
                </div>

                <div class="modal-actions" style="margin-top: 10px;">
                    <button
                        type="button"
                        on:click={closeTransferModal}
                        class="btn-danger"
                        style="flex: 1; padding: 12px; border-radius: 14px;"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        style="flex: 1.5; padding: 12px; border-radius: 14px; background: linear-gradient(135deg, #FF7A00, #FDB813); border: none; color: white; font-weight: 800;"
                    >
                        Kirim Dana ➔
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

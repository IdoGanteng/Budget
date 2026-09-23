<script>
    import { isAddTxModalOpen, addTxConfig, closeAddTxModal, showToast } from '../stores/uiStore.js';
    import { activeUser, usersList } from '../stores/authStore.js';
    import { addTransaction } from '../stores/financeStore.js';

    let desc = '';
    let amountStr = '';
    let selectedType = 'expense';
    let selectedCategory = 'makan';
    let withdrawSource = 'pribadi';
    let selectedUserId = '';
    let wasOpen = false;

    // Only reset form values on the initial transition from closed to open
    $: if ($isAddTxModalOpen && !wasOpen) {
        wasOpen = true;
        selectedType = $addTxConfig.type || 'expense';
        selectedCategory = $addTxConfig.category || 'makan';
        selectedUserId = $activeUser ? $activeUser.id : 'user_rebel';
        desc = '';
        amountStr = '';
    } else if (!$isAddTxModalOpen) {
        wasOpen = false;
    }

    const categories = [
        { key: 'makan', label: '🍔 Makan' },
        { key: 'transport', label: '🚗 Transport' },
        { key: 'belanja', label: '🛍️ Belanja' },
        { key: 'tagihan', label: '🏠 Tagihan' },
        { key: 'hiburan', label: '🎮 Hiburan' },
        { key: 'kesehatan', label: '💊 Kesehatan' },
        { key: 'gaji', label: '💼 Gaji' },
        { key: 'investasi', label: '🪙 Emas' }
    ];

    function handleAmountInput(e) {
        const isGram = (selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring'));
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

    async function handleSubmit(e) {
        if (e) e.preventDefault();
        const d = desc.trim();
        if (!d) {
            showToast('Keterangan tidak boleh kosong', 'warning', '⚠️');
            return;
        }

        const isGram = (selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring'));
        const amt = isGram ? parseFloat(amountStr.replace(',', '.')) : parseInt(amountStr.replace(/\./g, ''), 10);
        if (!amt || isNaN(amt) || amt <= 0) {
            showToast('Masukkan nominal yang valid', 'warning', '⚠️');
            return;
        }

        const chosenUser = ($usersList && $usersList.find(u => u.id === selectedUserId)) || $activeUser;

        try {
            await addTransaction({
                desc: d,
                type: selectedType,
                amount: amt,
                source: selectedType === 'withdraw' ? withdrawSource : 'pribadi',
                category: selectedCategory,
                userId: chosenUser ? chosenUser.id : 'user_rebel',
                userName: chosenUser ? chosenUser.name : 'Rebel'
            });
            closeAddTxModal();
        } catch (err) {
            console.error('Gagal mencatat transaksi:', err);
            showToast('Gagal mencatat transaksi: ' + (err.message || 'Error'), 'error', '❌');
        }
    }
</script>

{#if $isAddTxModalOpen}
    <div class="modal-overlay active" on:click={closeAddTxModal} style="z-index: 2200;">
        <div
            class="modal-box transaction-modal-box"
            style="text-align: left; max-width: 460px; max-height: 90vh; max-height: 90dvh; overflow-y: auto; -webkit-overflow-scrolling: touch;"
            on:click|stopPropagation
        >
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(255, 122, 0, 0.16); color: #FF7A00; font-size: 20px; width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                        ✍️
                    </div>
                    <div>
                        <h3 style="margin: 0; font-size: 17px; font-weight: 800;">{$addTxConfig.title || 'Catat Transaksi'}</h3>
                        <p style="margin: 0; font-size: 12px; color: var(--text-gray);">Tambah pengeluaran, pemasukan, atau tabungan</p>
                    </div>
                </div>
                <button
                    type="button"
                    class="action-btn"
                    style="border-radius: 50%; width: 34px; height: 34px; font-size: 13px;"
                    on:click={closeAddTxModal}
                    aria-label="Tutup Formulir"
                >
                    ✕
                </button>
            </div>

            <form on:submit={handleSubmit} style="gap: 12px;">
                <!-- SELECTOR PENGGUNA UNTUK TRANSAKSI -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray);">Pengguna:</label>
                    <div class="form-user-chips" style="display: flex; gap: 6px; flex-wrap: wrap;">
                        {#each $usersList as u}
                            <button
                                type="button"
                                class="form-user-btn"
                                class:selected={selectedUserId === u.id}
                                on:click={() => selectedUserId = u.id}
                            >
                                <span class="user-chip-avatar" style="width: 20px; height: 20px; font-size: 11px; background: {u.color || 'var(--primary)'}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                    {u.avatar || '👤'}
                                </span>
                                <span>{u.name}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- SELECTOR KATEGORI CEPAT -->
                <div style="display: flex; flex-direction: column; gap: 6px;">
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray);">Kategori:</label>
                    <div class="category-chips-row">
                        {#each categories as cat}
                            <button
                                type="button"
                                class="cat-btn"
                                class:selected={selectedCategory === cat.key}
                                on:click={() => selectedCategory = cat.key}
                            >
                                {cat.label}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- INPUT KETERANGAN -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 4px;">Keterangan</label>
                    <input
                        type="text"
                        class="tx-input tx-desc-input"
                        bind:value={desc}
                        placeholder="Keterangan (Makan siang, Gaji, dll)"
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="sentences"
                        spellcheck="false"
                        inputmode="text"
                        required
                        style="font-size: 16px; pointer-events: auto !important; user-select: text !important;"
                    >
                </div>

                <!-- INPUT NOMINAL -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 4px;">
                        {selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring') ? 'Jumlah Gram (Gr)' : 'Nominal (Rp)'}
                    </label>
                    <input
                        type="text"
                        inputmode="decimal"
                        class="tx-input tx-amount-input"
                        value={amountStr}
                        on:input={handleAmountInput}
                        placeholder={selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring') ? 'Jml Gram (Misal: 0.5)' : 'Nominal Rupiah (Misal: 100.000)'}
                        autocomplete="off"
                        required
                        style="font-size: 16px; pointer-events: auto !important; user-select: text !important;"
                    >
                </div>

                <!-- TOMBOL QUICK AMOUNTS -->
                {#if selectedType !== 'tring' && !(selectedType === 'withdraw' && withdrawSource === 'tring')}
                    <div class="quick-amount-row" style="display: flex; gap: 6px; flex-wrap: wrap;">
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(20000)}>+20rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(50000)}>+50rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(100000)}>+100rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(500000)}>+500rb</button>
                        <button type="button" class="quick-amt-btn" on:click={() => addQuick(1000000)}>+1jt</button>
                    </div>
                {/if}

                <!-- TIPE TRANSAKSI -->
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 4px;">Jenis Transaksi / Pos</label>
                    <select bind:value={selectedType} style="font-size: 16px;">
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

                {#if selectedType === 'withdraw'}
                    <div>
                        <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 4px;">
                            Sumber Pengambilan
                        </label>
                        <select bind:value={withdrawSource} style="font-size: 16px;">
                            <option value="pribadi">Tabungan Pribadi</option>
                            <option value="simpanan">Simpanan Wajib</option>
                            <option value="tring">Emas Tring</option>
                            <option value="jago">Emas Jago</option>
                        </select>
                    </div>
                {/if}

                <button type="submit" class="btn-primary" style="margin-top: 6px; padding: 14px; font-size: 14px; font-weight: 800;">
                    Simpan Transaksi (Enter ↵)
                </button>
            </form>
        </div>
    </div>
{/if}

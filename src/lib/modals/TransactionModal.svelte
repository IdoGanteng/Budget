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

    $: if ($isAddTxModalOpen) {
        selectedType = $addTxConfig.type || 'expense';
        selectedCategory = $addTxConfig.category || 'makan';
        selectedUserId = $activeUser ? $activeUser.id : 'user_rebel';
        desc = '';
        amountStr = '';
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

        const chosenUser = $usersList.find(u => u.id === selectedUserId) || $activeUser;

        await addTransaction({
            desc: d,
            type: selectedType,
            amount: amt,
            source: selectedType === 'withdraw' ? withdrawSource : 'pribadi',
            category: selectedCategory,
            userId: chosenUser.id,
            userName: chosenUser.name
        });

        closeAddTxModal();
    }
</script>

{#if $isAddTxModalOpen}
    <div class="sheet-backdrop active" on:click={closeAddTxModal}></div>
    <div class="transaction-sheet-wrapper open">
        <div class="sheet-handle" on:click={closeAddTxModal}></div>
        <div class="sheet-header">
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 20px;">✍️</span>
                <h2 class="panel-title" style="margin: 0;">{$addTxConfig.title}</h2>
            </div>
            <button
                type="button"
                class="sheet-close-btn"
                on:click={closeAddTxModal}
                aria-label="Tutup Formulir"
            >
                ✕
            </button>
        </div>

        <form on:submit={handleSubmit}>
            <!-- SELECTOR PENGGUNA UNTUK TRANSAKSI -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
                <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray);">Pengguna:</label>
                <div class="form-user-chips">
                    {#each $usersList as u}
                        <button
                            type="button"
                            class="form-user-btn"
                            class:selected={selectedUserId === u.id}
                            on:click={() => selectedUserId = u.id}
                        >
                            <span class="user-chip-avatar" style="width: 20px; height: 20px; font-size: 11px; background: {u.color || 'var(--primary)'};">
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

            <div class="form-group-field">
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
                    style="pointer-events: auto; user-select: text; -webkit-user-select: text; font-size: 16px; position: relative; z-index: 10;"
                >
            </div>

            <div class="form-group-field">
                <input
                    type="text"
                    inputmode="decimal"
                    class="tx-input tx-amount-input"
                    value={amountStr}
                    on:input={handleAmountInput}
                    placeholder={selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring') ? 'Jml Gram (Misal: 0.5)' : 'Nominal Rupiah (Misal: 100.000)'}
                    autocomplete="off"
                    required
                    style="pointer-events: auto; user-select: text; -webkit-user-select: text; font-size: 16px; position: relative; z-index: 10;"
                >
            </div>

            <!-- TOMBOL QUICK AMOUNTS -->
            {#if selectedType !== 'tring' && !(selectedType === 'withdraw' && withdrawSource === 'tring')}
                <div class="quick-amount-row">
                    <button type="button" class="quick-amt-btn" on:click={() => addQuick(20000)}>+20rb</button>
                    <button type="button" class="quick-amt-btn" on:click={() => addQuick(50000)}>+50rb</button>
                    <button type="button" class="quick-amt-btn" on:click={() => addQuick(100000)}>+100rb</button>
                    <button type="button" class="quick-amt-btn" on:click={() => addQuick(500000)}>+500rb</button>
                    <button type="button" class="quick-amt-btn" on:click={() => addQuick(1000000)}>+1jt</button>
                </div>
            {/if}

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

            {#if selectedType === 'withdraw'}
                <div>
                    <label style="font-size: 11.5px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 4px;">
                        Sumber Pengambilan
                    </label>
                    <select bind:value={withdrawSource}>
                        <option value="pribadi">Tabungan Pribadi</option>
                        <option value="simpanan">Simpanan Wajib</option>
                        <option value="tring">Emas Tring</option>
                        <option value="jago">Emas Jago</option>
                    </select>
                </div>
            {/if}

            <button type="submit" class="btn-primary">
                Simpan Transaksi (Enter ↵)
            </button>
        </form>
    </div>
{/if}

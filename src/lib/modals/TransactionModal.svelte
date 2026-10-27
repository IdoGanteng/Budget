<script>
    import { isAddTxModalOpen, addTxConfig, closeAddTxModal, showToast } from '../stores/uiStore.js';
    import { activeUser, usersList } from '../stores/authStore.js';
    import { addTransaction, pocketsList, goldPricePerGram, formatRp } from '../stores/financeStore.js';

    let desc = '';
    let amountStr = '';
    let selectedType = 'expense';
    let selectedCategory = 'makan';
    let selectedPocket = 'cash';
    let withdrawSource = 'tabungan';
    let selectedUserId = '';
    let wasOpen = false;

    // Only reset form values on the initial transition from closed to open
    $: if ($isAddTxModalOpen && !wasOpen) {
        wasOpen = true;
        selectedType = $addTxConfig.type || 'expense';
        selectedCategory = $addTxConfig.category || (selectedType === 'income' ? 'gaji' : 'makan');
        selectedPocket = $addTxConfig.pocket || 'cash';
        selectedUserId = $activeUser ? $activeUser.id : 'user_rebel';
        desc = $addTxConfig.desc || '';
        amountStr = $addTxConfig.amount ? new Intl.NumberFormat('id-ID').format($addTxConfig.amount) : '';
    } else if (!$isAddTxModalOpen) {
        wasOpen = false;
    }

    const categories = [
        { key: 'makan', label: 'Makan', icon: '🍔' },
        { key: 'transport', label: 'Transport', icon: '🚗' },
        { key: 'belanja', label: 'Belanja', icon: '🛍️' },
        { key: 'tagihan', label: 'Tagihan', icon: '🏠' },
        { key: 'hiburan', label: 'Hiburan', icon: '🎮' },
        { key: 'kesehatan', label: 'Kesehatan', icon: '💊' },
        { key: 'gaji', label: 'Gaji', icon: '💼' },
        { key: 'investasi', label: 'Emas', icon: '🪙' }
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
        const amt = isGram ? parseFloat(amountStr.replace(',', '.')) : parseInt(amountStr.replace(/[^0-9]/g, ''), 10);
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
                pocket: selectedPocket,
                source: selectedType === 'withdraw' ? withdrawSource : selectedPocket,
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

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeAddTxModal();
        }
    }

    $: isGramUnit = selectedType === 'tring' || (selectedType === 'withdraw' && withdrawSource === 'tring');
    $: goldEstRp = isGramUnit && amountStr ? Math.round((parseFloat(amountStr.replace(',', '.')) || 0) * $goldPricePerGram) : 0;
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isAddTxModalOpen) closeAddTxModal(); }} />

{#if $isAddTxModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="tx-modal-overlay fixed inset-0 z-[100] z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        style="z-index: 99999;"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-modal-title"
    >
        <div class="tx-modal-card relative w-full max-w-md bg-slate-900 border border-slate-700/60 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-left" role="document">
            <!-- MOBILE TOP DRAG HANDLE -->
            <div class="tx-mobile-handle"></div>

            <!-- 1. HEADER WITH TITLE (LEFT) & CLOSE BUTTON (RIGHT) -->
            <div class="tx-header flex items-center justify-between w-full">
                <div class="tx-header-title-wrap flex items-center gap-2">
                    <span class="tx-type-dot {selectedType}"></span>
                    <h3 id="add-tx-modal-title" class="tx-title text-base font-bold text-white">
                        {$addTxConfig.title || (selectedType === 'income' ? 'Catat Pemasukan' : 'Catat Pengeluaran')}
                    </h3>
                </div>
                <button
                    type="button"
                    class="tx-close-btn"
                    on:click={closeAddTxModal}
                    aria-label="Tutup Formulir"
                >
                    ✕
                </button>
            </div>

            <form on:submit={handleSubmit} class="tx-form flex flex-col gap-4 w-full">
                <!-- 2. NUMPAD-FIRST CONCEPT: LARGE CENTERED NOMINAL INPUT & QUICK PILLS -->
                <div class="tx-nominal-container flex flex-col items-center justify-center py-1 w-full">
                    <div class="tx-nominal-row flex items-baseline justify-center w-full">
                        <span class="tx-currency-prefix font-mono text-xl font-extrabold text-slate-500 mr-1.5">{isGramUnit ? 'Gr' : 'Rp'}</span>
                        <input
                            id="add-tx-amount-input"
                            type="text"
                            inputmode="decimal"
                            class="tx-nominal-input font-mono text-center text-4xl sm:text-5xl font-extrabold bg-transparent border-0 outline-none text-white tracking-tight"
                            value={amountStr}
                            on:input={handleAmountInput}
                            placeholder="0"
                            autocomplete="off"
                            required
                        />
                    </div>

                    <!-- ESTIMASI NILAI EMAS -->
                    {#if isGramUnit && goldEstRp > 0}
                        <div class="tx-gold-est">
                            <span>🪙 Nilai:</span>
                            <strong class="font-mono">{formatRp(goldEstRp)}</strong>
                        </div>
                    {/if}

                    <!-- QUICK ADD PILLS -->
                    {#if !isGramUnit}
                        <div class="tx-quick-row flex flex-wrap justify-center gap-1.5 mt-3 w-full">
                            <button type="button" class="tx-quick-pill quick-pill-btn" on:click={() => addQuick(20000)}>+20rb</button>
                            <button type="button" class="tx-quick-pill quick-pill-btn" on:click={() => addQuick(50000)}>+50rb</button>
                            <button type="button" class="tx-quick-pill quick-pill-btn" on:click={() => addQuick(100000)}>+100rb</button>
                            <button type="button" class="tx-quick-pill quick-pill-btn" on:click={() => addQuick(500000)}>+500rb</button>
                            <button type="button" class="tx-quick-pill quick-pill-btn" on:click={() => addQuick(1000000)}>+1jt</button>
                        </div>
                    {/if}
                </div>

                <!-- 3. FORM CONTROLS COLUMN (POS, DARI, KATEGORI) -->
                <div class="tx-form-controls flex flex-col gap-2.5 w-full">
                    <!-- POS & DARI SECTION -->
                    <div class="tx-selectors-box">
                        <div class="tx-selectors-row flex items-center justify-between gap-2">
                            <div class="tx-inline-select flex-1">
                                <span class="tx-select-label">Pos:</span>
                                <select
                                    id="add-tx-type"
                                    bind:value={selectedType}
                                    class="tx-native-select"
                                >
                                    <optgroup label="Uang Harian">
                                        <option value="expense">💸 Pengeluaran</option>
                                        <option value="income">💰 Pemasukan</option>
                                    </optgroup>
                                    <optgroup label="Ambil Tabungan & Aset">
                                        <option value="withdraw">🏧 Ambil Tabungan</option>
                                    </optgroup>
                                    <optgroup label="Tabungan & Aset">
                                        <option value="simpanan">🛡️ Simpanan Wajib</option>
                                        <option value="pribadi">💳 Tabungan Pribadi</option>
                                        <option value="tring">🪙 Emas Tring</option>
                                        <option value="jago">🦁 Emas Jago</option>
                                    </optgroup>
                                </select>
                                <span class="tx-select-arrow">▾</span>
                            </div>

                            {#if selectedType === 'withdraw'}
                                <div class="tx-inline-select flex-1">
                                    <span class="tx-select-label">Dari:</span>
                                    <select
                                        id="add-tx-withdraw-src"
                                        bind:value={withdrawSource}
                                        class="tx-native-select"
                                    >
                                        {#each $pocketsList.filter(p => p.id !== 'cash') as p}
                                            <option value={p.id}>{p.icon} {p.name}</option>
                                        {/each}
                                    </select>
                                    <span class="tx-select-arrow">▾</span>
                                </div>
                            {:else}
                                <div class="tx-inline-select flex-1">
                                    <span class="tx-select-label">{selectedType === 'income' ? 'Masuk:' : 'Dari:'}</span>
                                    <select
                                        id="add-tx-pocket"
                                        bind:value={selectedPocket}
                                        class="tx-native-select"
                                    >
                                        {#each $pocketsList as p}
                                            <option value={p.id}>{p.icon} {p.name}</option>
                                        {/each}
                                    </select>
                                    <span class="tx-select-arrow">▾</span>
                                </div>
                            {/if}
                        </div>

                        {#if selectedType === 'withdraw'}
                            <div class="tx-inline-select full-width w-full">
                                <span class="tx-select-label">Masuk ke:</span>
                                <select
                                    id="add-tx-withdraw-target"
                                    bind:value={selectedPocket}
                                    class="tx-native-select"
                                >
                                    {#each $pocketsList as p}
                                        <option value={p.id}>{p.icon} {p.name}</option>
                                    {/each}
                                </select>
                                <span class="tx-select-arrow">▾</span>
                            </div>
                        {/if}
                    </div>

                    <!-- KATEGORI HORIZONTAL SCROLLING -->
                    <div class="tx-categories-scroll-wrapper w-full overflow-hidden">
                        <div class="tx-categories-row no-scrollbar flex items-center gap-2 overflow-x-auto">
                            {#each categories as cat}
                                <button
                                    type="button"
                                    class="tx-cat-pill category-pill-item {selectedCategory === cat.key ? 'selected' : ''}"
                                    on:click={() => selectedCategory = cat.key}
                                >
                                    <span class="cat-icon">{cat.icon}</span>
                                    <span class="cat-label">{cat.label}</span>
                                </button>
                            {/each}
                        </div>
                    </div>
                </div>

                <!-- 5. PENGGUNA SEGMENTED CONTROL -->
                <div class="tx-user-segmented-bar">
                    {#each $usersList as u}
                        <button
                            type="button"
                            class="tx-user-segment-btn {selectedUserId === u.id ? 'active' : ''}"
                            on:click={() => selectedUserId = u.id}
                        >
                            <span class="tx-user-avatar" style="background: {u.color || '#3b82f6'};">
                                {#if u.picture}
                                    <img src={u.picture} alt={u.name} />
                                {:else if u.avatar && u.avatar.includes('<img')}
                                    {@html u.avatar}
                                {:else}
                                    {u.avatar || '👤'}
                                {/if}
                            </span>
                            <span class="tx-user-name">{u.name}</span>
                        </button>
                    {/each}
                </div>

                <!-- 6. FLUSHED KETERANGAN INPUT (LABEL-FREE, SUBTLE UNDERLINE) -->
                <div class="tx-desc-wrapper">
                    <input
                        id="add-tx-desc-input"
                        type="text"
                        class="tx-desc-input"
                        bind:value={desc}
                        placeholder={selectedType === 'income' ? 'Catatan pemasukan (Gaji, Bonus, dsb)...' : selectedType === 'withdraw' ? 'Catatan penarikan saldo...' : 'Catatan pengeluaran (Makan, Kopi, dsb)...'}
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="sentences"
                        spellcheck="false"
                        inputmode="text"
                        required
                    />
                </div>

                <!-- 7. FULL WIDTH ACTION BUTTON -->
                <button
                    type="submit"
                    class="tx-submit-btn {selectedType === 'income' ? 'btn-income' : selectedType === 'withdraw' ? 'btn-withdraw' : 'btn-expense'}"
                >
                    <span>Simpan Transaksi</span>
                    <span class="tx-submit-icon">↵</span>
                </button>
            </form>
        </div>
    </div>
{/if}

<style>
    /* ==========================================================================
       MODAL OVERLAY & Z-INDEX (BULLETPROOF COVERAGE)
       ========================================================================== */
    .tx-modal-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        background: rgba(0, 0, 0, 0.8) !important;
        backdrop-filter: blur(16px) !important;
        -webkit-backdrop-filter: blur(16px) !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        z-index: 99999 !important; /* Stays strictly above mobile bottom bar (1400) */
        padding: 16px !important;
        box-sizing: border-box !important;
        animation: txFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @media (max-width: 640px) {
        .tx-modal-overlay {
            align-items: flex-end !important;
            padding: 0 !important;
        }
    }

    /* ==========================================================================
       MODAL CARD CONTAINER (SOLID SLATE-900, GENEROUS ROUNDING & PADDING)
       ========================================================================== */
    .tx-modal-card {
        background: #0f172a !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        border-top: 1px solid rgba(255, 255, 255, 0.2) !important;
        border-radius: 28px !important;
        padding: 24px !important;
        width: 100% !important;
        max-width: 440px !important;
        box-shadow: 0 25px 60px -10px rgba(0, 0, 0, 0.85), 0 0 30px rgba(37, 99, 235, 0.1) !important;
        max-height: 90vh !important;
        max-height: 90dvh !important;
        overflow-y: auto !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        animation: txScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @media (max-width: 640px) {
        .tx-modal-card {
            max-width: 100% !important;
            border-radius: 28px 28px 0 0 !important;
            border-bottom: none !important;
            padding: 20px 20px calc(24px + env(safe-area-inset-bottom, 16px)) 20px !important;
            max-height: 88vh !important;
            max-height: 88dvh !important;
        }
    }

    .tx-mobile-handle {
        display: none;
    }
    @media (max-width: 640px) {
        .tx-mobile-handle {
            display: block;
            width: 40px;
            height: 4px;
            border-radius: 100px;
            background: rgba(255, 255, 255, 0.2);
            margin: 0 auto 6px auto;
        }
    }

    /* ==========================================================================
       HEADER (LEFT TITLE & RIGHT CLOSE BUTTON)
       ========================================================================== */
    .tx-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
    }
    .tx-header-title-wrap {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
    }
    .tx-type-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: inline-block;
        background: #f43f5e;
        box-shadow: 0 0 8px rgba(244, 63, 94, 0.5);
    }
    .tx-type-dot.income { background: #10b981; box-shadow: 0 0 8px rgba(16, 185, 129, 0.5); }
    .tx-type-dot.withdraw { background: #8b5cf6; box-shadow: 0 0 8px rgba(139, 92, 246, 0.5); }
    .tx-title {
        margin: 0 !important;
        font-size: 15px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        letter-spacing: -0.2px !important;
    }
    .tx-close-btn {
        width: 30px !important;
        height: 30px !important;
        border-radius: 50% !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border: 1px solid rgba(255, 255, 255, 0.1) !important;
        color: #94a3b8 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 13px !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
    }
    .tx-close-btn:hover {
        background: rgba(255, 255, 255, 0.16) !important;
        color: #ffffff !important;
    }

    /* ==========================================================================
       FORM STRUCTURE
       ========================================================================== */
    .tx-form {
        display: flex !important;
        flex-direction: column !important;
        gap: 16px !important;
        width: 100% !important;
    }

    /* ==========================================================================
       NOMINAL SECTION (NUMPAD-FIRST, CENTERED, PROMINENT)
       ========================================================================== */
    .tx-nominal-container {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 4px 0 8px 0 !important;
        width: 100% !important;
    }
    .tx-nominal-row {
        display: flex !important;
        align-items: baseline !important;
        justify-content: center !important;
        width: 100% !important;
    }
    .tx-currency-prefix {
        font-size: 20px !important;
        font-weight: 800 !important;
        color: #64748b !important;
        margin-right: 6px !important;
        user-select: none !important;
    }
    .tx-nominal-input {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        text-align: center !important;
        font-size: 44px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        letter-spacing: -1px !important;
        max-width: 300px !important;
        width: 100% !important;
        caret-color: #3b82f6 !important;
    }
    .tx-nominal-input::placeholder {
        color: #334155 !important;
    }

    .tx-gold-est {
        margin-top: 4px;
        font-size: 11.5px;
        font-weight: 700;
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.12);
        border: 1px solid rgba(245, 158, 11, 0.25);
        padding: 4px 12px;
        border-radius: 100px;
        display: flex;
        align-items: center;
        gap: 6px;
    }

    /* QUICK PILLS */
    .tx-quick-row {
        display: flex !important;
        flex-wrap: wrap !important;
        justify-content: center !important;
        gap: 6px !important;
        margin-top: 12px !important;
        width: 100% !important;
    }
    .tx-quick-pill {
        background: rgba(255, 255, 255, 0.06) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        color: #94a3b8 !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        padding: 5px 12px !important;
        border-radius: 100px !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: inherit !important;
    }
    .tx-quick-pill:hover {
        background: rgba(255, 255, 255, 0.14) !important;
        color: #ffffff !important;
        border-color: rgba(255, 255, 255, 0.2) !important;
        transform: translateY(-1px) !important;
    }
    .tx-quick-pill:active {
        transform: scale(0.96) !important;
    }

    /* ==========================================================================
       CONVERSATIONAL POCKET & TYPE SELECTORS (FLEX COLUMN & ROW)
       ========================================================================== */
    .tx-form-controls {
        display: flex !important;
        flex-direction: column !important;
        gap: 12px !important;
        width: 100% !important;
    }
    .tx-selectors-box {
        background: rgba(30, 41, 59, 0.6) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 18px !important;
        padding: 10px 12px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 8px !important;
    }
    .tx-selectors-row {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 8px !important;
        flex-wrap: wrap !important;
    }
    .tx-inline-select {
        flex: 1 !important;
        min-width: 130px !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        background: rgba(15, 23, 42, 0.8) !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 12px !important;
        padding: 7px 10px !important;
    }
    .tx-inline-select.full-width {
        width: 100% !important;
    }
    .tx-select-label {
        font-size: 11px !important;
        font-weight: 700 !important;
        color: #64748b !important;
        white-space: nowrap !important;
    }
    .tx-native-select {
        background: transparent !important;
        border: none !important;
        outline: none !important;
        color: #ffffff !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        flex: 1 !important;
        appearance: none !important;
        -webkit-appearance: none !important;
        padding-right: 4px !important;
    }
    .tx-native-select option,
    .tx-native-select optgroup {
        background: #0f172a !important;
        color: #ffffff !important;
    }
    .tx-select-arrow {
        color: #64748b !important;
        font-size: 10px !important;
        pointer-events: none !important;
    }

    /* ==========================================================================
       CATEGORY HORIZONTAL SCROLLABLE PILLS (NO SCROLLBAR)
       ========================================================================== */
    .tx-categories-scroll-wrapper {
        width: 100% !important;
        overflow: hidden !important;
    }
    .tx-categories-row {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        overflow-x: auto !important;
        white-space: nowrap !important;
        padding: 2px 0 !important;
        -webkit-overflow-scrolling: touch !important;
    }
    .no-scrollbar::-webkit-scrollbar {
        display: none !important;
    }
    .no-scrollbar {
        -ms-overflow-style: none !important;
        scrollbar-width: none !important;
    }

    .tx-cat-pill {
        display: inline-flex !important;
        align-items: center !important;
        gap: 5px !important;
        padding: 7px 14px !important;
        border-radius: 100px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        background: rgba(255, 255, 255, 0.04) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        color: #94a3b8 !important;
        cursor: pointer !important;
        flex-shrink: 0 !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: inherit !important;
    }
    .tx-cat-pill:hover {
        background: rgba(255, 255, 255, 0.08) !important;
        color: #ffffff !important;
    }
    .tx-cat-pill.selected {
        background: rgba(59, 130, 246, 0.22) !important;
        border-color: rgba(59, 130, 246, 0.5) !important;
        color: #60a5fa !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 10px rgba(37, 99, 235, 0.25) !important;
    }

    /* ==========================================================================
       USER SEGMENTED CONTROL
       ========================================================================== */
    .tx-user-segmented-bar {
        background: rgba(30, 41, 59, 0.5) !important;
        border: 1px solid rgba(255, 255, 255, 0.06) !important;
        border-radius: 16px !important;
        padding: 3px !important;
        display: flex !important;
        align-items: center !important;
        gap: 4px !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }
    .tx-user-segment-btn {
        flex: 1 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 6px !important;
        padding: 6px 10px !important;
        border-radius: 12px !important;
        font-size: 11.5px !important;
        font-weight: 600 !important;
        color: #94a3b8 !important;
        background: transparent !important;
        border: none !important;
        cursor: pointer !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: inherit !important;
        min-width: 0 !important;
    }
    .tx-user-segment-btn:hover {
        color: #ffffff !important;
    }
    .tx-user-segment-btn.active {
        background: rgba(255, 255, 255, 0.12) !important;
        color: #ffffff !important;
        font-weight: 700 !important;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.35) !important;
    }
    .tx-user-avatar {
        width: 18px !important;
        height: 18px !important;
        border-radius: 50% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: 10px !important;
        overflow: hidden !important;
        flex-shrink: 0 !important;
    }
    .tx-user-avatar img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
    }
    .tx-user-name {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
    }

    /* ==========================================================================
       FLUSHED KETERANGAN INPUT
       ========================================================================== */
    .tx-desc-wrapper {
        width: 100% !important;
    }
    .tx-desc-input {
        width: 100% !important;
        box-sizing: border-box !important;
        background: rgba(30, 41, 59, 0.45) !important;
        border: none !important;
        border-bottom: 2px solid rgba(255, 255, 255, 0.1) !important;
        border-radius: 12px 12px 0 0 !important;
        padding: 12px 14px !important;
        font-size: 13.5px !important;
        font-weight: 600 !important;
        color: #ffffff !important;
        outline: none !important;
        transition: all 0.2s ease !important;
        font-family: inherit !important;
    }
    .tx-desc-input:focus {
        background: rgba(30, 41, 59, 0.75) !important;
        border-bottom-color: #3b82f6 !important;
    }
    .tx-desc-input::placeholder {
        color: #64748b !important;
        font-weight: 500 !important;
    }

    /* ==========================================================================
       SUBMIT ACTION BUTTON (FULL WIDTH, SOFT SHADOW, CALL TO ACTION)
       ========================================================================== */
    .tx-submit-btn {
        width: 100% !important;
        padding: 14px 20px !important;
        border-radius: 16px !important;
        border: none !important;
        font-size: 14px !important;
        font-weight: 800 !important;
        color: #ffffff !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 8px !important;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3) !important;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1) !important;
        font-family: inherit !important;
        margin-top: 4px !important;
    }
    .tx-submit-btn:hover {
        transform: translateY(-2px) !important;
        filter: brightness(1.08) !important;
    }
    .tx-submit-btn:active {
        transform: scale(0.98) !important;
    }
    .btn-expense {
        background: linear-gradient(135deg, #2563eb, #3b82f6) !important;
        box-shadow: 0 6px 20px -2px rgba(37, 99, 235, 0.45) !important;
    }
    .btn-income {
        background: linear-gradient(135deg, #059669, #10b981) !important;
        box-shadow: 0 6px 20px -2px rgba(16, 185, 129, 0.45) !important;
    }
    .btn-withdraw {
        background: linear-gradient(135deg, #7c3aed, #8b5cf6) !important;
        box-shadow: 0 6px 20px -2px rgba(139, 92, 246, 0.45) !important;
    }
    .tx-submit-icon {
        font-size: 13px !important;
        opacity: 0.7 !important;
    }

    /* ==========================================================================
       LIGHT THEME ADAPTATION
       ========================================================================== */
    :global([data-theme="light"]) .tx-modal-card {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        border-top-color: #cbd5e1 !important;
        box-shadow: 0 25px 60px -10px rgba(15, 23, 42, 0.2) !important;
    }
    :global([data-theme="light"]) .tx-title { color: #0f172a !important; }
    :global([data-theme="light"]) .tx-close-btn {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
        color: #64748b !important;
    }
    :global([data-theme="light"]) .tx-nominal-input { color: #0f172a !important; }
    :global([data-theme="light"]) .tx-nominal-input::placeholder { color: #cbd5e1 !important; }
    :global([data-theme="light"]) .tx-quick-pill {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
        color: #475569 !important;
    }
    :global([data-theme="light"]) .tx-quick-pill:hover {
        background: #e2e8f0 !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .tx-selectors-box {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .tx-inline-select {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .tx-native-select { color: #0f172a !important; }
    :global([data-theme="light"]) .tx-native-select option,
    :global([data-theme="light"]) .tx-native-select optgroup {
        background: #ffffff !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .tx-cat-pill {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
        color: #64748b !important;
    }
    :global([data-theme="light"]) .tx-cat-pill:hover {
        background: #e2e8f0 !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .tx-cat-pill.selected {
        background: #eff6ff !important;
        border-color: #93c5fd !important;
        color: #2563eb !important;
    }
    :global([data-theme="light"]) .tx-user-segmented-bar {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .tx-user-segment-btn.active {
        background: #ffffff !important;
        color: #0f172a !important;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08) !important;
    }
    :global([data-theme="light"]) .tx-desc-input {
        background: #f8fafc !important;
        border-bottom-color: #cbd5e1 !important;
        color: #0f172a !important;
    }

    /* ANIMATIONS */
    @keyframes txFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    @keyframes txScaleUp {
        from { opacity: 0; transform: scale(0.95) translateY(10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
    }
</style>

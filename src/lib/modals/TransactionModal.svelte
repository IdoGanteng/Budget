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
        desc = '';
        amountStr = '';
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
        class="fixed inset-0 z-[2200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md transition-all duration-300"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-modal-title"
    >
        <div
            class="w-full sm:max-w-[440px] bg-slate-900 border border-white/10 rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl shadow-black/80 max-h-[90vh] max-h-[90dvh] overflow-y-auto no-scrollbar transform transition-all duration-300"
            role="document"
        >
            <!-- TOP SHEET DRAG HANDLE (NATIVE APP FEEL) -->
            <div class="flex justify-center -mt-2 mb-3 sm:hidden">
                <div class="w-10 h-1 bg-white/20 rounded-full"></div>
            </div>

            <!-- COMPACT MINIMALIST HEADER -->
            <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full {selectedType === 'income' ? 'bg-emerald-500 shadow-emerald-500/50 shadow-sm' : selectedType === 'withdraw' ? 'bg-purple-500 shadow-purple-500/50 shadow-sm' : 'bg-rose-500 shadow-rose-500/50 shadow-sm'}"></span>
                    <h3 id="add-tx-modal-title" class="text-sm font-bold tracking-tight text-white">
                        {$addTxConfig.title || (selectedType === 'income' ? 'Catat Pemasukan' : 'Catat Pengeluaran')}
                    </h3>
                </div>
                <button
                    type="button"
                    class="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all text-xs"
                    on:click={closeAddTxModal}
                    aria-label="Tutup Formulir"
                >
                    ✕
                </button>
            </div>

            <form on:submit={handleSubmit} class="flex flex-direction flex-col gap-4">
                <!-- 1. NUMPAD-FIRST CONCEPT: GIANT CENTERED NOMINAL DISPLAY -->
                <div class="flex flex-col items-center justify-center py-2 px-1">
                    <div class="w-full relative flex items-baseline justify-center">
                        <span class="text-lg sm:text-xl font-bold text-slate-400 mr-1.5 select-none font-mono">
                            {isGramUnit ? 'Gr' : 'Rp'}
                        </span>
                        <input
                            id="add-tx-amount-input"
                            type="text"
                            inputmode="decimal"
                            class="w-full max-w-[280px] bg-transparent text-center text-4xl sm:text-5xl font-extrabold text-white tracking-tight outline-none placeholder:text-slate-600 font-mono caret-blue-500"
                            value={amountStr}
                            on:input={handleAmountInput}
                            placeholder="0"
                            autocomplete="off"
                            required
                        />
                    </div>

                    <!-- ESTIMASI NILAI EMAS -->
                    {#if isGramUnit && goldEstRp > 0}
                        <div class="mt-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full flex items-center gap-1.5 animate-fadeIn">
                            <span>🪙 Nilai:</span>
                            <strong class="font-mono">{formatRp(goldEstRp)}</strong>
                        </div>
                    {/if}

                    <!-- QUICK-ADD PILLS (SUBTLE & MINIMAL) -->
                    {#if !isGramUnit}
                        <div class="flex flex-wrap justify-center gap-1.5 mt-3 w-full">
                            <button type="button" class="quick-pill-btn" on:click={() => addQuick(20000)}>+20rb</button>
                            <button type="button" class="quick-pill-btn" on:click={() => addQuick(50000)}>+50rb</button>
                            <button type="button" class="quick-pill-btn" on:click={() => addQuick(100000)}>+100rb</button>
                            <button type="button" class="quick-pill-btn" on:click={() => addQuick(500000)}>+500rb</button>
                            <button type="button" class="quick-pill-btn" on:click={() => addQuick(1000000)}>+1jt</button>
                        </div>
                    {/if}
                </div>

                <!-- 2. CONVERSATIONAL ROUTE & POCKET SELECTOR (COMBINED & CLEAN) -->
                <div class="bg-slate-800/60 border border-white/5 rounded-2xl p-2.5 flex flex-col gap-2">
                    <div class="flex items-center justify-between text-xs font-semibold text-slate-300 flex-wrap gap-2">
                        <!-- JENIS POS SELECTOR -->
                        <div class="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5 flex-1 min-w-[130px]">
                            <span class="text-slate-400 text-[11px]">Pos:</span>
                            <select
                                id="add-tx-type"
                                bind:value={selectedType}
                                class="bg-transparent text-white font-bold text-xs outline-none cursor-pointer flex-1 appearance-none"
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
                            <span class="text-slate-500 text-[10px] pointer-events-none">▾</span>
                        </div>

                        <!-- POCKET SOURCE / TARGET SELECTOR -->
                        {#if selectedType === 'withdraw'}
                            <div class="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5 flex-1 min-w-[130px]">
                                <span class="text-slate-400 text-[11px]">Dari:</span>
                                <select
                                    id="add-tx-withdraw-src"
                                    bind:value={withdrawSource}
                                    class="bg-transparent text-white font-bold text-xs outline-none cursor-pointer flex-1 appearance-none"
                                >
                                    {#each $pocketsList.filter(p => p.id !== 'cash') as p}
                                        <option value={p.id}>{p.icon} {p.name}</option>
                                    {/each}
                                </select>
                                <span class="text-slate-500 text-[10px] pointer-events-none">▾</span>
                            </div>
                        {:else}
                            <div class="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5 flex-1 min-w-[130px]">
                                <span class="text-slate-400 text-[11px]">{selectedType === 'income' ? 'Masuk ke:' : 'Dari:'}</span>
                                <select
                                    id="add-tx-pocket"
                                    bind:value={selectedPocket}
                                    class="bg-transparent text-white font-bold text-xs outline-none cursor-pointer flex-1 appearance-none"
                                >
                                    {#each $pocketsList as p}
                                        <option value={p.id}>{p.icon} {p.name}</option>
                                    {/each}
                                </select>
                                <span class="text-slate-500 text-[10px] pointer-events-none">▾</span>
                            </div>
                        {/if}
                    </div>

                    <!-- IF WITHDRAW: TARGET POCKET ROW -->
                    {#if selectedType === 'withdraw'}
                        <div class="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-xl border border-white/5">
                            <span class="text-slate-400 text-[11px]">Masuk ke:</span>
                            <select
                                id="add-tx-withdraw-target"
                                bind:value={selectedPocket}
                                class="bg-transparent text-white font-bold text-xs outline-none cursor-pointer flex-1 appearance-none"
                            >
                                {#each $pocketsList as p}
                                    <option value={p.id}>{p.icon} {p.name}</option>
                                {/each}
                            </select>
                            <span class="text-slate-500 text-[10px] pointer-events-none">▾</span>
                        </div>
                    {/if}
                </div>

                <!-- 3. HORIZONTALLY SCROLLABLE CATEGORY PILLS (NO SCROLLBAR) -->
                <div class="flex flex-col gap-1.5">
                    <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
                        {#each categories as cat}
                            <button
                                type="button"
                                class="category-pill-item {selectedCategory === cat.key ? 'selected' : ''}"
                                on:click={() => selectedCategory = cat.key}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- 4. PENGGUNA: MINIMALIST SLIDING SEGMENTED CONTROL -->
                <div class="bg-slate-800/50 p-1 rounded-2xl border border-white/5 flex items-center gap-1">
                    {#each $usersList as u}
                        <button
                            type="button"
                            class="user-segmented-pill {selectedUserId === u.id ? 'active' : ''}"
                            on:click={() => selectedUserId = u.id}
                        >
                            <span class="w-4 h-4 rounded-full flex items-center justify-center text-[10px] overflow-hidden flex-shrink-0" style="background: {u.color || '#3b82f6'};">
                                {#if u.picture}
                                    <img src={u.picture} alt={u.name} class="w-full h-full object-cover" />
                                {:else if u.avatar && u.avatar.includes('<img')}
                                    {@html u.avatar}
                                {:else}
                                    {u.avatar || '👤'}
                                {/if}
                            </span>
                            <span class="truncate">{u.name}</span>
                        </button>
                    {/each}
                </div>

                <!-- 5. FLUSHED INPUT KETERANGAN (LABEL-FREE, CLEAN PLACEHOLDER) -->
                <div class="relative">
                    <input
                        id="add-tx-desc-input"
                        type="text"
                        class="w-full bg-slate-800/40 hover:bg-slate-800/60 focus:bg-slate-800/80 border-b-2 border-white/10 focus:border-blue-500 rounded-t-xl px-3.5 py-3 text-sm font-semibold text-white placeholder:text-slate-500 outline-none transition-all duration-200"
                        bind:value={desc}
                        placeholder={selectedType === 'income' ? 'Catatan pemasukan (misal: Gaji, Bonus)...' : selectedType === 'withdraw' ? 'Catatan tarik saldo...' : 'Catatan pengeluaran (misal: Makan siang, Kopi)...'}
                        autocomplete="off"
                        autocorrect="off"
                        autocapitalize="sentences"
                        spellcheck="false"
                        inputmode="text"
                        required
                    />
                </div>

                <!-- 6. SOFT MODERN PRIMARY ACTION BUTTON -->
                <button
                    type="submit"
                    class="w-full mt-1 py-3.5 px-4 rounded-2xl font-bold text-sm text-white shadow-lg transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 {selectedType === 'income' ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30' : selectedType === 'withdraw' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-900/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'}"
                >
                    <span>Simpan Transaksi</span>
                    <span class="text-xs opacity-60">↵</span>
                </button>
            </form>
        </div>
    </div>
{/if}

<style>
    /* UTILITY CLASSES & RESILIENT COMPONENT STYLING */
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    .no-scrollbar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }

    /* QUICK PILL BUTTONS */
    .quick-pill-btn {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.08);
        color: #94a3b8;
        font-size: 11px;
        font-weight: 700;
        padding: 4px 10px;
        border-radius: 9999px;
        cursor: pointer;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
    }
    .quick-pill-btn:hover {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        border-color: rgba(255, 255, 255, 0.2);
        transform: translateY(-1px);
    }
    .quick-pill-btn:active {
        transform: scale(0.96);
    }

    /* CATEGORY PILL ITEMS */
    .category-pill-item {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 12px;
        border-radius: 9999px;
        font-size: 11.5px;
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid transparent;
        color: #94a3b8;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
    }
    .category-pill-item:hover {
        background: rgba(255, 255, 255, 0.08);
        color: #e2e8f0;
    }
    .category-pill-item.selected {
        background: rgba(59, 130, 246, 0.2);
        border-color: rgba(59, 130, 246, 0.4);
        color: #60a5fa;
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
    }

    /* USER SEGMENTED CONTROL */
    .user-segmented-pill {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 12px;
        font-size: 11.5px;
        font-weight: 600;
        color: #94a3b8;
        background: transparent;
        border: none;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        font-family: inherit;
    }
    .user-segmented-pill:hover {
        color: #ffffff;
    }
    .user-segmented-pill.active {
        background: rgba(255, 255, 255, 0.12);
        color: #ffffff;
        font-weight: 700;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    /* LIGHT THEME ADAPTATION */
    :global([data-theme="light"]) .bg-slate-900 {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
        box-shadow: 0 20px 40px -10px rgba(15, 23, 42, 0.15) !important;
    }
    :global([data-theme="light"]) #add-tx-modal-title,
    :global([data-theme="light"]) #add-tx-amount-input {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) #add-tx-amount-input::placeholder {
        color: #cbd5e1 !important;
    }
    :global([data-theme="light"]) .quick-pill-btn {
        background: #f1f5f9 !important;
        border-color: #e2e8f0 !important;
        color: #64748b !important;
    }
    :global([data-theme="light"]) .quick-pill-btn:hover {
        background: #e2e8f0 !important;
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .bg-slate-800\/60,
    :global([data-theme="light"]) .bg-slate-800\/50 {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) .bg-slate-900\/80 {
        background: #ffffff !important;
        border-color: #e2e8f0 !important;
    }
    :global([data-theme="light"]) #add-tx-type,
    :global([data-theme="light"]) #add-tx-pocket,
    :global([data-theme="light"]) #add-tx-withdraw-src,
    :global([data-theme="light"]) #add-tx-withdraw-target {
        color: #0f172a !important;
    }
    :global([data-theme="light"]) .category-pill-item {
        background: #f1f5f9 !important;
        color: #64748b !important;
    }
    :global([data-theme="light"]) .category-pill-item.selected {
        background: #eff6ff !important;
        border-color: #93c5fd !important;
        color: #2563eb !important;
    }
    :global([data-theme="light"]) .user-segmented-pill.active {
        background: #ffffff !important;
        color: #0f172a !important;
        box-shadow: 0 2px 6px rgba(15, 23, 42, 0.08) !important;
    }
    :global([data-theme="light"]) #add-tx-desc-input {
        background: #f8fafc !important;
        border-color: #cbd5e1 !important;
        color: #0f172a !important;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-4px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.2s ease-out;
    }
</style>

<script>
    import { isAddPocketModalOpen, closeAddPocketModal, showToast } from '../stores/uiStore.js';
    import { addCustomPocket, formatRp } from '../stores/financeStore.js';

    let name = '';
    let categoryTag = 'Kantong Impian';
    let target = '';
    let initialBalance = '';
    let selectedIcon = '🎯';
    let selectedColor = '#3b82f6';
    let isSubmitting = false;

    const iconPresets = [
        '🎯', '💰', '💳', '🛡️', '🪙', '🦁', '✈️', '🚗',
        '🏠', '💻', '🎓', '🎁', '🛍️', '💎', '📈', '☕',
        '🎮', '🏥', '🛒', '🌴'
    ];

    const colorPresets = [
        '#3b82f6', '#10b981', '#FF7A00', '#8b5cf6', '#FDB813',
        '#ec4899', '#06b6d4', '#6366f1', '#f43f5e', '#14b8a6'
    ];

    const categoryPresets = [
        { label: 'Kantong Impian', icon: '🎯', desc: 'Target belanja & reward' },
        { label: 'Kantong Nabung', icon: '💰', desc: 'Simpanan & dana darurat' },
        { label: 'Kantong Bayar', icon: '🛒', desc: 'Pengeluaran harian & kas' },
        { label: 'Investasi', icon: '📈', desc: 'Portofolio aset masa depan' },
        { label: 'Kebutuhan Rutin', icon: '⚡', desc: 'Tagihan & operasional bulanan' }
    ];

    function handleInitialInput(e) {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        initialBalance = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function handleTargetInput(e) {
        let raw = e.target.value.replace(/[^0-9]/g, '');
        target = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
    }

    function resetForm() {
        name = '';
        categoryTag = 'Kantong Impian';
        target = '';
        initialBalance = '';
        selectedIcon = '🎯';
        selectedColor = '#3b82f6';
        isSubmitting = false;
    }

    async function handleSubmit(e) {
        if (e) e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            showToast('Harap masukkan nama kantong.', 'warning', '⚠️');
            return;
        }

        isSubmitting = true;
        try {
            const rawInit = initialBalance ? parseFloat(initialBalance.replace(/\./g, '')) : 0;
            const rawTarget = target ? parseFloat(target.replace(/\./g, '')) : 0;

            await addCustomPocket({
                name: trimmed,
                categoryTag,
                initialBalance: rawInit,
                target: rawTarget,
                icon: selectedIcon,
                color: selectedColor
            });

            resetForm();
            closeAddPocketModal();
        } catch (err) {
            console.error(err);
            showToast('Gagal membuat kantong: ' + err.message, 'error', '❌');
        } finally {
            isSubmitting = false;
        }
    }

    function handleBackdropClick(e) {
        if (e.target === e.currentTarget) {
            closeAddPocketModal();
        }
    }
</script>

<svelte:window on:keydown={(e) => { if (e.key === 'Escape' && $isAddPocketModalOpen) closeAddPocketModal(); }} />

{#if $isAddPocketModalOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="modal-overlay active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pocket-modal-title"
    >
        <div class="modal-box" style="text-align: left; max-width: 480px; max-height: 90vh; overflow-y: auto;" role="document">
            <!-- HEADER -->
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div style="background: rgba(59, 130, 246, 0.16); color: #3b82f6; font-size: 22px; width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800;">
                        ＋
                    </div>
                    <div>
                        <h3 id="add-pocket-modal-title" style="margin: 0; font-size: 17px; font-weight: 800; color: #ffffff;">Tambah Kantong Baru</h3>
                        <p style="margin: 0; font-size: 12px; color: #94a3b8;">Buat pos alokasi dana, tabungan, atau target personal</p>
                    </div>
                </div>
                <button
                    type="button"
                    class="sheet-close-btn"
                    on:click={closeAddPocketModal}
                    style="background:none; border:none; font-size:18px; color:#94a3b8; cursor:pointer;"
                    aria-label="Tutup modal"
                >
                    ✕
                </button>
            </div>

            <!-- LIVE PREVIEW CARD -->
            <div style="background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 16px; padding: 14px 16px; margin-bottom: 18px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 44px; height: 44px; border-radius: 14px; background: {selectedColor}22; border: 1.5px solid {selectedColor}; color: {selectedColor}; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0;">
                        {selectedIcon}
                    </div>
                    <div>
                        <span style="font-size: 10.5px; font-weight: 700; color: {selectedColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                            {categoryTag}
                        </span>
                        <div style="font-size: 15px; font-weight: 800; color: #ffffff;">
                            {name.trim() || 'Nama Kantong'}
                        </div>
                        {#if target}
                            <div style="font-size: 11px; color: #94a3b8;">
                                Target: Rp {target}
                            </div>
                        {/if}
                    </div>
                </div>
                <div style="text-align: right;">
                    <span style="font-size: 11px; color: #94a3b8; display: block;">Saldo Awal</span>
                    <strong style="font-size: 14px; color: #ffffff;" class="font-mono">
                        {initialBalance ? 'Rp ' + initialBalance : 'Rp 0'}
                    </strong>
                </div>
            </div>

            <form on:submit={handleSubmit} style="gap: 14px; display: flex; flex-direction: column;">
                <!-- 1. NAMA KANTONG -->
                <div>
                    <label for="new-pocket-name" style="font-size: 12px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 6px;">
                        Nama Kantong <span style="color: #f43f5e;">*</span>
                    </label>
                    <input
                        id="new-pocket-name"
                        type="text"
                        bind:value={name}
                        placeholder="Contoh: Dana Liburan Jepang, Uang Kos, Saham"
                        required
                        maxlength="40"
                        style="width: 100%;"
                    >
                </div>

                <!-- 2. JENIS / KATEGORI KANTONG -->
                <div>
                    <span style="font-size: 12px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 6px;">
                        Jenis / Kategori Kantong
                    </span>
                    <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                        {#each categoryPresets as cat}
                            <button
                                type="button"
                                class="cat-btn"
                                class:selected={categoryTag === cat.label}
                                on:click={() => categoryTag = cat.label}
                                style="font-size: 12px; padding: 6px 12px; border-radius: 9999px; cursor: pointer; transition: all 0.2s;"
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.label}</span>
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- 3. SALDO AWAL & TARGET (2 COLUMNS) -->
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                    <div>
                        <label for="new-pocket-initial-bal" style="font-size: 12px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 6px;">
                            Saldo Awal (Rp)
                        </label>
                        <input
                            id="new-pocket-initial-bal"
                            type="text"
                            bind:value={initialBalance}
                            on:input={handleInitialInput}
                            placeholder="0"
                            style="width: 100%; font-family: monospace;"
                        >
                    </div>
                    <div>
                        <label for="new-pocket-target" style="font-size: 12px; font-weight: 700; color: #94a3b8; display: block; margin-bottom: 6px;">
                            Target Saldo (Rp)
                        </label>
                        <input
                            id="new-pocket-target"
                            type="text"
                            bind:value={target}
                            on:input={handleTargetInput}
                            placeholder="Opsional"
                            style="width: 100%; font-family: monospace;"
                        >
                    </div>
                </div>

                <!-- 4. PILIH IKON / EMOJI -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">
                            Pilih Ikon / Emoji
                        </span>
                        <span style="font-size: 14px;">Terpilih: <b>{selectedIcon}</b></span>
                    </div>
                    <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 6px; background: #0f172a; padding: 8px; border-radius: 12px; border: 1px solid #334155;">
                        {#each iconPresets as icon}
                            <button
                                type="button"
                                on:click={() => selectedIcon = icon}
                                style="font-size: 18px; padding: 6px 0; background: {selectedIcon === icon ? 'rgba(59, 130, 246, 0.25)' : 'transparent'}; border: {selectedIcon === icon ? '1px solid #3b82f6' : '1px solid transparent'}; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s;"
                                title="Pilih {icon}"
                            >
                                {icon}
                            </button>
                        {/each}
                    </div>
                </div>

                <!-- 5. PILIH WARNA -->
                <div>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                        <span style="font-size: 12px; font-weight: 700; color: #94a3b8;">
                            Pilih Warna Kantong
                        </span>
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <span style="width: 14px; height: 14px; border-radius: 50%; background: {selectedColor}; display: inline-block;"></span>
                            <span style="font-size: 11px; font-family: monospace; color: #94a3b8;">{selectedColor}</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                        {#each colorPresets as clr}
                            <button
                                type="button"
                                on:click={() => selectedColor = clr}
                                style="width: 28px; height: 28px; border-radius: 50%; background: {clr}; border: {selectedColor === clr ? '3px solid #ffffff' : '2px solid transparent'}; box-shadow: {selectedColor === clr ? '0 0 10px ' + clr : 'none'}; cursor: pointer; transition: all 0.2s; flex-shrink: 0;"
                                title="Pilih warna {clr}"
                            ></button>
                        {/each}
                        <label style="cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 11.5px; color: #94a3b8; margin-left: 4px;">
                            <input
                                type="color"
                                bind:value={selectedColor}
                                style="width: 28px; height: 28px; padding: 0; border: none; border-radius: 50%; cursor: pointer; background: transparent;"
                                title="Pilih warna kustom"
                            >
                            <span>Kustom</span>
                        </label>
                    </div>
                </div>

                <!-- ACTIONS -->
                <div style="display: flex; gap: 10px; margin-top: 8px;">
                    <button
                        type="button"
                        class="btn-secondary"
                        on:click={closeAddPocketModal}
                        style="flex: 1; padding: 12px; border-radius: 14px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid rgba(255, 255, 255, 0.1); background: #0f172a; color: #94a3b8;"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        class="btn-primary"
                        disabled={isSubmitting}
                        style="flex: 2; padding: 12px; border-radius: 14px; font-size: 13.5px; font-weight: 700; cursor: pointer; background: #2563eb; color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.15);"
                    >
                        {isSubmitting ? 'Menyimpan...' : '💾 Buat Kantong Sekarang'}
                    </button>
                </div>
            </form>
        </div>
    </div>
{/if}

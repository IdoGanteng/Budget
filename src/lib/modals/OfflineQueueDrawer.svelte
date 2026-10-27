<script>
    import { onMount, onDestroy } from 'svelte';
    import { isOfflineDrawerOpen, closeOfflineDrawer, showToast, showConfirmModal } from '../stores/uiStore.js';
    import {
        offlineQueue,
        deleteOfflineQueueItem,
        updateOfflineQueueItem,
        forceSyncOfflineQueue,
        addTestOfflineItem,
        syncStatus,
        getUserSpreadsheetConfig,
        formatRp,
        CATEGORIES,
        pocketsList,
        DEFAULT_POCKETS
    } from '../stores/financeStore.js';

    let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    let isSyncing = false;

    // Inline edit state
    let editingItemId = null;
    let editDesc = '';
    let editAmount = 0;
    let editCategory = 'makan';
    let editPocket = 'cash';

    function handleOnline() {
        isOnline = true;
    }

    function handleOffline() {
        isOnline = false;
    }

    onMount(() => {
        if (typeof window !== 'undefined') {
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }
    });

    onDestroy(() => {
        if (typeof window !== 'undefined') {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        }
    });

    function handleKeydown(e) {
        if (e.key === 'Escape' && $isOfflineDrawerOpen) {
            closeOfflineDrawer();
        }
    }

    function handleBackdropClick(e) {
        if (e.target.classList.contains('queue-drawer-backdrop')) {
            closeOfflineDrawer();
        }
    }

    async function handleForceSync() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            await forceSyncOfflineQueue();
        } finally {
            isSyncing = false;
        }
    }

    function handleDelete(item) {
        showConfirmModal({
            icon: '🗑️',
            title: 'Hapus Antrean?',
            desc: `Hapus transaksi "${item.trx?.desc || 'Transaksi'}" dari antrean offline? Data tidak akan dikirim ke spreadsheet.`,
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            isDanger: true,
            onConfirm: () => {
                deleteOfflineQueueItem(item.id);
            }
        });
    }

    function startEdit(item) {
        editingItemId = item.id;
        editDesc = item.trx?.desc || '';
        editAmount = item.trx?.amount || 0;
        editCategory = item.trx?.category || 'makan';
        editPocket = item.trx?.pocket || 'cash';
    }

    function cancelEdit() {
        editingItemId = null;
    }

    function saveEdit() {
        if (!editDesc.trim()) {
            showToast('Keterangan transaksi tidak boleh kosong', 'warning', '⚠️');
            return;
        }
        if (editAmount <= 0) {
            showToast('Nominal harus lebih dari 0', 'warning', '⚠️');
            return;
        }

        updateOfflineQueueItem(editingItemId, {
            desc: editDesc.trim(),
            amount: Number(editAmount),
            category: editCategory,
            pocket: editPocket
        });

        editingItemId = null;
    }

    $: activePockets = ($pocketsList && $pocketsList.length > 0) ? $pocketsList : DEFAULT_POCKETS;
    $: sheetConfig = getUserSpreadsheetConfig();
    $: totalQueueAmount = ($offlineQueue || []).reduce((sum, item) => sum + (Number(item.trx?.amount) || 0), 0);
</script>

<svelte:window on:keydown={handleKeydown} />

{#if $isOfflineDrawerOpen}
    <!-- BACKDROP -->
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div
        class="queue-drawer-backdrop active"
        on:click={handleBackdropClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby="queue-drawer-title"
    >
        <!-- DRAWER CONTAINER -->
        <div class="queue-drawer-panel" role="document">
            <!-- DRAWER HEADER -->
            <div class="drawer-header">
                <div class="header-main">
                    <div class="header-icon-badge">
                        <span>📡</span>
                    </div>
                    <div class="header-text-group">
                        <div class="header-top-row">
                            <h3 id="queue-drawer-title" class="drawer-title">Offline Queue Inspector</h3>
                            <span class="connection-status-chip {isOnline ? 'online' : 'offline'}">
                                <span class="status-pulse-dot"></span>
                                {isOnline ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <p class="drawer-subtitle">
                            Transparansi data lokal yang menunggu sinkronisasi ke cloud
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    class="drawer-close-btn"
                    on:click={closeOfflineDrawer}
                    aria-label="Tutup Drawer"
                >
                    ✕
                </button>
            </div>

            <!-- STATUS & METRICS STRIP -->
            <div class="queue-metrics-strip">
                <div class="metric-card">
                    <span class="metric-label">Item Mengantre</span>
                    <strong class="metric-val">{$offlineQueue.length} <small>trx</small></strong>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Total Nilai</span>
                    <strong class="metric-val font-mono">{formatRp(totalQueueAmount)}</strong>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Tujuan Sinkron</span>
                    <strong class="metric-val truncate-val" title={sheetConfig.url || 'Default AppScript'}>
                        {sheetConfig.isCustom ? 'Sheets Pribadi' : 'Spreadsheet Cloud'}
                    </strong>
                </div>
            </div>

            <!-- CONTROLS TOOLBAR -->
            <div class="drawer-toolbar">
                <button
                    type="button"
                    class="btn-force-sync"
                    disabled={isSyncing || $offlineQueue.length === 0 || !isOnline}
                    on:click={handleForceSync}
                >
                    {#if isSyncing}
                        <span class="sync-spinner"></span>
                        <span>Mengirim Data...</span>
                    {:else}
                        <span>⚡</span>
                        <span>Paksa Kirim Sekarang</span>
                    {/if}
                </button>

                <button
                    type="button"
                    class="btn-test-item"
                    on:click={addTestOfflineItem}
                    title="Buat item antrean simulasi untuk menguji fitur edit dan hapus"
                >
                    <span>+ Simulasi Uji Coba</span>
                </button>
            </div>

            <!-- MAIN LIST / CONTENT AREA -->
            <div class="drawer-content-scroll">
                {#if $offlineQueue.length === 0}
                    <!-- EMPTY STATE -->
                    <div class="queue-empty-box">
                        <div class="empty-icon-wrap">
                            <span>✨</span>
                        </div>
                        <h4 class="empty-title">Antrean Sinkronisasi Bersih</h4>
                        <p class="empty-desc">
                            Tidak ada data transaksi yang tertunda di IndexedDB atau localStorage. Semua pencatatan telah tersimpan aman di Google Spreadsheet.
                        </p>
                        <button
                            type="button"
                            class="empty-action-btn"
                            on:click={addTestOfflineItem}
                        >
                            🧪 Tambah Item Simulasi Offline
                        </button>
                    </div>
                {:else}
                    <!-- QUEUE ITEMS LIST -->
                    <div class="queue-items-list">
                        {#each $offlineQueue as item, idx (item.id)}
                            {@const cat = CATEGORIES[item.trx?.category] || { name: item.trx?.category || 'Lainnya', icon: '📝', color: '#6366f1' }}
                            {@const pocketObj = activePockets.find(p => p.id === item.trx?.pocket)}
                            {@const isEditing = editingItemId === item.id}

                            <div class="queue-item-card" class:is-editing={isEditing}>
                                {#if isEditing}
                                    <!-- INLINE EDIT FORM -->
                                    <div class="inline-edit-box">
                                        <div class="edit-box-header">
                                            <span class="edit-title">✏️ Ubah Data Antrean #{idx + 1}</span>
                                            <span class="edit-action-badge">{item.action.toUpperCase()}</span>
                                        </div>

                                        <div class="edit-field">
                                            <label for="edit-desc-{item.id}">Keterangan</label>
                                            <input
                                                id="edit-desc-{item.id}"
                                                type="text"
                                                class="edit-input"
                                                bind:value={editDesc}
                                                placeholder="Keterangan transaksi"
                                            />
                                        </div>

                                        <div class="edit-row-2">
                                            <div class="edit-field">
                                                <label for="edit-amt-{item.id}">Nominal (Rp)</label>
                                                <input
                                                    id="edit-amt-{item.id}"
                                                    type="number"
                                                    class="edit-input font-mono"
                                                    bind:value={editAmount}
                                                    min="0"
                                                    step="1000"
                                                />
                                            </div>

                                            <div class="edit-field">
                                                <label for="edit-cat-{item.id}">Kategori</label>
                                                <select id="edit-cat-{item.id}" class="edit-select" bind:value={editCategory}>
                                                    {#each Object.entries(CATEGORIES) as [cKey, cVal]}
                                                        <option value={cKey}>{cVal.icon} {cVal.name}</option>
                                                    {/each}
                                                </select>
                                            </div>
                                        </div>

                                        <div class="edit-field">
                                            <label for="edit-pocket-{item.id}">Kantong Saldo</label>
                                            <select id="edit-pocket-{item.id}" class="edit-select" bind:value={editPocket}>
                                                {#each activePockets as p}
                                                    <option value={p.id}>{p.icon || '👛'} {p.name}</option>
                                                {/each}
                                            </select>
                                        </div>

                                        <div class="edit-btn-rack">
                                            <button type="button" class="btn-save-edit" on:click={saveEdit}>
                                                Simpan Perubahan
                                            </button>
                                            <button type="button" class="btn-cancel-edit" on:click={cancelEdit}>
                                                Batal
                                            </button>
                                        </div>
                                    </div>
                                {:else}
                                    <!-- ITEM VIEW MODE -->
                                    <div class="item-view-layout">
                                        <div class="item-left">
                                            <div class="item-icon-wrap" style="background: {cat.color}20; color: {cat.color};">
                                                <span>{cat.icon}</span>
                                            </div>
                                            <div class="item-meta">
                                                <div class="item-title-row">
                                                    <span class="item-desc">{item.trx?.desc || '(Tanpa Keterangan)'}</span>
                                                    <span class="action-tag {item.action}">
                                                        {item.action === 'add' ? 'TAMBAH' : item.action === 'delete' ? 'HAPUS' : item.action.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div class="item-sub-tags">
                                                    <span class="sub-badge cat-badge">{cat.name}</span>
                                                    <span class="sub-badge pocket-badge">{pocketObj ? pocketObj.name : item.trx?.pocket || 'Kas'}</span>
                                                    <span class="sub-badge time-badge">
                                                        {new Date(item.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div class="item-right">
                                            <div class="item-amount-val font-mono" class:text-expense={item.trx?.type !== 'income'}>
                                                {item.trx?.type === 'income' ? '+' : '-'} {formatRp(item.trx?.amount || 0)}
                                            </div>
                                            <div class="item-actions-rack">
                                                <button
                                                    type="button"
                                                    class="item-act-btn edit"
                                                    on:click={() => startEdit(item)}
                                                    title="Ubah data sebelum dikirim"
                                                >
                                                    ✏️ Ubah
                                                </button>
                                                <button
                                                    type="button"
                                                    class="item-act-btn delete"
                                                    on:click={() => handleDelete(item)}
                                                    title="Hapus dari antrean offline"
                                                >
                                                    🗑️ Hapus
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>

            <!-- DRAWER FOOTER INFO -->
            <div class="drawer-footer-note">
                <span class="footer-icon">💡</span>
                <p>
                    Data di antrean offline ini tersimpan lokal dengan aman. Begitu perangkat Anda terhubung kembali ke jaringan internet, ARK Personal OS akan menyinkronkannya secara otomatis ke Google Spreadsheet Anda.
                </p>
            </div>
        </div>
    </div>
{/if}

<style>
    /* ========================================================= */
    /* OFFLINE QUEUE DRAWER COMPONENT STYLES                     */
    /* ========================================================= */
    .queue-drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.72);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 1500;
        display: flex;
        justify-content: flex-end;
        align-items: stretch;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .queue-drawer-backdrop.active {
        opacity: 1;
        pointer-events: auto;
    }

    /* DESKTOP DRAWER PANEL (Slide from Right) */
    .queue-drawer-panel {
        width: 100%;
        max-width: 480px;
        height: 100%;
        background: var(--card-bg-solid, #131b26);
        border-left: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        box-shadow: -8px 0 32px rgba(0, 0, 0, 0.45);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-sizing: border-box;
        overflow: hidden;
    }
    .queue-drawer-backdrop.active .queue-drawer-panel {
        transform: translateX(0);
    }

    /* HEADER */
    .drawer-header {
        padding: 18px 20px 14px 20px;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        background: var(--card-bg, #182232);
        flex-shrink: 0;
    }
    .header-main {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        min-width: 0;
    }
    .header-icon-badge {
        width: 42px;
        height: 42px;
        border-radius: 12px;
        background: linear-gradient(135deg, rgba(37, 99, 235, 0.2), rgba(99, 102, 241, 0.2));
        border: 1px solid rgba(99, 102, 241, 0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 20px;
        flex-shrink: 0;
    }
    .header-text-group {
        flex: 1;
        min-width: 0;
    }
    .header-top-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }
    .drawer-title {
        font-size: 16px;
        font-weight: 800;
        color: var(--text-white, #ffffff);
        margin: 0;
        letter-spacing: -0.2px;
    }
    .connection-status-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 2px 8px;
        border-radius: 9999px;
        font-size: 11px;
        font-weight: 700;
    }
    .connection-status-chip.online {
        background: rgba(16, 185, 129, 0.15);
        color: #34d399;
        border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .connection-status-chip.offline {
        background: rgba(245, 158, 11, 0.15);
        color: #fbbf24;
        border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .status-pulse-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
    .drawer-subtitle {
        font-size: 11.5px;
        color: var(--text-gray, #94a3b8);
        margin: 2px 0 0 0;
        line-height: 1.3;
    }
    .drawer-close-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        color: var(--text-gray, #94a3b8);
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        transition: all 0.2s ease;
        flex-shrink: 0;
    }
    .drawer-close-btn:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.4);
    }

    /* METRICS STRIP */
    .queue-metrics-strip {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        padding: 12px 18px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
        flex-shrink: 0;
    }
    .metric-card {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 8px 10px;
        background: var(--card-bg, #182232);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
        border-radius: 10px;
    }
    .metric-label {
        font-size: 10.5px;
        color: var(--text-gray, #94a3b8);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
    }
    .metric-val {
        font-size: 13.5px;
        font-weight: 800;
        color: var(--text-white, #ffffff);
    }
    .metric-val small {
        font-size: 10px;
        font-weight: 600;
        color: var(--text-gray, #94a3b8);
    }
    .truncate-val {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 12px;
    }

    /* TOOLBAR */
    .drawer-toolbar {
        padding: 12px 18px;
        display: flex;
        gap: 10px;
        background: var(--card-bg, #182232);
        border-bottom: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
        flex-shrink: 0;
    }
    .btn-force-sync {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: linear-gradient(135deg, #2563eb, #4f46e5);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 10px 14px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3);
    }
    .btn-force-sync:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 18px rgba(37, 99, 235, 0.45);
    }
    .btn-force-sync:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        box-shadow: none;
        background: #334155;
    }
    .sync-spinner {
        width: 14px;
        height: 14px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top-color: #ffffff;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
        to { transform: rotate(360deg); }
    }
    .btn-test-item {
        background: rgba(255, 255, 255, 0.06);
        border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.2));
        color: var(--text-gray, #94a3b8);
        padding: 10px 12px;
        border-radius: 10px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
        white-space: nowrap;
    }
    .btn-test-item:hover {
        background: rgba(255, 255, 255, 0.12);
        color: var(--text-white, #ffffff);
        border-color: rgba(255, 255, 255, 0.4);
    }

    /* SCROLL CONTENT AREA */
    .drawer-content-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    /* EMPTY STATE */
    .queue-empty-box {
        margin: auto 0;
        text-align: center;
        padding: 36px 20px;
        background: var(--card-bg, #182232);
        border: 1px dashed var(--border-color, rgba(255, 255, 255, 0.12));
        border-radius: 16px;
    }
    .empty-icon-wrap {
        width: 56px;
        height: 56px;
        margin: 0 auto 12px auto;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.12);
        color: #10b981;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
    }
    .empty-title {
        font-size: 15px;
        font-weight: 800;
        color: var(--text-white, #ffffff);
        margin: 0 0 6px 0;
    }
    .empty-desc {
        font-size: 12px;
        color: var(--text-gray, #94a3b8);
        line-height: 1.4;
        margin: 0 0 18px 0;
        max-width: 320px;
        margin-left: auto;
        margin-right: auto;
    }
    .empty-action-btn {
        background: rgba(37, 99, 235, 0.15);
        border: 1px solid rgba(37, 99, 235, 0.3);
        color: #60a5fa;
        padding: 8px 16px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .empty-action-btn:hover {
        background: #2563eb;
        color: #ffffff;
    }

    /* QUEUE ITEM CARD */
    .queue-items-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .queue-item-card {
        background: var(--card-bg, #182232);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 14px;
        padding: 12px 14px;
        transition: all 0.2s ease;
    }
    .queue-item-card:hover {
        border-color: rgba(99, 102, 241, 0.3);
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
    }
    .queue-item-card.is-editing {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.04);
    }

    .item-view-layout {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }
    .item-left {
        display: flex;
        align-items: center;
        gap: 10px;
        flex: 1;
        min-width: 0;
    }
    .item-icon-wrap {
        width: 38px;
        height: 38px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        flex-shrink: 0;
    }
    .item-meta {
        flex: 1;
        min-width: 0;
    }
    .item-title-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 3px;
    }
    .item-desc {
        font-size: 13.5px;
        font-weight: 700;
        color: var(--text-white, #ffffff);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
    .action-tag {
        font-size: 9px;
        font-weight: 800;
        padding: 1px 5px;
        border-radius: 4px;
        text-transform: uppercase;
        flex-shrink: 0;
    }
    .action-tag.add {
        background: rgba(16, 185, 129, 0.2);
        color: #34d399;
    }
    .action-tag.delete {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
    }
    .item-sub-tags {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-wrap: wrap;
    }
    .sub-badge {
        font-size: 10.5px;
        color: var(--text-gray, #94a3b8);
        background: rgba(255, 255, 255, 0.04);
        padding: 1px 6px;
        border-radius: 4px;
    }
    .time-badge {
        font-family: monospace;
    }

    .item-right {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 4px;
        flex-shrink: 0;
    }
    .item-amount-val {
        font-size: 13.5px;
        font-weight: 800;
        color: #10b981;
    }
    .item-amount-val.text-expense {
        color: #f87171;
    }
    .item-actions-rack {
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .item-act-btn {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        color: var(--text-gray, #94a3b8);
        padding: 3px 7px;
        border-radius: 6px;
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s ease;
    }
    .item-act-btn.edit:hover {
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        border-color: rgba(245, 158, 11, 0.4);
    }
    .item-act-btn.delete:hover {
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-color: rgba(239, 68, 68, 0.4);
    }

    /* INLINE EDIT FORM */
    .inline-edit-box {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .edit-box-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .edit-title {
        font-size: 12.5px;
        font-weight: 800;
        color: #fbbf24;
    }
    .edit-action-badge {
        font-size: 10px;
        font-weight: 700;
        background: rgba(245, 158, 11, 0.2);
        color: #fbbf24;
        padding: 1px 6px;
        border-radius: 4px;
    }
    .edit-field {
        display: flex;
        flex-direction: column;
        gap: 3px;
    }
    .edit-field label {
        font-size: 10.5px;
        font-weight: 700;
        color: var(--text-gray, #94a3b8);
    }
    .edit-input, .edit-select {
        background: rgba(0, 0, 0, 0.25);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 12.5px;
        color: var(--text-white, #ffffff);
        outline: none;
        box-sizing: border-box;
        width: 100%;
    }
    .edit-input:focus, .edit-select:focus {
        border-color: #2563eb;
    }
    .edit-row-2 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
    }
    .edit-btn-rack {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 4px;
    }
    .btn-save-edit {
        flex: 1;
        background: #10b981;
        color: #ffffff;
        border: none;
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }
    .btn-save-edit:hover {
        background: #059669;
    }
    .btn-cancel-edit {
        background: rgba(255, 255, 255, 0.08);
        color: var(--text-gray, #94a3b8);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        padding: 7px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }

    /* FOOTER NOTE */
    .drawer-footer-note {
        padding: 12px 18px;
        background: rgba(0, 0, 0, 0.25);
        border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
        display: flex;
        align-items: flex-start;
        gap: 8px;
        flex-shrink: 0;
    }
    .footer-icon {
        font-size: 14px;
        flex-shrink: 0;
        margin-top: 2px;
    }
    .drawer-footer-note p {
        font-size: 11px;
        color: var(--text-gray, #94a3b8);
        line-height: 1.4;
        margin: 0;
    }

    /* LIGHT THEME OVERRIDES */
    :global([data-theme="light"]) .queue-drawer-panel {
        background: #ffffff;
        border-left-color: #e2e8f0;
        box-shadow: -8px 0 32px rgba(0, 0, 0, 0.12);
    }
    :global([data-theme="light"]) .drawer-header,
    :global([data-theme="light"]) .drawer-toolbar,
    :global([data-theme="light"]) .queue-item-card,
    :global([data-theme="light"]) .metric-card {
        background: #f8fafc;
        border-color: #e2e8f0;
    }
    :global([data-theme="light"]) .drawer-title,
    :global([data-theme="light"]) .metric-val,
    :global([data-theme="light"]) .item-desc,
    :global([data-theme="light"]) .empty-title,
    :global([data-theme="light"]) .edit-input,
    :global([data-theme="light"]) .edit-select {
        color: #0f172a;
    }
    :global([data-theme="light"]) .edit-input,
    :global([data-theme="light"]) .edit-select {
        background: #ffffff;
        border-color: #cbd5e1;
    }
    :global([data-theme="light"]) .queue-empty-box {
        background: #f8fafc;
        border-color: #cbd5e1;
    }
    :global([data-theme="light"]) .drawer-footer-note,
    :global([data-theme="light"]) .queue-metrics-strip {
        background: #f1f5f9;
        border-color: #e2e8f0;
    }

    /* MOBILE RESPONSIVE DRAWER (< 640px) */
    @media (max-width: 640px) {
        .queue-drawer-backdrop {
            align-items: flex-end;
        }
        .queue-drawer-panel {
            max-width: 100%;
            height: 85vh;
            max-height: 85vh;
            border-left: none;
            border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
            border-radius: 20px 20px 0 0;
            transform: translateY(100%);
            box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.45);
        }
        .queue-drawer-backdrop.active .queue-drawer-panel {
            transform: translateY(0);
        }
        .drawer-header {
            padding: 14px 16px 12px 16px;
        }
        .drawer-title {
            font-size: 15px;
        }
        .queue-metrics-strip {
            padding: 8px 12px;
            gap: 6px;
        }
        .metric-card {
            padding: 6px 8px;
        }
        .drawer-toolbar {
            padding: 10px 14px;
        }
        .drawer-content-scroll {
            padding: 12px 14px;
        }
        .queue-drawer-panel::before {
            content: "";
            display: block;
            width: 36px;
            height: 4px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 4px;
            margin: 8px auto 0 auto;
            flex-shrink: 0;
        }
        :global([data-theme="light"]) .queue-drawer-panel::before {
            background: rgba(0, 0, 0, 0.2);
        }
    }
</style>

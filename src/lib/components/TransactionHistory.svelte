<script>
    import {
        filteredData,
        monthsList,
        selectedMonth,
        selectedUserFilter,
        searchQuery,
        formatRp,
        deleteTransaction,
        exportToCSV,
        clearLocalCache
    } from '../stores/financeStore.js';
    import { usersList } from '../stores/authStore.js';
    import { openEditTxModal, showConfirmModal } from '../stores/uiStore.js';

    $: groupedDates = $filteredData.groupedDates;

    function handleDelete(trx) {
        showConfirmModal({
            icon: '🗑️',
            title: 'Hapus Transaksi',
            desc: `Apakah kamu yakin ingin menghapus catatan transaksi <b>"${trx.desc}"</b>?`,
            confirmText: 'Ya, Hapus',
            isDanger: true,
            onConfirm: () => {
                deleteTransaction(trx.id);
            }
        });
    }

    function handleClearCache() {
        showConfirmModal({
            icon: '⚠️',
            title: 'Bersihkan Cache Lokal',
            desc: 'Tindakan ini hanya membersihkan cache snapshot lokal browser. Data transaksi di Google Spreadsheet tetap aman.',
            confirmText: 'Bersihkan',
            isDanger: true,
            onConfirm: () => {
                clearLocalCache();
            }
        });
    }

    function getTypeMeta(trx) {
        const amt = Number(trx.amount) || 0;
        let tCls = 'text-exp';
        let dAmt = formatRp(amt);
        let typeIcon = '💸';
        let typeBg = 'var(--expense-light)';
        let typeColor = 'var(--expense)';

        if (trx.type === 'income') {
            tCls = 'text-inc';
            dAmt = formatRp(amt);
            typeIcon = '💰';
            typeBg = 'var(--income-light)';
            typeColor = 'var(--income)';
        } else if (trx.type === 'expense') {
            tCls = 'text-exp';
            dAmt = formatRp(amt);
            typeIcon = '💸';
            typeBg = 'var(--expense-light)';
            typeColor = 'var(--expense)';
        } else if (trx.type === 'simpanan') {
            tCls = 'text-inc';
            dAmt = formatRp(amt);
            typeIcon = '🏦';
            typeBg = 'var(--simpanan-light)';
            typeColor = 'var(--simpanan)';
        } else if (trx.type === 'pribadi') {
            tCls = 'text-inc';
            dAmt = formatRp(amt);
            typeIcon = '🎯';
            typeBg = 'var(--pribadi-light)';
            typeColor = 'var(--pribadi)';
        } else if (trx.type === 'tring' || trx.type === 'inv_tring') {
            tCls = 'text-inc';
            dAmt = amt.toFixed(2) + ' Gr';
            typeIcon = '🪙';
            typeBg = 'var(--tring-light)';
            typeColor = 'var(--tring)';
        } else if (trx.type === 'jago' || trx.type === 'inv_jago') {
            tCls = 'text-exp';
            dAmt = formatRp(amt);
            typeIcon = '🦁';
            typeBg = 'var(--jago-light)';
            typeColor = 'var(--jago)';
        } else if (trx.type === 'withdraw') {
            tCls = 'text-inc';
            dAmt = trx.source === 'tring' ? '+' + amt.toFixed(2) + ' Gr' : '+' + formatRp(amt);
            typeIcon = '🏧';
            typeBg = 'var(--pribadi-light)';
            typeColor = 'var(--pribadi)';
        } else if (trx.type === 'transfer') {
            tCls = 'text-primary';
            const isGr = (trx.source === 'tring' || trx.category === 'tring');
            dAmt = isGr ? amt.toFixed(2) + ' Gr' : formatRp(amt);
            typeIcon = '⇄';
            typeBg = 'rgba(255, 122, 0, 0.16)';
            typeColor = '#FF7A00';
        }

        return { tCls, dAmt, typeIcon, typeBg, typeColor };
    }
</script>

<div class="glass-panel section-history" id="section-history" style="padding: 22px;">
    <div class="panel-title" style="margin-bottom: 12px; flex-direction: column; align-items: flex-start; gap: 10px;">
        <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
            <span>Riwayat Transaksi</span>
            <span class="badge" style="font-size: 10px;">Live Data</span>
        </div>

        <!-- SEARCH BAR TRANSAKSI -->
        <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
                type="text"
                bind:value={$searchQuery}
                placeholder="Cari transaksi, makanan, tagihan..."
                autocomplete="off"
            >
            {#if $searchQuery}
                <button
                    type="button"
                    class="clear-search-btn"
                    on:click={() => searchQuery.set('')}
                    title="Hapus pencarian"
                >
                    ✕
                </button>
            {/if}
        </div>

        <!-- DUAL FILTER: BULAN & PENGGUNA -->
        <div style="display: flex; gap: 6px; width: 100%; flex-wrap: wrap;">
            <select
                bind:value={$selectedMonth}
                style="flex: 1; padding: 6px 10px; border-radius: 100px; font-size: 11.5px; border-color: var(--border-color); background: var(--list-bg); min-height: 36px;"
            >
                <option value="all">Semua Bulan</option>
                {#each $monthsList as m}
                    <option value={m}>{m}</option>
                {/each}
            </select>

            <select
                bind:value={$selectedUserFilter}
                style="flex: 1; padding: 6px 10px; border-radius: 100px; font-size: 11.5px; border-color: var(--border-color); background: var(--list-bg); min-height: 36px;"
            >
                <option value="all">Semua Pengguna</option>
                {#each $usersList as u}
                    <option value={u.id}>{u.name}</option>
                {/each}
            </select>
        </div>
    </div>

    <!-- LIST GROUPED BY DATE -->
    <div class="history-container" style="margin-bottom: 14px;">
        {#if groupedDates.length === 0}
            <div style="text-align: center; padding: 24px 12px; color: var(--text-gray); font-size: 13px;">
                Belum ada catatan transaksi pada filter ini.
            </div>
        {:else}
            {#each groupedDates as group}
                <div class="history-date-group">
                    <div class="history-date-header">
                        📅 {group.date}
                    </div>
                    <ul class="history-list">
                        {#each group.items as trx (trx.id)}
                            {@const meta = getTypeMeta(trx)}
                            <li>
                                <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                                    <div style="width: 36px; height: 36px; border-radius: 10px; background: {meta.typeBg}; color: {meta.typeColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                                        {meta.typeIcon}
                                    </div>
                                    <div class="history-item-left">
                                        <strong style="font-size: 13.5px; color: var(--text-dark); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                            {trx.desc}
                                        </strong>
                                        <div style="display: flex; align-items: center; gap: 6px; margin-top: 2px; flex-wrap: wrap;">
                                            <span style="font-size: 11px; color: var(--text-gray); text-transform: capitalize;">
                                                {trx.type}{trx.category ? ` • ${trx.category}` : ''}
                                            </span>
                                            <span class="user-tag-badge">👤 {trx.userName || 'User'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="history-item-right">
                                    <span class="{meta.tCls}" style="font-weight: 800; font-size: 13.5px;">
                                        {meta.dAmt}
                                    </span>
                                    <button
                                        type="button"
                                        on:click={() => openEditTxModal(trx)}
                                        title="Edit"
                                        class="icon-btn edit-btn"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        type="button"
                                        on:click={() => handleDelete(trx)}
                                        title="Hapus"
                                        class="icon-btn delete-btn"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </li>
                        {/each}
                    </ul>
                </div>
            {/each}
        {/if}
    </div>

    <!-- ACTIONS ROW -->
    <div style="display: flex; gap: 8px;">
        <button
            type="button"
            on:click={handleClearCache}
            class="btn-danger"
            style="padding: 10px; border-radius: 12px; font-size: 12px; flex: 1;"
        >
            Bersihkan Cache
        </button>
        <button
            type="button"
            on:click={exportToCSV}
            class="btn-primary"
            style="padding: 10px; border-radius: 12px; font-size: 12px; flex: 1; background: linear-gradient(135deg, var(--income), #059669); border: none; color: white;"
        >
            📥 Export CSV
        </button>
    </div>
</div>

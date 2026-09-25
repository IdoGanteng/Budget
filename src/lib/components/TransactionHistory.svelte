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
        clearLocalCache,
        getPocketMeta
    } from '../stores/financeStore.js';
    import { usersList } from '../stores/authStore.js';
    import { openEditTxModal, showConfirmModal, privacyMode } from '../stores/uiStore.js';

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

    function getTypeMeta(trx, isMasked = false) {
        const amt = Number(trx.amount) || 0;
        let tCls = 'text-exp';
        let dAmt = formatRp(amt, isMasked);
        let typeIcon = '💸';
        let typeBg = 'var(--expense-light)';
        let typeColor = 'var(--expense)';
        let typeLabel = 'Expense';

        if (trx.type === 'income') {
            tCls = 'text-inc';
            dAmt = isMasked ? 'Rp ***.***' : '+ ' + formatRp(amt);
            typeIcon = '💰';
            typeBg = 'var(--income-light)';
            typeColor = 'var(--income)';
            typeLabel = 'Income';
        } else if (trx.type === 'expense') {
            tCls = 'text-exp';
            dAmt = isMasked ? 'Rp ***.***' : '- ' + formatRp(amt);
            typeIcon = '💸';
            typeBg = 'var(--expense-light)';
            typeColor = 'var(--expense)';
            typeLabel = 'Expense';
        } else if (trx.type === 'simpanan') {
            tCls = 'text-inc';
            dAmt = isMasked ? 'Rp ***.***' : '+ ' + formatRp(amt);
            typeIcon = '🛡️';
            typeBg = 'var(--simpanan-light)';
            typeColor = 'var(--simpanan)';
            typeLabel = 'Simpanan';
        } else if (trx.type === 'pribadi') {
            tCls = 'text-inc';
            dAmt = isMasked ? 'Rp ***.***' : '+ ' + formatRp(amt);
            typeIcon = '💳';
            typeBg = 'var(--pribadi-light)';
            typeColor = 'var(--pribadi)';
            typeLabel = 'Tabungan';
        } else if (trx.type === 'tring' || trx.type === 'inv_tring') {
            tCls = 'text-inc';
            dAmt = isMasked ? '*** Gr' : '+ ' + amt.toFixed(2) + ' Gr';
            typeIcon = '🪙';
            typeBg = 'var(--tring-light)';
            typeColor = 'var(--tring)';
            typeLabel = 'Emas Tring';
        } else if (trx.type === 'jago' || trx.type === 'inv_jago') {
            tCls = 'text-exp';
            dAmt = isMasked ? 'Rp ***.***' : '- ' + formatRp(amt);
            typeIcon = '🦁';
            typeBg = 'var(--jago-light)';
            typeColor = 'var(--jago)';
            typeLabel = 'Emas Jago';
        } else if (trx.type === 'withdraw') {
            tCls = 'text-inc';
            if (isMasked) {
                dAmt = trx.source === 'tring' ? '*** Gr' : 'Rp ***.***';
            } else {
                dAmt = trx.source === 'tring' ? '+' + amt.toFixed(2) + ' Gr' : '+' + formatRp(amt);
            }
            typeIcon = '🏧';
            typeBg = 'var(--pribadi-light)';
            typeColor = 'var(--pribadi)';
            typeLabel = 'Tarik Dana';
        } else if (trx.type === 'transfer') {
            tCls = 'text-primary';
            const isGr = (trx.source === 'tring' || trx.category === 'tring');
            if (isMasked) {
                dAmt = isGr ? '*** Gr' : 'Rp ***.***';
            } else {
                dAmt = isGr ? amt.toFixed(2) + ' Gr' : formatRp(amt);
            }
            typeIcon = '⇄';
            typeBg = 'rgba(255, 122, 0, 0.16)';
            typeColor = '#FF7A00';
            typeLabel = 'Pindah';
        }

        return { tCls, dAmt, typeIcon, typeBg, typeColor, typeLabel };
    }

    function getTrxPocket(trx) {
        if (trx.pocket) return trx.pocket;
        if (trx.type === 'simpanan') return 'simpanan';
        if (trx.type === 'pribadi') return 'tabungan';
        if (trx.type === 'tring' || trx.type === 'inv_tring') return 'tring';
        if (trx.type === 'jago' || trx.type === 'inv_jago') return 'jago';
        if (trx.type === 'withdraw') return 'tabungan';
        return (trx.source && trx.source !== 'pribadi') ? trx.source : 'cash';
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
        <div class="history-filters-row">
            <select
                class="history-filter-select"
                bind:value={$selectedMonth}
            >
                <option value="all">Semua Bulan</option>
                {#each $monthsList as m}
                    <option value={m}>{m}</option>
                {/each}
            </select>

            <select
                class="history-filter-select"
                bind:value={$selectedUserFilter}
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
                            {@const meta = getTypeMeta(trx, $privacyMode)}
                            {@const pMeta = getPocketMeta(getTrxPocket(trx))}
                            {@const transferFrom = getPocketMeta(trx.source)}
                            {@const transferTo = getPocketMeta(trx.category || trx.pocket)}
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
                                            {#if trx.type === 'transfer'}
                                                <span style="font-size: 11px; color: var(--text-gray);">
                                                    {meta.typeLabel} •
                                                </span>
                                                <span class="pocket-tag-badge" style="background: {transferFrom.color}18; color: {transferFrom.color}; border: 1px solid {transferFrom.color}33;">
                                                    {transferFrom.icon} {transferFrom.name} ➔ {transferTo.icon} {transferTo.name}
                                                </span>
                                            {:else}
                                                <span style="font-size: 11px; color: var(--text-gray); text-transform: capitalize;">
                                                    {meta.typeLabel}{trx.category ? ` • ${trx.category}` : ''} •
                                                </span>
                                                <span class="pocket-tag-badge" style="background: {pMeta.color}18; color: {pMeta.color}; border: 1px solid {pMeta.color}33;">
                                                    {pMeta.icon} {pMeta.name}
                                                </span>
                                            {/if}
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

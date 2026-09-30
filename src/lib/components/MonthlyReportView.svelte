<script>
    import { onMount } from 'svelte';
    import {
        transactions,
        monthsList,
        selectedMonth,
        selectedUserFilter,
        pocketsList,
        goldPricePerGram,
        formatRp,
        formatGram,
        exportToCSV,
        CATEGORIES,
        getPocketMeta,
        normalizePocketId,
        DEFAULT_POCKETS
    } from '../stores/financeStore.js';
    import { activeUser, usersList } from '../stores/authStore.js';
    import { activeTab, showToast } from '../stores/uiStore.js';

    const INDO_MONTHS = [
        '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
        'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const INDO_MONTHS_SHORT = [
        '', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
        'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
    ];

    // Local filter state for report
    let reportMonth = 'all';
    let reportUserId = 'all';
    let showLedger = true;
    let showSignature = true;
    let showInsights = true;
    let sortBy = 'date_asc'; // 'date_asc' | 'date_desc'

    // Format current date for print header & signature
    const now = new Date();
    const printDateStr = `${now.getDate()} ${INDO_MONTHS[now.getMonth() + 1]} ${now.getFullYear()}`;
    const printTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    // Initialize reportMonth from selectedMonth or first available month
    $: if (reportMonth === 'all' && $monthsList && $monthsList.length > 0) {
        if ($selectedMonth && $selectedMonth !== 'all' && $monthsList.includes($selectedMonth)) {
            reportMonth = $selectedMonth;
        } else {
            reportMonth = $monthsList[0];
        }
    }

    function formatMonthLabel(mKey) {
        if (!mKey || mKey === 'all') return 'Semua Periode';
        const parts = mKey.split('/');
        if (parts.length === 2) {
            const m = parseInt(parts[0], 10);
            const y = parts[1];
            return `${INDO_MONTHS[m] || parts[0]} ${y}`;
        }
        return mKey;
    }

    function parseCleanDate(dateStr) {
        if (!dateStr) return '';
        const s = String(dateStr).trim().split('T')[0];
        if (s.includes('-')) {
            const [y, m, d] = s.split('-');
            return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
        }
        if (s.includes('/')) {
            const parts = s.split('/');
            if (parts.length === 3) {
                if (parts[0].length === 4) {
                    return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
                }
                return `${parts[0].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[2]}`;
            }
        }
        return s;
    }

    function formatDateShort(dateStr) {
        const clean = parseCleanDate(dateStr);
        if (!clean || !clean.includes('/')) return dateStr || '-';
        const [d, m, y] = clean.split('/');
        const mIdx = parseInt(m, 10);
        return `${parseInt(d, 10)} ${INDO_MONTHS_SHORT[mIdx] || m} ${y}`;
    }

    function parseDateToTime(dateStr) {
        const clean = parseCleanDate(dateStr);
        if (clean && clean.includes('/')) {
            const [d, m, y] = clean.split('/').map(Number);
            return new Date(y, m - 1, d).getTime();
        }
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 0 : d.getTime();
    }

    // Reactive calculations for report
    $: goldP = $goldPricePerGram || 1250000;
    $: rawPockets = ($pocketsList && $pocketsList.length > 0 ? $pocketsList : DEFAULT_POCKETS);
    $: activePockets = rawPockets.filter(p => p.id !== 'bca' && p.id !== 'gopay');

    $: reportTransactions = (() => {
        const list = $transactions.filter(trx => {
            const clean = parseCleanDate(trx.date);
            // Month filter
            if (reportMonth !== 'all' && clean) {
                const parts = clean.split('/');
                if (parts.length === 3 && `${parts[1]}/${parts[2]}` !== reportMonth) {
                    return false;
                }
            }
            // User filter
            if (reportUserId !== 'all') {
                const txUId = trx.userId || 'user_rebel';
                if (txUId !== reportUserId) return false;
            }
            return true;
        });

        return list.sort((a, b) => {
            const tA = parseDateToTime(a.date);
            const tB = parseDateToTime(b.date);
            return sortBy === 'date_asc' ? tA - tB : tB - tA;
        });
    })();

    // Financial totals for this report period
    $: reportTotals = (() => {
        let income = 0;
        let expense = 0;
        let transferCount = 0;
        const catMap = {};
        Object.keys(CATEGORIES).forEach(k => { catMap[k] = 0; });

        reportTransactions.forEach(trx => {
            const amt = Number(trx.amount) || 0;
            if (trx.type === 'income') {
                income += amt;
            } else if (trx.type === 'expense' || trx.type === 'jago' || trx.type === 'inv_jago') {
                expense += amt;
                const cat = (trx.category || '').toLowerCase();
                const descLower = (trx.desc || '').toLowerCase();
                if (cat && catMap[cat] !== undefined) {
                    catMap[cat] += amt;
                } else if (descLower.includes('makan') || descLower.includes('kopi') || descLower.includes('cafe')) {
                    catMap.makan += amt;
                } else if (descLower.includes('belanja') || descLower.includes('beli')) {
                    catMap.belanja += amt;
                } else if (descLower.includes('bensin') || descLower.includes('ojek') || descLower.includes('tol')) {
                    catMap.transport += amt;
                } else if (descLower.includes('listrik') || descLower.includes('wifi') || descLower.includes('pulsa')) {
                    catMap.tagihan += amt;
                } else if (descLower.includes('game') || descLower.includes('bioskop') || descLower.includes('nonton')) {
                    catMap.hiburan += amt;
                } else if (descLower.includes('obat') || descLower.includes('dokter') || descLower.includes('klinik')) {
                    catMap.kesehatan += amt;
                } else {
                    catMap.lainnya = (catMap.lainnya || 0) + amt;
                }
            } else if (trx.type === 'transfer' || trx.type === 'withdraw') {
                transferCount++;
            }
        });

        const netCashflow = income - expense;
        const savingsRate = income > 0 ? Math.max(0, ((income - expense) / income) * 100) : 0;
        const isSurplus = income >= expense;

        // Categories sorted by highest expense
        const catList = Object.entries(catMap)
            .filter(([_, val]) => val > 0)
            .map(([key, val]) => {
                const meta = CATEGORIES[key] || { name: key.toUpperCase(), icon: '📦', color: '#64748b' };
                const pct = expense > 0 ? (val / expense) * 100 : 0;
                return { key, ...meta, amount: val, percentage: pct };
            })
            .sort((a, b) => b.amount - a.amount);

        return {
            income,
            expense,
            netCashflow,
            savingsRate,
            isSurplus,
            transferCount,
            txCount: reportTransactions.length,
            categories: catList
        };
    })();

    // Pockets balances summary across overall account
    $: pocketBreakdown = (() => {
        const balances = {};
        activePockets.forEach(p => { balances[normalizePocketId(p.id)] = 0; });
        balances.cash = balances.cash || 0;
        balances.tabungan = balances.tabungan || 0;
        balances.simpanan = balances.simpanan || 0;
        balances.tring = balances.tring || 0;
        balances.jago = balances.jago || 0;

        $transactions.forEach(trx => {
            const amt = Number(trx.amount) || 0;
            const hasExplicitPocket = Boolean(trx.pocket && String(trx.pocket).trim() !== '');

            if (trx.type === 'income') {
                const target = hasExplicitPocket ? normalizePocketId(trx.pocket) : 'cash';
                balances[target] = (balances[target] || 0) + amt;
            } else if (trx.type === 'expense') {
                const source = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.source && trx.source !== 'pribadi' ? normalizePocketId(trx.source) : 'cash');
                balances[source] = (balances[source] || 0) - amt;
            } else if (trx.type === 'simpanan') {
                balances.simpanan = (balances.simpanan || 0) + amt;
                const src = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.source === 'cash' ? 'cash' : null);
                if (src && src !== 'simpanan') balances[src] = (balances[src] || 0) - amt;
            } else if (trx.type === 'pribadi') {
                balances.tabungan = (balances.tabungan || 0) + amt;
                const src = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.source === 'cash' ? 'cash' : null);
                if (src && src !== 'tabungan') balances[src] = (balances[src] || 0) - amt;
            } else if (trx.type === 'tring' || trx.type === 'inv_tring') {
                balances.tring = (balances.tring || 0) + amt;
                const src = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.source === 'cash' ? 'cash' : null);
                if (src && src !== 'tring') balances[src] = (balances[src] || 0) - (amt * goldP);
            } else if (trx.type === 'jago' || trx.type === 'inv_jago') {
                balances.jago = (balances.jago || 0) + amt;
                const src = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.source === 'cash' ? 'cash' : null);
                if (src && src !== 'jago') balances[src] = (balances[src] || 0) - amt;
            } else if (trx.type === 'withdraw') {
                const src = normalizePocketId(trx.source || 'tabungan');
                const to = hasExplicitPocket ? normalizePocketId(trx.pocket) : (trx.target ? normalizePocketId(trx.target) : 'cash');
                if (src === 'tring') {
                    balances.tring = (balances.tring || 0) - amt;
                    balances[to] = (balances[to] || 0) + (amt * goldP);
                } else {
                    balances[src] = (balances[src] || 0) - amt;
                    balances[to] = (balances[to] || 0) + amt;
                }
            } else if (trx.type === 'transfer') {
                const from = normalizePocketId(trx.source || trx.pocket || 'cash');
                const to = normalizePocketId(trx.category || trx.target || 'tabungan');
                if (from === 'tring') {
                    balances.tring = (balances.tring || 0) - amt;
                    balances[to] = (balances[to] || 0) + (amt * goldP);
                } else if (to === 'tring') {
                    balances[from] = (balances[from] || 0) - (amt * goldP);
                    balances.tring = (balances.tring || 0) + amt;
                } else {
                    balances[from] = (balances[from] || 0) - amt;
                    balances[to] = (balances[to] || 0) + amt;
                }
            }
        });

        let totalWealth = 0;
        const list = activePockets.map(p => {
            const normId = normalizePocketId(p.id);
            const isGram = p.isGram || normId === 'tring';
            const rawBal = balances[normId] || 0;
            const amountRp = isGram ? rawBal * goldP : rawBal;
            totalWealth += amountRp;
            return {
                ...p,
                rawBal,
                amountRp,
                isGram
            };
        });

        const safeTotal = totalWealth > 0 ? totalWealth : 1;
        return {
            totalWealth,
            pockets: list.map(p => ({
                ...p,
                share: Math.max(0, Math.min(100, (p.amountRp / safeTotal) * 100))
            }))
        };
    })();

    function handlePrint() {
        window.print();
    }

    function getTransactionTypeLabel(trx) {
        if (trx.type === 'income') return { label: 'Pemasukan', badge: 'inc', sign: '+' };
        if (trx.type === 'expense') return { label: 'Pengeluaran', badge: 'exp', sign: '-' };
        if (trx.type === 'simpanan') return { label: 'Simpanan', badge: 'sim', sign: '+' };
        if (trx.type === 'pribadi') return { label: 'Tabungan', badge: 'tab', sign: '+' };
        if (trx.type === 'tring') return { label: 'Emas Tring', badge: 'trg', sign: '+' };
        if (trx.type === 'jago') return { label: 'Emas Jago', badge: 'jag', sign: '-' };
        if (trx.type === 'transfer') return { label: 'Transfer', badge: 'trf', sign: '⇄' };
        if (trx.type === 'withdraw') return { label: 'Tarik Dana', badge: 'wdr', sign: '±' };
        return { label: trx.type || 'Lainnya', badge: 'def', sign: '' };
    }
</script>

<div class="report-view-container">
    <!-- ON-SCREEN CONTROL TOOLBAR (HIDDEN DURING PRINT) -->
    <div class="report-toolbar no-print">
        <div class="toolbar-left">
            <button
                type="button"
                class="btn-back"
                on:click={() => activeTab.set('home')}
                title="Kembali ke Beranda"
            >
                ← Kembali
            </button>
            <div class="toolbar-title">
                <span class="icon">📑</span>
                <div>
                    <h1>Laporan Keuangan Bulanan</h1>
                    <p>Format Cetak &amp; PDF Standar Ukuran Kertas A4</p>
                </div>
            </div>
        </div>

        <div class="toolbar-controls">
            <!-- MONTH PICKER -->
            <div class="control-group">
                <label for="report-month-select">Periode Bulan:</label>
                <select id="report-month-select" bind:value={reportMonth}>
                    <option value="all">Semua Periode</option>
                    {#each $monthsList as m}
                        <option value={m}>{formatMonthLabel(m)}</option>
                    {/each}
                </select>
            </div>

            <!-- USER FILTER -->
            <div class="control-group">
                <label for="report-user-select">Pengguna:</label>
                <select id="report-user-select" bind:value={reportUserId}>
                    <option value="all">Semua Pengguna</option>
                    {#each $usersList as u}
                        <option value={u.id}>{u.name}</option>
                    {/each}
                </select>
            </div>

            <!-- SORT ORDER -->
            <div class="control-group">
                <label for="report-sort-select">Urutan:</label>
                <select id="report-sort-select" bind:value={sortBy}>
                    <option value="date_asc">Tanggal (Lama → Baru)</option>
                    <option value="date_desc">Tanggal (Baru → Lama)</option>
                </select>
            </div>

            <!-- VIEW TOGGLES -->
            <div class="control-checkboxes">
                <label class="checkbox-pill">
                    <input type="checkbox" bind:checked={showLedger}>
                    <span>Buku Besar</span>
                </label>
                <label class="checkbox-pill">
                    <input type="checkbox" bind:checked={showInsights}>
                    <span>Analisa</span>
                </label>
                <label class="checkbox-pill">
                    <input type="checkbox" bind:checked={showSignature}>
                    <span>Tanda Tangan</span>
                </label>
            </div>

            <!-- ACTION BUTTONS -->
            <div class="toolbar-actions">
                <button
                    type="button"
                    class="btn-print"
                    on:click={handlePrint}
                    title="Cetak Dokumen atau Simpan sebagai PDF Ukuran A4"
                >
                    <span class="btn-icon">🖨️</span>
                    <span>Cetak / PDF (A4)</span>
                </button>
                <button
                    type="button"
                    class="btn-csv"
                    on:click={exportToCSV}
                    title="Download Data sebagai file CSV / Excel"
                >
                    <span class="btn-icon">📥</span>
                    <span>CSV</span>
                </button>
            </div>
        </div>
    </div>

    <!-- PRINT HELPER NOTICE (ON-SCREEN ONLY) -->
    <div class="print-instruction-banner no-print">
        <span>💡 <strong>Tips Cetak / PDF:</strong> Klik tombol <strong>Cetak / PDF (A4)</strong> di atas. Di jendela print browser, pilih <em>"Destination: Save as PDF"</em> dan <em>"Paper Size: A4"</em> untuk menyimpan file PDF berkualitas tinggi.</span>
    </div>

    <!-- ======================================================== -->
    <!-- A4 REPORT DOCUMENT CONTAINER (RENDERED AS A4 PAGE SHEET) -->
    <!-- ======================================================== -->
    <div class="report-paper-wrapper">
        <article class="a4-document">
            <!-- 1. KOP SURAT / DOKUMEN LAPORAN -->
            <header class="doc-header">
                <div class="doc-brand">
                    <div class="brand-badge">ARK</div>
                    <div class="brand-text">
                        <div class="brand-name">PERSONAL OS</div>
                        <div class="brand-tagline">Sistem Manajemen &amp; Arus Kas Finansial Pribadi</div>
                    </div>
                </div>

                <div class="doc-title-block">
                    <h2 class="doc-title">LAPORAN KEUANGAN BULANAN</h2>
                    <div class="doc-period-pill">
                        Periode: <strong>{formatMonthLabel(reportMonth)}</strong>
                    </div>
                </div>

                <div class="doc-meta-grid">
                    <div class="meta-item">
                        <span class="meta-label">PENGGUNA / ENTITAS</span>
                        <span class="meta-value">
                            {#if reportUserId === 'all'}
                                Semua Pengguna ({$activeUser ? $activeUser.name : 'Utama'})
                            {:else}
                                {($usersList.find(u => u.id === reportUserId) || {}).name || 'Pengguna'}
                            {/if}
                        </span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">TANGGAL CETAK</span>
                        <span class="meta-value">{printDateStr}, {printTimeStr}</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">MATA UANG</span>
                        <span class="meta-value">IDR (Rupiah) &amp; Gram (Emas)</span>
                    </div>
                    <div class="meta-item">
                        <span class="meta-label">STATUS DOKUMEN</span>
                        <span class="meta-value status-verified">✓ Terverifikasi Sistem</span>
                    </div>
                </div>
            </header>

            <div class="doc-divider"></div>

            <!-- 2. RINGKASAN EKSEKUTIF / SCORECARD HIGHLIGHTS -->
            <section class="doc-section">
                <h3 class="section-title">
                    <span class="section-num">1</span>
                    <span>Ringkasan Eksekutif Arus Kas</span>
                </h3>

                <div class="summary-cards-grid">
                    <!-- PEMASUKAN -->
                    <div class="summary-card card-income">
                        <div class="card-head">
                            <span class="card-icon">📈</span>
                            <span class="card-label">TOTAL PEMASUKAN</span>
                        </div>
                        <div class="card-amount">{formatRp(reportTotals.income)}</div>
                        <div class="card-sub">{reportTransactions.filter(t => t.type === 'income').length} transaksi masuk</div>
                    </div>

                    <!-- PENGELUARAN -->
                    <div class="summary-card card-expense">
                        <div class="card-head">
                            <span class="card-icon">📉</span>
                            <span class="card-label">TOTAL PENGELUARAN</span>
                        </div>
                        <div class="card-amount">{formatRp(reportTotals.expense)}</div>
                        <div class="card-sub">{reportTransactions.filter(t => t.type === 'expense' || t.type === 'jago').length} transaksi keluar</div>
                    </div>

                    <!-- ARUS KAS BERSIH -->
                    <div class="summary-card {reportTotals.isSurplus ? 'card-surplus' : 'card-deficit'}">
                        <div class="card-head">
                            <span class="card-icon">{reportTotals.isSurplus ? '🟢' : '🔴'}</span>
                            <span class="card-label">ARUS KAS BERSIH (NET)</span>
                        </div>
                        <div class="card-amount">
                            {reportTotals.netCashflow >= 0 ? '+' : ''}{formatRp(reportTotals.netCashflow)}
                        </div>
                        <div class="card-sub">
                            Status: <strong>{reportTotals.isSurplus ? 'SURPLUS (Sehat)' : 'DEFISIT (Evaluasi)'}</strong>
                        </div>
                    </div>

                    <!-- RASIO TABUNGAN -->
                    <div class="summary-card card-savings">
                        <div class="card-head">
                            <span class="card-icon">🎯</span>
                            <span class="card-label">RASIO TABUNGAN</span>
                        </div>
                        <div class="card-amount">{reportTotals.savingsRate.toFixed(1)}%</div>
                        <div class="card-sub">Dari total pendapatan masuk</div>
                    </div>
                </div>
            </section>

            <!-- 3. DISTRIBUSI PENGELUARAN PER KATEGORI -->
            <section class="doc-section avoid-break">
                <h3 class="section-title">
                    <span class="section-num">2</span>
                    <span>Rincian Pengeluaran per Kategori</span>
                </h3>

                {#if reportTotals.categories.length === 0}
                    <div class="empty-notice">Tidak ada transaksi pengeluaran pada periode ini.</div>
                {:else}
                    <div class="table-container">
                        <table class="doc-table">
                            <thead>
                                <tr>
                                    <th style="width: 50px;">No</th>
                                    <th>Kategori Pos Pengeluaran</th>
                                    <th class="text-right" style="width: 170px;">Jumlah Pengeluaran</th>
                                    <th class="text-right" style="width: 100px;">Porsi (%)</th>
                                    <th style="width: 180px;">Proporsi Visual</th>
                                </tr>
                            </thead>
                            <tbody>
                                {#each reportTotals.categories as cat, idx}
                                    <tr>
                                        <td class="text-center">{idx + 1}</td>
                                        <td>
                                            <span class="table-cat-icon">{cat.icon}</span>
                                            <strong>{cat.name}</strong>
                                        </td>
                                        <td class="text-right font-mono font-bold text-exp">
                                            {formatRp(cat.amount)}
                                        </td>
                                        <td class="text-right font-mono">
                                            {cat.percentage.toFixed(1)}%
                                        </td>
                                        <td>
                                            <div class="table-progress-track">
                                                <div
                                                    class="table-progress-fill"
                                                    style="width: {cat.percentage}%; background-color: {cat.color || '#f43f5e'};"
                                                ></div>
                                            </div>
                                        </td>
                                    </tr>
                                {/each}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <th colspan="2" class="text-right">TOTAL PENGELUARAN</th>
                                    <th class="text-right font-mono text-exp font-bold">{formatRp(reportTotals.expense)}</th>
                                    <th class="text-right font-mono">100.0%</th>
                                    <th></th>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                {/if}
            </section>

            <!-- 4. ALOKASI SALDO PORTOFOLIO & KANTONG -->
            <section class="doc-section avoid-break">
                <h3 class="section-title">
                    <span class="section-num">3</span>
                    <span>Posisi Saldo &amp; Portofolio Kekayaan</span>
                </h3>

                <div class="table-container">
                    <table class="doc-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">No</th>
                                <th>Kantong Penyimpanan</th>
                                <th>Peran Alokasi</th>
                                <th class="text-right" style="width: 170px;">Saldo / Nilai Aset</th>
                                <th class="text-right" style="width: 100px;">Porsi (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each pocketBreakdown.pockets as p, idx}
                                <tr>
                                    <td class="text-center">{idx + 1}</td>
                                    <td>
                                        <span class="table-cat-icon">{p.icon}</span>
                                        <strong>{p.name}</strong>
                                        {#if p.isGram}
                                            <span class="badge-sub">{formatGram(p.rawBal)}</span>
                                        {/if}
                                    </td>
                                    <td class="text-muted">{p.categoryTag || p.role || '-'}</td>
                                    <td class="text-right font-mono font-bold">
                                        {formatRp(p.amountRp)}
                                    </td>
                                    <td class="text-right font-mono">
                                        {p.share.toFixed(1)}%
                                    </td>
                                </tr>
                            {/each}
                        </tbody>
                        <tfoot>
                            <tr>
                                <th colspan="3" class="text-right">TOTAL ESTIMASI KEKAYAAN BERSIH</th>
                                <th class="text-right font-mono text-primary font-bold">{formatRp(pocketBreakdown.totalWealth)}</th>
                                <th class="text-right font-mono">100.0%</th>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </section>

            <!-- 5. ANALISA KEUANGAN & EVALUASI STRATEGIS -->
            {#if showInsights}
                <section class="doc-section avoid-break">
                    <h3 class="section-title">
                        <span class="section-num">4</span>
                        <span>Evaluasi &amp; Catatan Finansial</span>
                    </h3>

                    <div class="eval-box">
                        <div class="eval-row">
                            <span class="eval-label">Kondisi Finansial Periode Ini:</span>
                            <span class="eval-val">
                                {#if reportTotals.income === 0 && reportTotals.expense === 0}
                                    Belum ada aktivitas transaksi yang tercatat.
                                {:else if reportTotals.isSurplus}
                                    <strong style="color: #059669;">🟢 SURPLUS SEHAT ({formatRp(reportTotals.netCashflow)})</strong> — Pemasukan lebih tinggi daripada konsumsi.
                                {:else}
                                    <strong style="color: #e11d48;">🔴 DEFISIT ANGGARAN ({formatRp(Math.abs(reportTotals.netCashflow))})</strong> — Pengeluaran melampaui pemasukan bulanan.
                                {/if}
                            </span>
                        </div>

                        <div class="eval-row">
                            <span class="eval-label">Rekomendasi Strategis:</span>
                            <span class="eval-val">
                                {#if reportTotals.isSurplus}
                                    Kedisiplinan anggaran terjaga dengan rasio sisa {reportTotals.savingsRate.toFixed(1)}%. Sangat disarankan menyisihkan surplus ini langsung ke Kantong Simpanan Darurat atau aset Lindung Nilai (Emas Tring/Jago).
                                {:else}
                                    Disarankan melakukan audit pada kategori belanja terbesar (misal: {reportTotals.categories[0]?.name || 'kategori utama'}) dan menekan pengeluaran konsumtif non-esensial untuk memulihkan arus kas positif.
                                {/if}
                            </span>
                        </div>
                    </div>
                </section>
            {/if}

            <!-- 6. BUKU BESAR DETAIL TRANSAKSI BULAN INI -->
            {#if showLedger}
                <section class="doc-section">
                    <div class="section-head-with-badge">
                        <h3 class="section-title">
                            <span class="section-num">{showInsights ? '5' : '4'}</span>
                            <span>Buku Besar Transaksi Bulanan</span>
                        </h3>
                        <span class="ledger-count-badge">{reportTotals.txCount} Transaksi</span>
                    </div>

                    {#if reportTransactions.length === 0}
                        <div class="empty-notice">Tidak ada data transaksi pada filter dan periode ini.</div>
                    {:else}
                        <div class="table-container">
                            <table class="doc-table table-ledger">
                                <thead>
                                    <tr>
                                        <th style="width: 35px;">No</th>
                                        <th style="width: 95px;">Tanggal</th>
                                        <th>Keterangan / Transaksi</th>
                                        <th style="width: 110px;">Kategori</th>
                                        <th style="width: 105px;">Kantong</th>
                                        <th style="width: 95px;" class="text-center">Tipe</th>
                                        <th class="text-right" style="width: 130px;">Nominal</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {#each reportTransactions as trx, idx}
                                        {@const typeMeta = getTransactionTypeLabel(trx)}
                                        {@const pMeta = getPocketMeta(trx.pocket || trx.source)}
                                        {@const amt = Number(trx.amount) || 0}
                                        {@const isGr = trx.type === 'tring' || trx.type === 'inv_tring' || (trx.type === 'transfer' && (trx.source === 'tring' || trx.category === 'tring'))}
                                        <tr>
                                            <td class="text-center text-muted font-mono">{idx + 1}</td>
                                            <td class="font-mono text-xs">{formatDateShort(trx.date)}</td>
                                            <td>
                                                <div class="ledger-desc">{trx.desc || 'Transaksi'}</div>
                                                {#if trx.userName}
                                                    <div class="ledger-user-sub">Oleh: {trx.userName}</div>
                                                {/if}
                                            </td>
                                            <td class="text-xs">
                                                {CATEGORIES[trx.category]?.name || trx.category || '-'}
                                            </td>
                                            <td class="text-xs">
                                                <span class="ledger-pocket-tag">{pMeta.name}</span>
                                            </td>
                                            <td class="text-center">
                                                <span class="type-pill pill-{typeMeta.badge}">{typeMeta.label}</span>
                                            </td>
                                            <td class="text-right font-mono font-bold {typeMeta.badge === 'inc' || typeMeta.badge === 'sim' || typeMeta.badge === 'tab' ? 'text-inc' : typeMeta.badge === 'exp' || typeMeta.badge === 'jag' ? 'text-exp' : 'text-primary'}">
                                                {#if isGr}
                                                    {typeMeta.sign} {amt.toFixed(2)} Gr
                                                {:else}
                                                    {typeMeta.sign} {formatRp(amt)}
                                                {/if}
                                            </td>
                                        </tr>
                                    {/each}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <th colspan="6" class="text-right">SUBTOTAL PEMASUKAN</th>
                                        <th class="text-right font-mono text-inc font-bold">+ {formatRp(reportTotals.income)}</th>
                                    </tr>
                                    <tr>
                                        <th colspan="6" class="text-right">SUBTOTAL PENGELUARAN</th>
                                        <th class="text-right font-mono text-exp font-bold">- {formatRp(reportTotals.expense)}</th>
                                    </tr>
                                    <tr>
                                        <th colspan="6" class="text-right font-bold">SALDO ARUS KAS BERSIH (NET)</th>
                                        <th class="text-right font-mono font-bold {reportTotals.isSurplus ? 'text-inc' : 'text-exp'}">
                                            {reportTotals.netCashflow >= 0 ? '+' : ''}{formatRp(reportTotals.netCashflow)}
                                        </th>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    {/if}
                </section>
            {/if}

            <!-- 7. LEMBAR TANDA TANGAN / PENGESAHAN DOKUMEN -->
            {#if showSignature}
                <section class="doc-section doc-signature-section avoid-break">
                    <div class="signature-date-location">
                        Indonesia, {printDateStr}
                    </div>

                    <div class="signature-grid">
                        <div class="signature-block">
                            <div class="sig-title">Dibuat &amp; Dilaporkan Oleh:</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">
                                <strong>{$activeUser ? $activeUser.name : 'Pemilik Akun'}</strong>
                            </div>
                            <div class="sig-sub">Pemegang Rekening / Pengelola OS</div>
                        </div>

                        <div class="signature-block">
                            <div class="sig-title">Mengetahui / Diverifikasi:</div>
                            <div class="sig-space"></div>
                            <div class="sig-name">
                                <strong>(................................................)</strong>
                            </div>
                            <div class="sig-sub">Pemeriksa / Anggota Keluarga</div>
                        </div>
                    </div>
                </section>
            {/if}

            <!-- 8. FOOTER DOKUMEN CETAK RESMI -->
            <footer class="doc-footer">
                <div class="footer-left">
                    ARK Personal OS • Laporan Keuangan Cetak Resmi (Ukuran Kertas Standar A4)
                </div>
                <div class="footer-right">
                    Dicetak otomatis pada: {printDateStr} {printTimeStr}
                </div>
            </footer>
        </article>
    </div>
</div>

<style>
    /* ========================================================= */
    /* SCREEN-ONLY TOOLBAR & WRAPPER STYLES                      */
    /* ========================================================= */
    .report-view-container {
        padding: 20px 16px 80px 16px;
        max-width: 1100px;
        margin: 0 auto;
        min-height: 100vh;
    }

    .report-toolbar {
        background: var(--card-bg, #161f30);
        backdrop-filter: blur(12px);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        border-radius: 16px;
        padding: 16px 20px;
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
    }

    .toolbar-left {
        display: flex;
        align-items: center;
        gap: 14px;
    }

    .btn-back {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        color: var(--text-dark, #fff);
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .btn-back:hover {
        background: rgba(255, 255, 255, 0.15);
    }

    .toolbar-title {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .toolbar-title .icon {
        font-size: 24px;
    }
    .toolbar-title h1 {
        font-size: 18px;
        font-weight: 700;
        margin: 0;
        color: var(--text-dark, #fff);
    }
    .toolbar-title p {
        font-size: 12px;
        margin: 2px 0 0 0;
        color: var(--text-gray, #94a3b8);
    }

    .toolbar-controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 12px;
        border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
        padding-top: 12px;
    }

    .control-group {
        display: flex;
        align-items: center;
        gap: 6px;
    }
    .control-group label {
        font-size: 12px;
        font-weight: 600;
        color: var(--text-gray, #94a3b8);
    }
    .control-group select {
        background: var(--input-bg, #0f172a);
        color: var(--text-dark, #fff);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.15));
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 12.5px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
    }

    .control-checkboxes {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .checkbox-pill {
        display: flex;
        align-items: center;
        gap: 6px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
        padding: 5px 10px;
        border-radius: 8px;
        font-size: 12px;
        color: var(--text-gray, #94a3b8);
        cursor: pointer;
        user-select: none;
    }
    .checkbox-pill input {
        accent-color: var(--primary, #2563eb);
    }

    .toolbar-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-left: auto;
    }

    .btn-print {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
        transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .btn-print:hover {
        transform: translateY(-1px);
        box-shadow: 0 6px 16px rgba(37, 99, 235, 0.45);
    }
    .btn-print:active {
        transform: scale(0.97);
    }

    .btn-csv {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        background: rgba(16, 185, 129, 0.15);
        border: 1px solid rgba(16, 185, 129, 0.3);
        color: #10b981;
        padding: 8px 14px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.2s ease;
    }
    .btn-csv:hover {
        background: rgba(16, 185, 129, 0.25);
    }

    .print-instruction-banner {
        background: rgba(37, 99, 235, 0.12);
        border: 1px solid rgba(37, 99, 235, 0.25);
        border-radius: 12px;
        padding: 10px 16px;
        margin-bottom: 20px;
        font-size: 12.5px;
        color: var(--text-dark, #fff);
        line-height: 1.5;
    }

    /* ========================================================= */
    /* A4 PAPER CANVAS STYLES (PHYSICAL SHEET SIMULATION)        */
    /* ========================================================= */
    .report-paper-wrapper {
        display: flex;
        justify-content: center;
        width: 100%;
    }

    .a4-document {
        width: 100%;
        max-width: 210mm; /* Standar Lebar A4 */
        min-height: 297mm; /* Standar Tinggi A4 */
        background: #ffffff;
        color: #0f172a;
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
        border-radius: 4px;
        padding: 16mm 18mm;
        box-sizing: border-box;
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    /* 1. KOP SURAT / DOKUMEN */
    .doc-header {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .doc-brand {
        display: flex;
        align-items: center;
        gap: 10px;
    }
    .brand-badge {
        background: #0f172a;
        color: white;
        font-weight: 900;
        font-size: 14px;
        letter-spacing: 1px;
        padding: 4px 8px;
        border-radius: 6px;
    }
    .brand-name {
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #0f172a;
    }
    .brand-tagline {
        font-size: 10px;
        color: #64748b;
    }

    .doc-title-block {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        border-bottom: 2px solid #0f172a;
        padding-bottom: 8px;
        margin-top: 4px;
    }
    .doc-title {
        font-size: 20px;
        font-weight: 800;
        letter-spacing: -0.5px;
        color: #0f172a;
        margin: 0;
    }
    .doc-period-pill {
        font-size: 13px;
        color: #1e293b;
    }

    .doc-meta-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 8px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 8px 12px;
        margin-top: 4px;
    }
    .meta-item {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .meta-label {
        font-size: 9px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.3px;
    }
    .meta-value {
        font-size: 11px;
        font-weight: 700;
        color: #0f172a;
    }
    .status-verified {
        color: #059669;
    }

    .doc-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 14px 0;
    }

    /* SECTIONS */
    .doc-section {
        margin-bottom: 18px;
    }

    .section-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        font-weight: 800;
        color: #0f172a;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        margin: 0 0 10px 0;
    }
    .section-num {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #0f172a;
        color: white;
        font-size: 10px;
        font-weight: 800;
    }

    .section-head-with-badge {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
    }
    .ledger-count-badge {
        font-size: 10px;
        font-weight: 700;
        background: #f1f5f9;
        color: #475569;
        padding: 2px 8px;
        border-radius: 12px;
        border: 1px solid #cbd5e1;
    }

    /* 2. SUMMARY CARDS */
    .summary-cards-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 10px;
    }
    .summary-card {
        border-radius: 8px;
        padding: 10px 12px;
        border: 1px solid #e2e8f0;
        background: #f8fafc;
    }
    .card-head {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 4px;
    }
    .card-icon {
        font-size: 12px;
    }
    .card-label {
        font-size: 9.5px;
        font-weight: 700;
        color: #64748b;
        letter-spacing: 0.3px;
    }
    .card-amount {
        font-size: 14.5px;
        font-weight: 800;
        font-family: 'Plus Jakarta Sans', monospace;
        color: #0f172a;
        margin-bottom: 2px;
    }
    .card-sub {
        font-size: 9.5px;
        color: #64748b;
    }

    .card-income { border-left: 3px solid #10b981; }
    .card-income .card-amount { color: #059669; }

    .card-expense { border-left: 3px solid #f43f5e; }
    .card-expense .card-amount { color: #e11d48; }

    .card-surplus { border-left: 3px solid #2563eb; }
    .card-surplus .card-amount { color: #2563eb; }

    .card-deficit { border-left: 3px solid #f43f5e; }
    .card-deficit .card-amount { color: #e11d48; }

    .card-savings { border-left: 3px solid #8b5cf6; }
    .card-savings .card-amount { color: #7c3aed; }

    /* TABLES */
    .table-container {
        width: 100%;
        overflow-x: auto;
    }

    .doc-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        color: #1e293b;
    }
    .doc-table th {
        background: #f1f5f9;
        color: #475569;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        padding: 6px 8px;
        border: 1px solid #cbd5e1;
        text-align: left;
    }
    .doc-table td {
        padding: 5px 8px;
        border: 1px solid #e2e8f0;
        vertical-align: middle;
    }
    .doc-table tr:nth-child(even) td {
        background: #fafafa;
    }
    .doc-table tfoot th {
        background: #f8fafc;
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        font-size: 10.5px;
    }

    .table-ledger td {
        padding: 4px 6px;
    }

    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .text-xs { font-size: 10px; }
    .text-muted { color: #64748b; }
    .text-inc { color: #059669; }
    .text-exp { color: #e11d48; }
    .text-primary { color: #2563eb; }

    .table-cat-icon {
        margin-right: 5px;
        font-size: 12px;
    }
    .badge-sub {
        font-size: 9px;
        background: #fef3c7;
        color: #b45309;
        padding: 1px 5px;
        border-radius: 4px;
        font-weight: 700;
        margin-left: 4px;
    }

    .table-progress-track {
        width: 100%;
        height: 6px;
        background: #e2e8f0;
        border-radius: 3px;
        overflow: hidden;
    }
    .table-progress-fill {
        height: 100%;
        border-radius: 3px;
    }

    .ledger-desc {
        font-weight: 600;
        color: #0f172a;
    }
    .ledger-user-sub {
        font-size: 9px;
        color: #64748b;
    }
    .ledger-pocket-tag {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 9.5px;
        font-weight: 600;
        color: #334155;
    }

    .type-pill {
        display: inline-block;
        padding: 1px 6px;
        border-radius: 4px;
        font-size: 9px;
        font-weight: 700;
        text-transform: uppercase;
    }
    .pill-inc { background: #dcfce7; color: #15803d; }
    .pill-exp { background: #ffe4e6; color: #be123c; }
    .pill-sim { background: #ede9fe; color: #6d28d9; }
    .pill-tab { background: #ccfbf1; color: #0f766e; }
    .pill-trg { background: #fef3c7; color: #b45309; }
    .pill-jag { background: #ffedd5; color: #c2410c; }
    .pill-trf { background: #e0f2fe; color: #0369a1; }
    .pill-wdr { background: #f3e8ff; color: #7e22ce; }
    .pill-def { background: #f1f5f9; color: #475569; }

    /* EVALUATION / INSIGHTS */
    .eval-box {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-left: 4px solid #2563eb;
        border-radius: 6px;
        padding: 10px 14px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        font-size: 11px;
    }
    .eval-row {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }
    .eval-label {
        font-weight: 700;
        color: #475569;
        font-size: 10px;
        text-transform: uppercase;
    }
    .eval-val {
        color: #1e293b;
        line-height: 1.5;
    }

    .empty-notice {
        padding: 16px;
        text-align: center;
        background: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 6px;
        color: #64748b;
        font-size: 11px;
    }

    /* 7. SIGNATURE BLOCK */
    .doc-signature-section {
        margin-top: 24px;
    }
    .signature-date-location {
        text-align: right;
        font-size: 11px;
        color: #475569;
        margin-bottom: 12px;
    }
    .signature-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 30px;
    }
    .signature-block {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
    }
    .sig-title {
        font-size: 10.5px;
        font-weight: 700;
        color: #475569;
        margin-bottom: 40px; /* Space for manual or digital signature */
    }
    .sig-space {
        height: 12px;
    }
    .sig-name {
        font-size: 11px;
        color: #0f172a;
        border-top: 1px solid #0f172a;
        padding-top: 4px;
        min-width: 170px;
    }
    .sig-sub {
        font-size: 9.5px;
        color: #64748b;
        margin-top: 2px;
    }

    /* 8. FOOTER */
    .doc-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-top: 1px solid #e2e8f0;
        padding-top: 8px;
        margin-top: 24px;
        font-size: 9px;
        color: #94a3b8;
    }

    /* ========================================================= */
    /* RESPONSIVE ON SMALL MOBILE DEVICES (ON-SCREEN ONLY)       */
    /* ========================================================= */
    @media (max-width: 768px) {
        .report-view-container {
            padding: 12px 8px 90px 8px;
        }
        .report-toolbar {
            padding: 12px;
        }
        .toolbar-controls {
            flex-direction: column;
            align-items: stretch;
        }
        .toolbar-actions {
            margin-left: 0;
            width: 100%;
        }
        .btn-print, .btn-csv {
            flex: 1;
            justify-content: center;
        }
        .summary-cards-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .doc-meta-grid {
            grid-template-columns: repeat(2, 1fr);
        }
        .a4-document {
            padding: 10mm 8mm;
        }
    }

    /* ========================================================= */
    /* PRINT MEDIA RULES (EXACT A4 SPECIFICATION & CLEAN OUTPUT) */
    /* ========================================================= */
    @page {
        size: A4 portrait;
        margin: 10mm 12mm;
    }

    @media print {
        :global(body),
        :global(html) {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }

        :global(.app-navbar-container),
        :global(.mobile-bottom-bar),
        :global(#toast-container),
        :global(.no-print),
        .no-print,
        .report-toolbar,
        .print-instruction-banner {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .report-view-container {
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            min-height: auto !important;
        }

        .report-paper-wrapper {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        .a4-document {
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
        }

        .avoid-break {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .doc-signature-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .summary-cards-grid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }

        .doc-header {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
        }
    }
</style>

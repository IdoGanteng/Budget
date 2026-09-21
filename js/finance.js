// ================= SISTEM TRANSAKSI KEUANGAN & SYNC ================= //
const SHEET_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbwFKHf1Kakb71JXiZ2lB0JTN24p2kyKOwPvNx_ZwxLSRZamk3ujWtBFOqPhpx8aWZXHLA/exec';
const SHEET_TOKEN = 'RebelAman2026';

let transactions = [];
let financialGoals = JSON.parse(localStorage.getItem('financialGoals')) || { wealthGoal: 50000000, goldGoal: 10000000 };
let goldPricePerGram = parseFloat(localStorage.getItem('goldPricePerGram')) || 1250000;

const CATEGORIES = {
    makan: { name: 'Makan & Minum', icon: '🍔', color: '#f59e0b' },
    transport: { name: 'Transportasi', icon: '🚗', color: '#06b6d4' },
    belanja: { name: 'Belanja', icon: '🛍️', color: '#ec4899' },
    tagihan: { name: 'Tagihan', icon: '🏠', color: '#8b5cf6' },
    hiburan: { name: 'Hiburan', icon: '🎮', color: '#f43f5e' },
    kesehatan: { name: 'Kesehatan', icon: '💊', color: '#10b981' },
    gaji: { name: 'Gaji / Bisnis', icon: '💼', color: '#059669' },
    investasi: { name: 'Investasi / Emas', icon: '🪙', color: '#eab308' },
    lainnya: { name: 'Lainnya', icon: '📦', color: '#64748b' }
};

let categoryBudgets = JSON.parse(localStorage.getItem('categoryBudgets')) || {
    makan: 1200000,
    belanja: 800000,
    transport: 500000,
    tagihan: 750000
};

let searchQuery = '';

function addQuickAmount(delta) {
    const amtInp = document.getElementById('amount');
    if (!amtInp) return;
    let cur = parseInt(amtInp.value.replace(/\./g, ''), 10) || 0;
    cur += delta;
    amtInp.value = new Intl.NumberFormat('id-ID').format(cur);
}

function setSearchQuery(val) {
    searchQuery = val.trim().toLowerCase();
    if (typeof updateUI === 'function') updateUI();
}

function clearSearch() {
    searchQuery = '';
    const inp = document.getElementById('transaction-search-input');
    if (inp) inp.value = '';
    if (typeof updateUI === 'function') updateUI();
}

function openCategoryBudgetsModal() {
    const b = categoryBudgets;
    const modalContent = `
        <div style="font-size: 32px; margin-bottom: 12px;">📊</div>
        <h3>Atur Anggaran Kategori</h3>
        <p>Tentukan batas pengeluaran bulanan per kategori untuk mengontrol keuangan.</p>
        <form onsubmit="saveCategoryBudgets(event)" style="gap: 12px; text-align: left;">
            <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">🍔 Anggaran Makan (Rp)</label>
                <input type="text" id="budget-makan" value="${new Intl.NumberFormat('id-ID').format(b.makan || 1200000)}" oninput="formatGoalInput(this)" required>
            </div>
            <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">🛍️ Anggaran Belanja (Rp)</label>
                <input type="text" id="budget-belanja" value="${new Intl.NumberFormat('id-ID').format(b.belanja || 800000)}" oninput="formatGoalInput(this)" required>
            </div>
            <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">🚗 Anggaran Transportasi (Rp)</label>
                <input type="text" id="budget-transport" value="${new Intl.NumberFormat('id-ID').format(b.transport || 500000)}" oninput="formatGoalInput(this)" required>
            </div>
            <div>
                <label style="font-size: 12px; font-weight: 700; color: var(--text-gray); display: block; margin-bottom: 6px;">🏠 Anggaran Tagihan (Rp)</label>
                <input type="text" id="budget-tagihan" value="${new Intl.NumberFormat('id-ID').format(b.tagihan || 750000)}" oninput="formatGoalInput(this)" required>
            </div>
            <div class="modal-actions" style="margin-top: 8px;">
                <button type="button" onclick="closeAllModals()" class="btn-danger" style="flex: 1; border-radius: 12px;">Batal</button>
                <button type="submit" class="btn-primary" style="flex: 1; border-radius: 12px;">Simpan Anggaran</button>
            </div>
        </form>
    `;
    document.getElementById('modal-icon-el').innerText = '';
    document.getElementById('modal-title').innerText = '';
    document.getElementById('modal-desc').innerHTML = modalContent;
    document.getElementById('modal-actions-container').innerHTML = '';
    document.getElementById('custom-modal').classList.add('active');
}

function saveCategoryBudgets(e) {
    if (e) e.preventDefault();
    const parseVal = id => parseInt(document.getElementById(id).value.replace(/\./g, ''), 10) || 0;
    categoryBudgets = {
        makan: parseVal('budget-makan'),
        belanja: parseVal('budget-belanja'),
        transport: parseVal('budget-transport'),
        tagihan: parseVal('budget-tagihan')
    };
    localStorage.setItem('categoryBudgets', JSON.stringify(categoryBudgets));
    closeAllModals();
    if (typeof updateUI === 'function') updateUI();
    if (typeof showToast === 'function') {
        showToast('Anggaran bulanan berhasil diperbarui!', 'success', '📊');
    }
}
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ================= SANITASI CSV / FORMULA INJECTION ================= //
function sanitizeCsvField(val) {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (['=', '+', '-', '@', '\t', '\r'].includes(str.charAt(0))) {
        str = "'" + str;
    }
    return `"${str}"`;
}

function formatRp(angka) { 
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka); 
}

function parseDateToTime(dateStr) {
    if (!dateStr) return 0;
    if (dateStr.includes('/')) {
        let parts = dateStr.split('/');
        if (parts.length === 3) return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    let d = new Date(dateStr);
    return isNaN(d.getTime()) ? 0 : d.getTime();
}

function cleanDateStr(dateStr) {
    if (!dateStr) return '-';
    if (dateStr.includes('T')) {
        try {
            let d = new Date(dateStr);
            if (!isNaN(d.getTime())) return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
        } catch(e) {}
    }
    return dateStr;
}

// ================= STORAGE ENCRYPTED DB ================= //
function saveToLocal() { 
    if (currentSessionKey) {
        localStorage.setItem('keuangan_secure_db', CryptoJS.AES.encrypt(JSON.stringify(transactions), currentSessionKey).toString()); 
    }
}

function loadFromLocal(key) { 
    try { 
        const stored = localStorage.getItem('keuangan_secure_db');
        if (stored && key) return JSON.parse(CryptoJS.AES.decrypt(stored, key).toString(CryptoJS.enc.Utf8)); 
    } catch(e) {}
    return null;
}

// ================= SINKRONISASI GOOGLE SHEETS ================= //
async function syncTransactionsFromSheet() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const response = await fetch(SHEET_WEB_APP_URL, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync', token: SHEET_TOKEN }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        if (result && result.status === 'success' && Array.isArray(result.data)) {
            transactions = result.data;
            saveToLocal();
            if (typeof updateUI === 'function') updateUI();
            if (typeof showToast === 'function') {
                showToast('Data tersinkronisasi dari Cloud Spreadsheet ⚡', 'info', '☁️');
            }
        } else {
            transactions = loadFromLocal(currentSessionKey) || [];
            if (typeof updateUI === 'function') updateUI();
        }
    } catch (err) {
        console.warn('Gagal sinkronisasi dengan Spreadsheet (offline), memuat data lokal terenkripsi.');
        transactions = loadFromLocal(currentSessionKey) || [];
        if (typeof updateUI === 'function') updateUI();
    }
}

async function addTransactionToSheet(trx) {
    try { 
        await fetch(SHEET_WEB_APP_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'add', token: SHEET_TOKEN, ...trx }) 
        });
    } catch (err) { 
        console.error('Gagal menambahkan ke Spreadsheet:', err); 
    }
}

async function deleteTransactionFromSheet(id) {
    try { 
        await fetch(SHEET_WEB_APP_URL, { 
            method: 'POST', 
            body: JSON.stringify({ action: 'delete', token: SHEET_TOKEN, id: id }) 
        });
    } catch (err) { 
        console.error('Gagal menghapus dari Spreadsheet:', err); 
    }
}

// ================= LIVE GOLD SPOT PRICE ================= //
async function fetchAutoGoldPrice() {
    const statusEl = document.getElementById('api-status');
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('https://api.metals.live/v1/spot/gold', { signal: controller.signal });
        clearTimeout(timeoutId);

        const data = await response.json();
        if (data && data.length > 0 && data[0].price) {
            const pricePerTroyOunceUSD = data[0].price;
            const gramsPerTroyOunce = 31.1035;
            const pricePerGramUSD = pricePerTroyOunceUSD / gramsPerTroyOunce;
            const estimatedUSDIDR = 15800; 
            const calculatedIDR = Math.round(pricePerGramUSD * estimatedUSDIDR);

            if (calculatedIDR > 500000) {
                goldPricePerGram = calculatedIDR;
                localStorage.setItem('goldPricePerGram', goldPricePerGram);
                const goldInp = document.getElementById('gold-price-input');
                if (goldInp) {
                    goldInp.value = new Intl.NumberFormat('id-ID').format(goldPricePerGram);
                }
                if (statusEl) statusEl.innerHTML = '<span class="pulse-dot"></span> Live Terupdate ⚡';
                if (typeof updateUI === 'function') updateUI();
            }
        }
    } catch (error) {
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--text-gray); font-size:12px;">(Mode Offline)</span>';
    }
}

function formatGoldPriceInput(el) { 
    let raw = el.value.replace(/[^0-9]/g, ''); 
    el.value = raw ? new Intl.NumberFormat('id-ID').format(raw) : ''; 
}

function saveGoldPrice() {
    const rawVal = document.getElementById('gold-price-input').value.replace(/\./g, '');
    if (rawVal && !isNaN(rawVal)) { 
        goldPricePerGram = parseFloat(rawVal); 
        localStorage.setItem('goldPricePerGram', goldPricePerGram); 
        const statusEl = document.getElementById('api-status');
        if (statusEl) statusEl.innerHTML = '<span style="color:var(--primary); font-size:12px;">(Manual Update)</span>';
        if (typeof updateUI === 'function') updateUI(); 
        if (typeof showToast === 'function') {
            showToast(`Harga emas diperbarui: Rp ${new Intl.NumberFormat('id-ID').format(goldPricePerGram)} / Gr`, 'success', '🪙');
        }
    }
}

// ================= GOALS FINANSIAL ================= //
function openGoalsModal() {
    document.getElementById('modal-wealth-goal').value = new Intl.NumberFormat('id-ID').format(financialGoals.wealthGoal);
    document.getElementById('modal-gold-goal').value = new Intl.NumberFormat('id-ID').format(financialGoals.goldGoal);
    document.getElementById('goals-modal').classList.add('active');
}

function closeGoalsModal() { 
    document.getElementById('goals-modal').classList.remove('active'); 
}

function formatGoalInput(el) {
    let raw = el.value.replace(/[^0-9]/g, '');
    el.value = raw ? new Intl.NumberFormat('id-ID').format(raw) : '';
}

function saveGoals(e) {
    if (e) e.preventDefault();
    const wRaw = document.getElementById('modal-wealth-goal').value.replace(/\./g, '');
    const gRaw = document.getElementById('modal-gold-goal').value.replace(/\./g, '');
    if (wRaw && gRaw) {
        financialGoals.wealthGoal = parseInt(wRaw, 10);
        financialGoals.goldGoal = parseInt(gRaw, 10);
        localStorage.setItem('financialGoals', JSON.stringify(financialGoals));
        closeGoalsModal();
        if (typeof updateUI === 'function') updateUI();
        if (typeof showToast === 'function') {
            showToast('Target finansial 2026 berhasil disimpan!', 'success', '🎯');
        }
    }
}

// ================= FORM TYPE CHANGE ================= //
function handleTypeChange() {
    const t = document.getElementById('type').value; 
    const a = document.getElementById('amount');
    const sourceContainer = document.getElementById('withdraw-source-container');

    if (t === 'withdraw') { sourceContainer.style.display = 'block'; } 
    else { sourceContainer.style.display = 'none'; }

    if (t === 'tring' || (t === 'withdraw' && document.getElementById('withdraw-source').value === 'tring')) { 
        a.placeholder = "Jml Gram (Misal: 0.5)"; 
    } else { 
        a.placeholder = "Jml Rupiah (Misal: 100.000)"; 
    }
}

// ================= EDIT & DELETE TRANSACTIONS ================= //
function editTransaction(id) {
    const trx = transactions.find(t => String(t.id) === String(id));
    if (!trx) return;

    document.getElementById('edit-trx-id').value = trx.id;
    document.getElementById('edit-trx-desc').value = trx.desc;
    document.getElementById('edit-trx-type').value = trx.type;
    handleEditTrgTypeChange();
    
    const editAmtField = document.getElementById('edit-trx-amount');
    if (trx.type === 'tring' || trx.type === 'inv_tring' || (trx.type === 'withdraw' && trx.source === 'tring')) {
        editAmtField.value = trx.amount;
    } else {
        editAmtField.value = new Intl.NumberFormat('id-ID').format(trx.amount);
    }

    if (trx.type === 'withdraw' && trx.source) {
        document.getElementById('edit-withdraw-source').value = trx.source;
    }

    document.getElementById('transaction-edit-modal').classList.add('active');
}

function closeTransactionEditModal() { 
    document.getElementById('transaction-edit-modal').classList.remove('active'); 
}

function handleEditTrgTypeChange() {
    const t = document.getElementById('edit-trx-type').value;
    const container = document.getElementById('edit-withdraw-source-container');
    if (t === 'withdraw') { container.style.display = 'block'; } 
    else { container.style.display = 'none'; }
}

async function saveEditedTransaction(e) {
    if (e) e.preventDefault();
    closeTransactionEditModal();

    const id = document.getElementById('edit-trx-id').value;
    const desc = document.getElementById('edit-trx-desc').value;
    const type = document.getElementById('edit-trx-type').value;
    let rawAmt = document.getElementById('edit-trx-amount').value;
    let source = type === 'withdraw' ? document.getElementById('edit-withdraw-source').value : 'pribadi';

    let isGram = (type === 'tring' || (type === 'withdraw' && source === 'tring'));
    let amt = isGram ? parseFloat(rawAmt.replace(',', '.')) : parseInt(rawAmt.replace(/\./g, ''), 10);

    if (!amt || isNaN(amt) || amt <= 0) return;

    const idx = transactions.findIndex(t => String(t.id) === String(id));
    if (idx !== -1) {
        transactions[idx].desc = desc;
        transactions[idx].type = type;
        transactions[idx].amount = amt;
        transactions[idx].source = source;
        saveToLocal();
        if (typeof updateUI === 'function') updateUI();
        
        await deleteTransactionFromSheet(id);
        await addTransactionToSheet(transactions[idx]);

        if (typeof showToast === 'function') {
            showToast('Transaksi berhasil diperbarui.', 'success', '✏️');
        }
    }
}

function deleteTransaction(id) {
    showModal('🗑️', 'Hapus Transaksi', 'Apakah kamu yakin ingin menghapus catatan transaksi ini dari aplikasi dan Spreadsheet?', `
        <button type="button" onclick="closeAllModals()" class="btn-danger" style="flex: 1; padding: 14px; border-radius: 14px;">Batal</button>
        <button type="button" onclick="executeDeleteTransaction('${escapeHtml(String(id))}')" class="btn-primary" style="flex: 1; padding: 14px; border-radius: 14px;">Ya, Hapus</button>
    `);
}

async function executeDeleteTransaction(id) {
    transactions = transactions.filter(t => String(t.id) !== String(id));
    saveToLocal();
    if (typeof updateUI === 'function') updateUI();
    closeAllModals();
    await deleteTransactionFromSheet(id);
    if (typeof showToast === 'function') {
        showToast('Transaksi telah dihapus.', 'info', '🗑️');
    }
}

function confirmResetData() {
    showModal('⚠️', 'Bersihkan Data Lokal', 'Tindakan ini hanya membersihkan cache snapshot lokal browser. Data transaksi di Google Spreadsheet tetap aman.', `
        <button type="button" onclick="closeAllModals()" class="btn-primary" style="flex: 1; padding: 14px; border-radius: 14px;">Batal</button>
        <button type="button" onclick="executeResetData()" class="btn-danger" style="flex: 1; padding: 14px; border-radius: 14px;">Bersihkan</button>
    `);
}

function executeResetData() {
    localStorage.removeItem('financialSnapshots');
    saveToLocal();
    if (typeof updateUI === 'function') updateUI();
    closeAllModals();
    if (typeof showToast === 'function') {
        showToast('Cache lokal berhasil dibersihkan.', 'success', '🧹');
    }
}

// ================= CSV EXPORT ================= //
function exportToCSV() {
    if (!transactions || transactions.length === 0) {
        showModal('⚠️', 'Data Kosong', 'Belum ada data transaksi yang bisa di-download.', `<button type="button" onclick="closeAllModals()" class="btn-primary" style="padding: 14px; border-radius: 14px; width:100%;">Mengerti</button>`);
        return;
    }
    let csvContent = "\uFEFF"; // UTF-8 BOM agar terbaca sempurna di Microsoft Excel
    csvContent += "ID,Tanggal,Keterangan,Nominal,Tipe,Sumber,Pengguna\n";
    transactions.forEach(row => {
        let idSafe = sanitizeCsvField(row.id);
        let dateSafe = sanitizeCsvField(row.date);
        let descSafe = sanitizeCsvField(row.desc);
        let amtSafe = sanitizeCsvField(row.amount);
        let typeSafe = sanitizeCsvField(row.type);
        let sourceSafe = sanitizeCsvField(row.source || '-');
        let userSafe = sanitizeCsvField(row.userName || 'Rebel');
        csvContent += `${idSafe},${dateSafe},${descSafe},${amtSafe},${typeSafe},${sourceSafe},${userSafe}\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Rekap_Keuangan_Personal_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') {
        showToast('File CSV berhasil diunduh.', 'success', '📥');
    }
}

// ================= TREND SNAPSHOTS ================= //
function calculateAndRenderTrend(elementId, currentVal, prevVal) {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!prevVal || prevVal === 0) { 
        el.innerText = '0%'; 
        el.className = 'stat-trend trend-flat'; 
        return; 
    }

    let diff = ((currentVal - prevVal) / prevVal) * 100;
    let sign = diff > 0 ? '+' : '';
    el.innerText = `${sign}${diff.toFixed(1)}%`;
    if (diff > 0) el.className = 'stat-trend trend-up';
    else if (diff < 0) el.className = 'stat-trend trend-down';
    else el.className = 'stat-trend trend-flat';
}

function checkAndUpdateSnapshots(cash, simpanan, pribadi, tring, jago) {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    const currentDateKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    let snapshots = JSON.parse(localStorage.getItem('financialSnapshots')) || { monthly: {}, daily: {} };
    let lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    let prevMonthKey = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth()+1).padStart(2,'0')}`;
    
    if (!snapshots.monthly[currentMonthKey]) {
        snapshots.monthly[currentMonthKey] = { cash, simpanan, pribadi };
        localStorage.setItem('financialSnapshots', JSON.stringify(snapshots));
    }

    let prevMonthData = snapshots.monthly[prevMonthKey] || snapshots.monthly[currentMonthKey];
    calculateAndRenderTrend('trend-cash', cash, prevMonthData.cash);
    calculateAndRenderTrend('trend-simpanan', simpanan, prevMonthData.simpanan);
    calculateAndRenderTrend('trend-pribadi', pribadi, prevMonthData.pribadi);

    let yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    let prevDateKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth()+1).padStart(2,'0')}-${String(yesterday.getDate()).padStart(2,'0')}`;

    if (!snapshots.daily[currentDateKey]) {
        snapshots.daily[currentDateKey] = { tring, jago };
        localStorage.setItem('financialSnapshots', JSON.stringify(snapshots));
    }

    let prevDayData = snapshots.daily[prevDateKey] || snapshots.daily[currentDateKey];
    calculateAndRenderTrend('trend-tring', tring, prevDayData.tring);
    calculateAndRenderTrend('trend-jago', jago, prevDayData.jago);
}

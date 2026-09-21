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

// ================= USER STORAGE & OFFLINE QUEUE KEYS ================= //
function getUserStorageKey() {
    const active = (typeof getActiveUser === 'function') ? getActiveUser() : null;
    return active ? `keuangan_db_${active.id}` : 'keuangan_secure_db';
}

function getOfflineQueueKey() {
    const active = (typeof getActiveUser === 'function') ? getActiveUser() : null;
    return active ? `offline_queue_${active.id}` : 'offline_queue_default';
}

function getUserSpreadsheetConfig() {
    const active = (typeof getActiveUser === 'function') ? getActiveUser() : null;
    const customUrl = active && active.spreadsheetUrl ? active.spreadsheetUrl.trim() : '';
    const customToken = active && active.spreadsheetToken ? active.spreadsheetToken.trim() : '';

    return {
        url: customUrl || SHEET_WEB_APP_URL,
        token: customToken || SHEET_TOKEN,
        isCustom: Boolean(customUrl),
        email: active && active.email ? active.email : 'default@personal.os',
        userId: active ? active.id : 'user_default',
        userName: active ? active.name : 'User'
    };
}

function getAppSessionKey() {
    if (typeof currentSessionKey !== 'undefined' && currentSessionKey) {
        return currentSessionKey;
    }
    try {
        return sessionStorage.getItem('appEncryptionKey') || null;
    } catch (e) {
        return null;
    }
}

// ================= STORAGE ENCRYPTED DB (PER USER) ================= //
function saveToLocal() {
    const key = getUserStorageKey();
    const sessionKey = getAppSessionKey();
    if (sessionKey && typeof CryptoJS !== 'undefined' && CryptoJS && CryptoJS.AES) {
        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(transactions), sessionKey).toString();
            localStorage.setItem(key, encrypted);
        } catch (e) {
            localStorage.setItem(key, JSON.stringify(transactions));
        }
    } else {
        localStorage.setItem(key, JSON.stringify(transactions));
    }
}

function loadFromLocal(sessionKey) {
    const key = getUserStorageKey();
    const sk = sessionKey || getAppSessionKey();
    let stored = localStorage.getItem(key);
    
    // Fallback ke legacy key 'keuangan_secure_db' jika key per-user belum terisi
    if (!stored) {
        stored = localStorage.getItem('keuangan_secure_db');
    }
    if (!stored) return [];

    const trimmed = stored.trim();
    // 1. Jika data berupa JSON biasa (array / object)
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        try {
            return JSON.parse(trimmed);
        } catch (e) {}
    }

    // 2. Jika data terenkripsi AES
    if (typeof CryptoJS !== 'undefined' && CryptoJS && CryptoJS.AES && sk) {
        try {
            const bytes = CryptoJS.AES.decrypt(stored, sk);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (decrypted) return JSON.parse(decrypted);
        } catch (e) {}
    }

    // 3. Fallback
    try {
        return JSON.parse(stored);
    } catch (e) {
        return [];
    }
}

// ================= OFFLINE SYNC QUEUE & BACKGROUND UPLOAD ================= //
function getOfflineQueue() {
    try {
        const stored = localStorage.getItem(getOfflineQueueKey());
        if (stored) return JSON.parse(stored) || [];
    } catch (e) {}
    return [];
}

function saveOfflineQueue(queue) {
    localStorage.setItem(getOfflineQueueKey(), JSON.stringify(queue));
    updateSyncIndicator();
}

function enqueueOfflineAction(action, trx) {
    const queue = getOfflineQueue();
    const queueItem = {
        id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        action: action,
        trx: trx,
        timestamp: Date.now()
    };
    queue.push(queueItem);
    saveOfflineQueue(queue);

    if (navigator.onLine) {
        processOfflineQueue();
    } else {
        if (typeof showToast === 'function') {
            showToast('💾 Transaksi disimpan di perangkat (Offline). Akan otomatis diunggah saat ada internet.', 'warning', '📡');
        }
    }
}

let isProcessingQueue = false;
async function processOfflineQueue() {
    if (isProcessingQueue) return;
    if (!navigator.onLine) {
        updateSyncIndicator();
        return;
    }

    const queue = getOfflineQueue();
    if (queue.length === 0) {
        updateSyncIndicator();
        return;
    }

    isProcessingQueue = true;
    updateSyncIndicator(true);

    const config = getUserSpreadsheetConfig();
    let successCount = 0;

    while (queue.length > 0 && navigator.onLine) {
        const item = queue[0];
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const payload = {
                action: item.action,
                token: config.token,
                ...item.trx
            };

            const res = await fetch(config.url, {
                method: 'POST',
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (res.ok) {
                queue.shift();
                saveOfflineQueue(queue);
                successCount++;
            } else {
                console.warn('Gagal upload item offline, status:', res.status);
                break;
            }
        } catch (err) {
            console.warn('Koneksi terputus saat upload antrian offline:', err);
            break;
        }
    }

    isProcessingQueue = false;
    updateSyncIndicator();

    if (successCount > 0 && queue.length === 0) {
        if (typeof showToast === 'function') {
            showToast(`✅ ${successCount} transaksi offline berhasil diunggah ke Google Spreadsheet!`, 'success', '☁️');
        }
    }
}

// ================= SINKRONISASI GOOGLE SHEETS ================= //
async function syncTransactionsFromSheet(manual = false) {
    const config = getUserSpreadsheetConfig();
    const sessionKey = getAppSessionKey();

    // 1. Muat data lokal seketika agar antarmuka tidak kosong
    if (!transactions || transactions.length === 0) {
        transactions = loadFromLocal(sessionKey) || [];
        if (transactions.length > 0 && typeof updateUI === 'function') {
            updateUI();
        }
    }

    if (!navigator.onLine) {
        transactions = loadFromLocal(sessionKey) || [];
        if (typeof updateUI === 'function') updateUI();
        updateSyncIndicator();
        if (manual && typeof showToast === 'function') {
            showToast('Mode Offline: Memuat data tersimpan di perangkat.', 'info', '📡');
        }
        return;
    }

    await processOfflineQueue();

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(config.url, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync', token: config.token }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const result = await response.json();
        if (result && result.status === 'success' && Array.isArray(result.data)) {
            transactions = result.data;
            saveToLocal();
            // Backup ke legacy key agar selalu tersimpan di browser
            try {
                localStorage.setItem('keuangan_secure_db', JSON.stringify(transactions));
            } catch(e) {}

            if (typeof updateUI === 'function') updateUI();
            updateSyncIndicator();
            if (manual && typeof showToast === 'function') {
                showToast(`Data berhasil disinkronkan (${transactions.length} transaksi) ⚡`, 'success', '☁️');
            }
        } else {
            transactions = loadFromLocal(sessionKey) || [];
            if (typeof updateUI === 'function') updateUI();
            updateSyncIndicator();
        }
    } catch (err) {
        console.warn('Gagal mengambil data Spreadsheet, gunakan data lokal:', err);
        transactions = loadFromLocal(sessionKey) || [];
        if (typeof updateUI === 'function') updateUI();
        updateSyncIndicator();
        if (manual && typeof showToast === 'function') {
            showToast('Tidak dapat menghubungi Spreadsheet, menggunakan data lokal.', 'warning', '⚠️');
        }
    }
}

async function addTransactionToSheet(trx) {
    enqueueOfflineAction('add', trx);
}

async function deleteTransactionFromSheet(id) {
    enqueueOfflineAction('delete', { id: id });
}

// ================= SYNC STATUS INDICATOR ================= //
function updateSyncIndicator(uploading = false) {
    const queue = getOfflineQueue();
    const isOnline = navigator.onLine;
    const config = getUserSpreadsheetConfig();

    const indicatorEl = document.getElementById('sync-status-indicator');
    const heroBadgeEl = document.getElementById('mem-hero-badge');
    const sheetConnBadge = document.getElementById('sheet-conn-badge');

    let text = 'Tersinkron';
    let dotClass = 'green';
    let statusClass = 'online';

    if (uploading) {
        text = `Mengunggah (${queue.length})...`;
        dotClass = 'blue rotating';
        statusClass = 'syncing';
    } else if (!isOnline) {
        text = queue.length > 0 ? `Offline (${queue.length} antri)` : 'Offline';
        dotClass = 'yellow';
        statusClass = 'offline';
    } else if (queue.length > 0) {
        text = `Ada ${queue.length} antri`;
        dotClass = 'yellow';
        statusClass = 'pending';
    } else {
        text = config.isCustom ? 'Spreadsheet Pribadi' : 'Cloud Sync Aktif';
        dotClass = 'green';
        statusClass = 'online';
    }

    if (indicatorEl) {
        indicatorEl.className = `sync-status-pill ${statusClass}`;
        indicatorEl.innerHTML = `<span class="status-dot ${dotClass}"></span><span>${escapeHtml(text)}</span>`;
    }

    if (heroBadgeEl) {
        heroBadgeEl.innerHTML = `<span style="color:${isOnline ? '#34d399' : '#fbbf24'};">●</span> ${escapeHtml(text)}`;
    }

    if (sheetConnBadge) {
        sheetConnBadge.innerText = config.isCustom ? 'Spreadsheet Pribadi' : 'Template Standar';
        sheetConnBadge.style.color = config.isCustom ? '#34d399' : '#38bdf8';
    }
}

function triggerManualSync() {
    if (!navigator.onLine) {
        if (typeof showToast === 'function') {
            showToast('Tidak ada koneksi internet. Cek jaringan Anda.', 'error', '📡');
        }
        return;
    }
    if (typeof showToast === 'function') {
        showToast('Menghubungi Google Spreadsheet...', 'info', '🔄');
    }
    syncTransactionsFromSheet(true);
}

// ================= TEST & SAVE PERSONAL SPREADSHEET DATABASE ================= //
async function testSpreadsheetConnection() {
    const urlInput = document.getElementById('user-sheet-url');
    const tokenInput = document.getElementById('user-sheet-token');
    const url = urlInput ? urlInput.value.trim() : '';
    const token = tokenInput ? tokenInput.value.trim() : SHEET_TOKEN;

    if (!url) {
        if (typeof showToast === 'function') showToast('Masukkan URL Web App Google Apps Script Anda terlebih dahulu.', 'warning', '⚠️');
        return;
    }

    if (typeof showToast === 'function') showToast('Menguji koneksi ke Google Spreadsheet...', 'info', '⏳');

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000);

        const res = await fetch(url, {
            method: 'POST',
            body: JSON.stringify({ action: 'sync', token: token }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        const json = await res.json();
        if (json && json.status === 'success') {
            const count = Array.isArray(json.data) ? json.data.length : 0;
            if (typeof showToast === 'function') {
                showToast(`✅ Berhasil terhubung ke Google Spreadsheet! (${count} transaksi ditemukan)`, 'success', '🎉');
            }
        } else {
            if (typeof showToast === 'function') {
                showToast('Respon diterima dari Spreadsheet: ' + (json.message || 'OK'), 'info', '📊');
            }
        }
    } catch (err) {
        console.error('Test connection error:', err);
        if (typeof showModal === 'function') {
            showModal('❌', 'Gagal Menghubungi Spreadsheet', `Pastikan Web App sudah di-deploy dengan akses <b>"Anyone" (Siapa saja)</b>.<br><br><small style="color:var(--text-gray)">Error: ${escapeHtml(err.message)}</small>`, `
                <button type="button" onclick="closeAllModals()" class="btn-primary" style="padding:12px;border-radius:12px;width:100%;">Tutup</button>
            `);
        }
    }
}

function saveUserSpreadsheetSettings(e) {
    if (e) e.preventDefault();
    const urlInput = document.getElementById('user-sheet-url');
    const tokenInput = document.getElementById('user-sheet-token');
    const url = urlInput ? urlInput.value.trim() : '';
    const token = tokenInput ? tokenInput.value.trim() : '';

    const users = (typeof getUsersList === 'function') ? getUsersList() : [];
    const active = (typeof getActiveUser === 'function') ? getActiveUser() : null;

    if (active) {
        const found = users.find(u => u.id === active.id);
        if (found) {
            found.spreadsheetUrl = url;
            found.spreadsheetToken = token;
            saveUsersList(users);
        }
    }

    updateSyncIndicator();
    if (typeof showToast === 'function') {
        showToast('Konfigurasi database Google Spreadsheet disimpan!', 'success', '💾');
    }
    if (url) {
        syncTransactionsFromSheet(true);
    }
}

function populateSpreadsheetSettingsInputs() {
    const config = getUserSpreadsheetConfig();
    const urlInput = document.getElementById('user-sheet-url');
    const tokenInput = document.getElementById('user-sheet-token');
    const emailInfo = document.getElementById('user-sheet-email-info');

    if (urlInput) urlInput.value = config.isCustom ? config.url : '';
    if (tokenInput) tokenInput.value = config.token || '';
    if (emailInfo) emailInfo.innerText = config.email;
}

function openAppsScriptTemplateModal() {
    const code = `function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Inisialisasi Header bila masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ID", "Tanggal", "Keterangan", "Nominal", "Tipe", "Sumber", "Kategori", "User ID", "User Name"]);
    }
    
    if (action === "ping") {
      return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Terkoneksi!" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "sync") {
      var rows = sheet.getDataRange().getValues();
      var result = [];
      for (var i = 1; i < rows.length; i++) {
        var r = rows[i];
        if (r[0] && r[1]) {
          result.push({
            id: String(r[0]),
            date: String(r[1]),
            desc: String(r[2]),
            amount: Number(r[3]),
            type: String(r[4]),
            source: String(r[5] || 'pribadi'),
            category: String(r[6] || 'makan'),
            userId: String(r[7] || ''),
            userName: String(r[8] || '')
          });
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success", data: result })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "add") {
      sheet.appendRow([data.id, data.date, data.desc, data.amount, data.type, data.source, data.category, data.userId, data.userName]);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "delete") {
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === String(data.id)) {
          sheet.deleteRow(i + 1);
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

    const modalContent = `
        <div style="font-size:32px; margin-bottom:8px;">📜</div>
        <h3>Kode Google Apps Script</h3>
        <p style="font-size:12.5px; color:var(--text-gray); margin-bottom:12px;">Salin kode di bawah ke menu <b>Extensions &gt; Apps Script</b> di Google Sheets Anda, lalu Deploy sebagai Web App (Who has access: <b>Anyone</b>).</p>
        <div style="position:relative; text-align:left;">
            <textarea id="apps-script-code-area" readonly style="width:100%; height:200px; font-family:monospace; font-size:11px; padding:10px; background:var(--input-bg); border:1px solid var(--border-color); border-radius:12px; resize:none;">${escapeHtml(code)}</textarea>
            <button type="button" onclick="copyAppsScriptCode()" class="btn-primary" style="margin-top:8px; width:100%; border-radius:12px; padding:10px; font-size:13px;">📋 Salin Semua Kode</button>
        </div>
        <button type="button" onclick="closeAllModals()" class="btn-danger" style="margin-top:10px; width:100%; border-radius:12px; padding:10px; font-size:12px;">Tutup</button>
    `;

    document.getElementById('modal-icon-el').innerText = '';
    document.getElementById('modal-title').innerText = '';
    document.getElementById('modal-desc').innerHTML = modalContent;
    document.getElementById('modal-actions-container').innerHTML = '';
    document.getElementById('custom-modal').classList.add('active');
}

function copyAppsScriptCode() {
    const area = document.getElementById('apps-script-code-area');
    if (area) {
        area.select();
        navigator.clipboard.writeText(area.value).then(() => {
            if (typeof showToast === 'function') {
                showToast('Kode Google Apps Script berhasil disalin ke clipboard!', 'success', '📋');
            }
        });
    }
}

// Event listener online / offline
window.addEventListener('online', () => {
    updateSyncIndicator();
    if (typeof showToast === 'function') {
        showToast('🌐 Terhubung kembali ke internet! Mengunggah transaksi otomatis...', 'info', '🔄');
    }
    processOfflineQueue();
});
window.addEventListener('offline', () => {
    updateSyncIndicator();
    if (typeof showToast === 'function') {
        showToast('📡 Anda dalam Mode Offline. Input transaksi tetap disimpan dan aman!', 'warning', '⚠️');
    }
});
setInterval(() => {
    if (navigator.onLine) {
        const q = getOfflineQueue();
        if (q.length > 0) processOfflineQueue();
    }
}, 15000);

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

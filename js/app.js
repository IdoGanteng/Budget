// ================= APP INITIALIZATION & EVENT LISTENERS ================= //
function initInputListeners() {
    const amtInp = document.getElementById('amount');
    if (amtInp) {
        amtInp.addEventListener('input', function() {
            const t = document.getElementById('type').value;
            const src = document.getElementById('withdraw-source').value;
            if (t !== 'tring' && !(t === 'withdraw' && src === 'tring')) { 
                let raw = this.value.replace(/[^0-9]/g, ''); 
                this.value = raw ? new Intl.NumberFormat('id-ID').format(raw) : ''; 
            } else { 
                this.value = this.value.replace(/[^0-9.,]/g, '').replace(',', '.'); 
            }
        });
    }

    const withdrawSourceInp = document.getElementById('withdraw-source');
    if (withdrawSourceInp) {
        withdrawSourceInp.addEventListener('change', function() { handleTypeChange(); });
    }

    // Enter key support untuk Form Login
    const loginPassInp = document.getElementById('password-input');
    const loginUserInp = document.getElementById('username-input');
    if (loginPassInp && loginUserInp) {
        [loginUserInp, loginPassInp].forEach(input => {
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLogin(e);
                }
            });
        });
    }

    // Enter key support untuk Form Transaksi Utama
    const descInput = document.getElementById('desc');
    if (descInput && amtInp) {
        descInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                amtInp.focus();
                amtInp.select();
            }
        });
        amtInp.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const mainForm = document.getElementById('form');
                if (mainForm) mainForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Enter key support untuk Modal Edit Transaksi
    const editDesc = document.getElementById('edit-trx-desc');
    const editAmount = document.getElementById('edit-trx-amount');
    if (editDesc && editAmount) {
        editDesc.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                editAmount.focus();
                editAmount.select();
            }
        });
        editAmount.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const editForm = document.querySelector('#transaction-edit-modal form');
                if (editForm) editForm.dispatchEvent(new Event('submit'));
            }
        });
    }

    // Category Selection buttons in Form
    const catBtns = document.querySelectorAll('.cat-btn');
    catBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const parent = this.parentElement;
            parent.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('selected'));
            this.classList.add('selected');
            parent.setAttribute('data-selected-category', this.getAttribute('data-cat') || 'makan');
        });
    });

    // Search bar listener in history
    const searchInput = document.getElementById('transaction-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            setSearchQuery(this.value);
        });
    }

    // Submit handler untuk Form Transaksi Utama (Mendukung Multi-User & Kategori)
    const frm = document.getElementById('form');
    if (frm) {
        frm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const desc = document.getElementById('desc').value.trim(); 
            const type = document.getElementById('type').value; 
            let rawAmt = document.getElementById('amount').value;
            let source = type === 'withdraw' ? document.getElementById('withdraw-source').value : 'pribadi';

            let isGram = (type === 'tring' || (type === 'withdraw' && source === 'tring'));
            let amt = isGram ? parseFloat(rawAmt.replace(',', '.')) : parseInt(rawAmt.replace(/\./g, ''), 10);
            if (!amt || isNaN(amt) || amt <= 0) return;

            // Dapatkan kategori yang dipilih
            const catContainer = document.getElementById('form-category-chips');
            let chosenCat = catContainer ? (catContainer.getAttribute('data-selected-category') || 'makan') : 'makan';

            // Dapatkan pengguna yang dipilih di formulir atau fallback ke active user
            const formUserChipsContainer = document.getElementById('form-user-chips');
            const selectedUserId = formUserChipsContainer ? formUserChipsContainer.getAttribute('data-selected-user') : null;
            const users = (typeof getUsersList === 'function') ? getUsersList() : [];
            const activeUser = (typeof getActiveUser === 'function') ? getActiveUser() : { id: 'user_rebel', name: 'Rebel' };
            
            let chosenUser = users.find(u => u.id === selectedUserId) || activeUser;

            const d = new Date(); 
            const dStr = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
            const newTrxId = Math.floor(100000 + Math.random() * 900000).toString();

            const newTrx = { 
                id: newTrxId, 
                date: dStr, 
                desc: desc, 
                amount: amt, 
                type: type, 
                source: source,
                category: chosenCat,
                userId: chosenUser.id,
                userName: chosenUser.name
            };
            
            transactions.unshift(newTrx);
            frm.reset(); 
            handleTypeChange();
            if (typeof closeAddTransactionSheet === 'function') closeAddTransactionSheet();

            saveToLocal(); 
            updateUI();

            if (typeof showToast === 'function') {
                showToast(`Transaksi <b>"${escapeHtml(desc)}"</b> dicatat untuk <b>${escapeHtml(chosenUser.name)}</b>!`, 'success', '💰');
            }

            await addTransactionToSheet(newTrx);
        });
    }
}

// Global Keyboard Listener
window.addEventListener('keydown', function(e) { 
    if (e.key === 'Escape') { 
        closeAllModals(); 
        if (typeof closeAddTransactionSheet === 'function') closeAddTransactionSheet();
    } 
});

// Window DOMContentLoaded Initialization
window.addEventListener('DOMContentLoaded', async () => {
    // 1. Inisialisasi Tema
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', currentTheme);
    const themeCheckbox = document.getElementById('theme-checkbox');
    const mobileThemeCheckbox = document.getElementById('mobile-theme-checkbox');
    if (themeCheckbox) {
        themeCheckbox.checked = (currentTheme === 'dark');
    }
    if (mobileThemeCheckbox) {
        mobileThemeCheckbox.checked = (currentTheme === 'dark');
    }

    // 2. Inisialisasi Reset Timer saat User Beraktivitas
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(eventName => { 
        document.addEventListener(eventName, resetIdleTimer, true); 
    });

    // 3. Inisialisasi Input Listener Form
    initInputListeners();

    // 4. Inisialisasi Google Auth
    initGoogleAuth();

    // 5. Cek Sesi Login yang Aktif
    if (sessionStorage.getItem('isLoggedIn') === 'true' && currentSessionKey) {
        const loginWrapper = document.getElementById('login-wrapper');
        const appContainer = document.getElementById('app-container');
        if (loginWrapper) loginWrapper.style.display = 'none';
        if (appContainer) appContainer.style.display = 'block';
        if (typeof switchMobileTab === 'function') switchMobileTab('home');
        
        updateHeaderGreeting();
        renderUserInterfaceWidgets();

        fetchAutoGoldPrice();
        await syncTransactionsFromSheet();
        
        resetIdleTimer();
    }
});

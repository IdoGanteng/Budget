// ================= INTERFACE, CHARTS & USER EXPERIENCES ================= //
let financeChart, comparisonChart, userComparisonChart;

// ================= THEME TOGGLE ================= //
function toggleTheme() {
    let theme = document.body.getAttribute('data-theme');
    if (theme === 'light') { 
        document.body.setAttribute('data-theme', 'dark'); 
        localStorage.setItem('theme', 'dark'); 
    } else { 
        document.body.setAttribute('data-theme', 'light'); 
        localStorage.setItem('theme', 'light'); 
    }
    setTimeout(updateUI, 50);
}

// ================= HEADER GREETING & DATE ================= //
function updateHeaderGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Halo';
    if (hour >= 5 && hour < 11) greeting = 'Selamat Pagi';
    else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang';
    else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore';
    else greeting = 'Selamat Malam';

    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = new Date().toLocaleDateString('id-ID', options);
    const activeUser = (typeof getActiveUser === 'function') ? getActiveUser() : { name: 'Rebel' };

    const greetingEls = document.querySelectorAll('.dynamic-greeting');
    const dateEls = document.querySelectorAll('.dynamic-date');
    
    greetingEls.forEach(el => el.innerHTML = `${greeting}, ${escapeHtml(activeUser.name)}! ✨`);
    dateEls.forEach(el => el.innerText = `📅 ${dateStr}`);
}

// ================= MODAL SYSTEM ================= //
function closeAllModals(e) {
    if (e) e.stopPropagation();
    document.querySelectorAll('.modal-overlay').forEach(modal => { 
        modal.classList.remove('active'); 
    });
}

function showModal(icon, title, desc, buttonsHtml) {
    const iconEl = document.getElementById('modal-icon-el');
    const titleEl = document.getElementById('modal-title');
    const descEl = document.getElementById('modal-desc');
    const actEl = document.getElementById('modal-actions-container');

    if (iconEl) iconEl.innerText = icon;
    if (titleEl) titleEl.innerText = title;
    if (descEl) descEl.innerHTML = desc;
    if (actEl) actEl.innerHTML = buttonsHtml;
    
    const customModal = document.getElementById('custom-modal');
    if (customModal) customModal.classList.add('active');
}

// ================= FLOATING TOAST SYSTEM ================= //
function showToast(message, type = 'info', icon = '✨') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-msg';

    let borderLeftColor = 'var(--primary)';
    if (type === 'success') borderLeftColor = 'var(--income)';
    else if (type === 'error') borderLeftColor = 'var(--expense)';
    else if (type === 'warning') borderLeftColor = 'var(--tring)';

    toast.style.borderLeft = `4px solid ${borderLeftColor}`;
    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-text">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('toast-hide');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3500);
}

// ================= CHARTS (CHARTS.JS) ================= //
function updateCharts(cash, simpanan, pribadi, tring, jago, totalInc, totalExp, userExpensesMap) {
    const c1 = document.getElementById('financeChart');
    const c2 = document.getElementById('comparisonChart');
    const c3 = document.getElementById('userExpenseChart');

    if (!c1 || !c2) return;

    const ctx1 = c1.getContext('2d'); 
    const ctx2 = c2.getContext('2d');
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const legendColor = isDark ? '#f8fafc' : '#0f172a';
    const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

    // Chart 1: Asset Allocation
    if (financeChart) financeChart.destroy(); 
    financeChart = new Chart(ctx1, { 
        type: 'doughnut', 
        data: { 
            labels: ['Kas', 'Simpanan', 'Pribadi', 'Tring', 'Jago'], 
            datasets: [{ 
                data: [cash > 0 ? cash : 0, simpanan, pribadi, tring, jago], 
                backgroundColor: ['#34d399', '#c084fc', '#38bdf8', '#fbbf24', '#fb923c'], 
                borderWidth: isDark ? 2 : 1, 
                borderColor: isDark ? '#1e293b' : '#ffffff',
                hoverOffset: 6 
            }] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            cutout: '68%',
            plugins: { 
                legend: { 
                    position: 'right', 
                    labels: { 
                        color: legendColor, 
                        font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 12 },
                        padding: 10,
                        boxWidth: 10,
                        usePointStyle: true
                    } 
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.label}: ${formatRp(context.raw || 0)}`;
                        }
                    }
                }
            } 
        } 
    });
    
    // Chart 2: Cash Flow In vs Out
    if (comparisonChart) comparisonChart.destroy();
    comparisonChart = new Chart(ctx2, { 
        type: 'bar', 
        data: { 
            labels: ['Arus Kas'], 
            datasets: [
                { label: 'Masuk', data: [totalInc], backgroundColor: '#34d399', borderRadius: 8, maxBarThickness: 40 }, 
                { label: 'Keluar', data: [totalExp], backgroundColor: '#fb7185', borderRadius: 8, maxBarThickness: 40 }
            ] 
        }, 
        options: { 
            responsive: true, 
            maintainAspectRatio: false, 
            scales: { 
                x: { 
                    grid: { display: false }, 
                    ticks: { color: legendColor, font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600' } } 
                }, 
                y: { 
                    grid: { color: gridCol }, 
                    ticks: { 
                        color: legendColor, 
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                        callback: function(value) {
                            if (value >= 1000000) return (value / 1000000).toFixed(1) + 'M';
                            if (value >= 1000) return (value / 1000).toFixed(0) + 'K';
                            return value;
                        }
                    } 
                } 
            }, 
            plugins: { 
                legend: { 
                    display: true,
                    position: 'top',
                    labels: {
                        color: legendColor, 
                        font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                        boxWidth: 10,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return ` ${context.dataset.label}: ${formatRp(context.raw)}`;
                        }
                    }
                }
            } 
        } 
    });

    // Chart 3: Multi-User Spending Comparison Chart
    if (c3 && userExpensesMap) {
        const ctx3 = c3.getContext('2d');
        const userNames = Object.keys(userExpensesMap);
        const userAmounts = Object.values(userExpensesMap);
        const userColors = ['#818cf8', '#f472b6', '#38bdf8', '#fbbf24', '#34d399', '#c084fc', '#fb923c'];

        if (userComparisonChart) userComparisonChart.destroy();
        userComparisonChart = new Chart(ctx3, {
            type: 'doughnut',
            data: {
                labels: userNames.length > 0 ? userNames : ['Belum Ada Pengeluaran'],
                datasets: [{
                    data: userAmounts.length > 0 ? userAmounts : [1],
                    backgroundColor: userAmounts.length > 0 ? userColors.slice(0, userNames.length) : ['rgba(148, 163, 184, 0.2)'],
                    borderWidth: isDark ? 2 : 1,
                    borderColor: isDark ? '#1e293b' : '#ffffff',
                    hoverOffset: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: legendColor,
                            font: { family: "'Plus Jakarta Sans', sans-serif", weight: '600', size: 11 },
                            boxWidth: 10,
                            padding: 8,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                if (userAmounts.length === 0) return ' Belum ada data';
                                return ` ${context.label}: ${formatRp(context.raw || 0)}`;
                            }
                        }
                    }
                }
            }
        });
    }
}

// ================= FINANCIAL ANALYSIS ================= //
function updateFinancialAnalysis(totalInc, totalExp) {
    const analysisEl = document.getElementById('financial-analysis-content');
    if (!analysisEl) return;

    if (totalInc === 0 && totalExp === 0) {
        analysisEl.innerHTML = `<p style="color: var(--text-gray);">Belum ada data transaksi yang cukup untuk dianalisa pada filter ini.</p>`;
        return;
    }

    const netCashflow = totalInc - totalExp;
    const savingsRate = totalInc > 0 ? Math.max(0, ((totalInc - totalExp) / totalInc) * 100) : 0;
    let statusBadge = netCashflow >= 0 
        ? `<span style="color: var(--income); font-weight: 800;">🟢 SURPLUS (Sehat)</span>` 
        : `<span style="color: var(--expense); font-weight: 800;">🔴 DEFISIT (Perlu Evaluasi)</span>`;
    let advice = netCashflow >= 0 
        ? `Arus kas positif! Pertahankan kedisiplinan pencatatan keuangan dan pertimbangkan alokasi ke simpanan atau aset emas.` 
        : `Pengeluaran melebihi pemasukan pada filter ini. Tinjau kembali pos pengeluaran dan minimalkan pengeluaran tersier.`;

    analysisEl.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <span style="color: var(--text-gray); font-weight: 600;">Status Arus Kas:</span>
            <span>${statusBadge}</span>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">
            <span style="color: var(--text-gray); font-weight: 600;">Rasio Sisa / Tabungan:</span>
            <span style="font-weight: 800; color: var(--primary);">${savingsRate.toFixed(1)}% dari pemasukan</span>
        </div>
        <div style="margin-top: 8px;">
            <strong style="display: block; margin-bottom: 4px; color: var(--text-dark); font-size: 15px;">💡 Rekomendasi Finansial:</strong>
            <p style="color: var(--text-gray); line-height: 1.6;">${advice}</p>
        </div>
    `;
}

// ================= RENDER MULTI-USER SPENDING CARDS ================= //
function renderUserSpendingBreakdown(userExpensesMap, userCountsMap) {
    const container = document.getElementById('user-spending-container');
    if (!container) return;

    const users = (typeof getUsersList === 'function') ? getUsersList() : [];
    const entries = Object.keys(userExpensesMap);

    if (entries.length === 0) {
        container.innerHTML = `<div style="color: var(--text-gray); font-size: 13px; text-align: center; width: 100%; padding: 14px;">Belum ada data pengeluaran antar pengguna pada filter ini.</div>`;
        return;
    }

    container.innerHTML = '';
    entries.forEach(name => {
        const uObj = users.find(u => u.name === name) || { avatar: '👤', color: 'var(--primary)' };
        const amount = userExpensesMap[name] || 0;
        const count = userCountsMap[name] || 0;

        const card = document.createElement('div');
        card.className = 'user-spending-card';

        let avHtml = uObj.picture 
            ? `<div class="user-chip-avatar" style="width:32px;height:32px;"><img src="${escapeHtml(uObj.picture)}"></div>` 
            : `<div class="user-chip-avatar" style="width:32px;height:32px;background:${uObj.color || 'var(--primary)'};color:white;font-size:15px;">${uObj.avatar || '👤'}</div>`;

        card.innerHTML = `
            ${avHtml}
            <div class="user-spending-info">
                <div class="user-spending-name">${escapeHtml(name)}</div>
                <div class="user-spending-amount">${formatRp(amount)}</div>
                <div class="user-spending-count">${count} kali pengeluaran</div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ================= UPDATE UI MAIN ================= //
function updateUI() {
    const containerEl = document.getElementById('list'); 
    if (containerEl) containerEl.innerHTML = ''; 
    
    const monthSelect = document.getElementById('filter-month-select');
    const userSelect = document.getElementById('filter-user-select');

    const selectedMonth = monthSelect ? monthSelect.value : 'all';
    const selectedUser = userSelect ? userSelect.value : 'all';
    
    // Kumpulkan opsi bulan dari riwayat transaksi
    let monthsSet = new Set();
    transactions.forEach(trx => {
        let cleanD = cleanDateStr(trx.date);
        if (cleanD && cleanD.includes('/')) {
            let parts = cleanD.split('/');
            if (parts.length === 3) monthsSet.add(parts[1] + '/' + parts[2]);
        }
    });

    if (monthSelect) {
        let currentVal = monthSelect.value;
        monthSelect.innerHTML = '<option value="all">Semua Bulan</option>';
        Array.from(monthsSet).sort().forEach(m => {
            let opt = document.createElement('option');
            opt.value = m;
            opt.innerText = m;
            monthSelect.appendChild(opt);
        });
        monthSelect.value = currentVal;
    }

    let totalIncAll = 0, totalExpAll = 0, totalSimAll = 0, totalPriAll = 0, totalTrgAll = 0, totalJagAll = 0;
    let filteredInc = 0, filteredExp = 0;
    let userExpensesMap = {};
    let userCountsMap = {};

    let sortedTrx = [...transactions].sort((a, b) => parseDateToTime(b.date) - parseDateToTime(a.date));
    let groupedByDate = {};

    sortedTrx.forEach((trx) => {
        const amt = Number(trx.amount);
        let cleanD = cleanDateStr(trx.date);
        
        // Cek filter bulan
        let isMonthMatch = true;
        if (selectedMonth !== 'all' && cleanD) {
            let parts = cleanD.split('/');
            if (parts.length === 3 && (parts[1] + '/' + parts[2]) !== selectedMonth) isMonthMatch = false;
        }

        // Cek filter user
        let isUserMatch = true;
        if (selectedUser !== 'all') {
            if (trx.userId && trx.userId !== selectedUser) isUserMatch = false;
            else if (!trx.userId && selectedUser !== 'user_rebel') isUserMatch = false;
        }

        // Hitung total keseluruhan (Global Vault Total)
        if (trx.type === 'income') totalIncAll += amt; 
        else if (trx.type === 'expense') totalExpAll += amt; 
        else if (trx.type === 'simpanan') totalSimAll += amt; 
        else if (trx.type === 'pribadi') totalPriAll += amt; 
        else if (trx.type === 'tring' || trx.type === 'inv_tring') totalTrgAll += amt; 
        else if (trx.type === 'jago' || trx.type === 'inv_jago') { totalJagAll += amt; totalExpAll += amt; } 
        else if (trx.type === 'withdraw') {
            const src = trx.source || 'pribadi';
            if (src === 'simpanan') totalSimAll -= amt;
            else if (src === 'pribadi') totalPriAll -= amt;
            else if (src === 'tring') totalTrgAll -= amt;
            else if (src === 'jago') totalJagAll -= amt;
            totalIncAll += amt; 
        }

        // Hitung total untuk filter yang sedang aktif
        if (isMonthMatch && isUserMatch) {
            if (trx.type === 'income' || trx.type === 'withdraw') filteredInc += amt;
            if (trx.type === 'expense' || trx.type === 'jago' || trx.type === 'inv_jago') filteredExp += amt;
        }

        // Multi-User Analytics (Kompilasi pengeluaran per user pada filter bulan ini)
        if (isMonthMatch && (trx.type === 'expense' || trx.type === 'jago' || trx.type === 'inv_jago')) {
            const uName = trx.userName || 'Rebel';
            userExpensesMap[uName] = (userExpensesMap[uName] || 0) + amt;
            userCountsMap[uName] = (userCountsMap[uName] || 0) + 1;
        }

        if (!isMonthMatch || !isUserMatch || !containerEl) return;
        if (!groupedByDate[cleanD]) groupedByDate[cleanD] = [];
        groupedByDate[cleanD].push(trx);
    });

    // Render list transaksi dengan badge nama/avatar pengguna
    if (containerEl) {
        const dates = Object.keys(groupedByDate);
        if (dates.length === 0) {
            containerEl.innerHTML = `<div style="text-align:center; padding: 24px 12px; color:var(--text-gray); font-size:13px;">Belum ada catatan transaksi pada filter ini.</div>`;
        } else {
            dates.forEach(dateKey => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'history-date-group';
                const headerEl = document.createElement('div');
                headerEl.className = 'history-date-header';
                headerEl.innerHTML = `📅 ${escapeHtml(dateKey)}`;
                groupDiv.appendChild(headerEl);

                const ul = document.createElement('ul');
                ul.className = 'history-list';

                groupedByDate[dateKey].forEach(trx => {
                    const amt = Number(trx.amount);
                    const li = document.createElement('li');
                    let tCls = '', dAmt = '';
                    let typeIcon = '💳';
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
                        typeIcon = '👤'; 
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
                        dAmt = (trx.source === 'tring' ? '+' + amt.toFixed(2) + ' Gr' : '+' + formatRp(amt)); 
                        typeIcon = '🏧'; 
                        typeBg = 'var(--pribadi-light)'; 
                        typeColor = 'var(--pribadi)'; 
                    }
                    
                    const userLabel = trx.userName ? escapeHtml(trx.userName) : 'Rebel';

                    li.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0;">
                            <div style="width: 36px; height: 36px; border-radius: 10px; background: ${typeBg}; color: ${typeColor}; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0;">
                                ${typeIcon}
                            </div>
                            <div class="history-item-left">
                                <strong style="font-size:14px; color:var(--text-dark); display:block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(trx.desc)}</strong>
                                <div style="display:flex; align-items:center; gap:6px; margin-top:2px; flex-wrap:wrap;">
                                    <span style="font-size:11px; color:var(--text-gray); text-transform:capitalize;">${escapeHtml(trx.type)} ${trx.source ? '('+escapeHtml(trx.source)+')' : ''}</span>
                                    <span class="user-tag-badge">👤 ${userLabel}</span>
                                </div>
                            </div>
                        </div>
                        <div class="history-item-right">
                            <span class="${tCls}" style="font-weight:800; font-size:14px;">${dAmt}</span>
                            <button onclick="editTransaction('${escapeHtml(String(trx.id))}')" title="Edit" class="icon-btn edit-btn">✏️</button>
                            <button onclick="deleteTransaction('${escapeHtml(String(trx.id))}')" title="Hapus" class="icon-btn delete-btn">🗑️</button>
                        </div>`;
                    ul.appendChild(li);
                });
                groupDiv.appendChild(ul);
                containerEl.appendChild(groupDiv);
            });
        }
    }

    const trgRp = totalTrgAll * goldPricePerGram; 
    const cash = totalIncAll - totalExpAll; 
    const total = cash + totalSimAll + totalPriAll + trgRp + totalJagAll; 
    const gold = trgRp + totalJagAll;

    const cashEl = document.getElementById('cash-balance');
    const simEl = document.getElementById('total-simpanan');
    const priEl = document.getElementById('total-pribadi');
    const trgEl = document.getElementById('total-tring');
    const trgGrEl = document.getElementById('tring-gram-info');
    const jagEl = document.getElementById('total-jago');
    const wEl = document.getElementById('total-wealth');

    if (cashEl) cashEl.innerText = formatRp(cash); 
    if (simEl) simEl.innerText = formatRp(totalSimAll); 
    if (priEl) priEl.innerText = formatRp(totalPriAll); 
    if (trgEl) trgEl.innerText = formatRp(trgRp); 
    if (trgGrEl) trgGrEl.innerText = `${totalTrgAll.toFixed(2)} Gr`; 
    if (jagEl) jagEl.innerText = formatRp(totalJagAll); 
    if (wEl) wEl.innerText = formatRp(total);

    // Progress Target 2026
    const wBar = document.getElementById('wealth-progress-bar');
    const wTxt = document.getElementById('wealth-progress-text');
    const gBar = document.getElementById('gold-progress-bar');
    const gTxt = document.getElementById('gold-progress-text');

    if (wBar) wBar.style.width = Math.min((total / financialGoals.wealthGoal) * 100, 100) + '%'; 
    if (wTxt) wTxt.innerText = Math.min((total / financialGoals.wealthGoal) * 100, 100).toFixed(1) + '%';
    if (gBar) gBar.style.width = Math.min((gold / financialGoals.goldGoal) * 100, 100) + '%'; 
    if (gTxt) gTxt.innerText = Math.min((gold / financialGoals.goldGoal) * 100, 100).toFixed(1) + '%';
    
    // Snapshots trend
    if (typeof checkAndUpdateSnapshots === 'function') {
        checkAndUpdateSnapshots(cash, totalSimAll, totalPriAll, trgRp, totalJagAll);
    }

    // Charts & Multi-User Analytics
    updateCharts(cash, totalSimAll, totalPriAll, trgRp, totalJagAll, filteredInc, filteredExp, userExpensesMap);
    updateFinancialAnalysis(filteredInc, filteredExp);
    renderUserSpendingBreakdown(userExpensesMap, userCountsMap);
}

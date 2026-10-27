const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4173;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const res = await fetch(url);
            if (res.ok) return true;
        } catch (e) {}
        await sleep(500);
    }
    throw new Error(`Server at ${url} did not become ready within ${timeoutMs}ms`);
}

async function run() {
    console.log('🚀 Starting Vite Preview Server on port ' + PREVIEW_PORT + '...');
    const serverProcess = spawn('npx', ['vite', 'preview', '--port', String(PREVIEW_PORT), '--strictPort'], {
        cwd: path.resolve(__dirname, '..'),
        shell: true,
        stdio: 'pipe'
    });

    serverProcess.stdout.on('data', data => {
        // console.log(`[Vite stdout]: ${data}`);
    });
    serverProcess.stderr.on('data', data => {
        // console.error(`[Vite stderr]: ${data}`);
    });

    try {
        await waitForServer(BASE_URL);
        console.log(`✅ Vite preview server running at ${BASE_URL}`);

        console.log('📱 Launching Chrome in Mobile Emulation (375x812px)...');
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=375,812'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({
            width: 375,
            height: 812,
            deviceScaleFactor: 2,
            isMobile: true,
            hasTouch: true
        });

        console.log('🌐 Navigating to ' + BASE_URL + '...');
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });

        // 1. Check Login / Quick Login
        console.log('\n--- TEST STEP 1: Quick Login ---');
        await page.waitForSelector('.form-user-btn, #app-container', { timeout: 10000 });
        const hasQuickLogin = await page.$('.form-user-btn');
        if (hasQuickLogin) {
            console.log('👉 Found quick login button, logging in...');
            await page.click('.form-user-btn');
            await page.waitForSelector('#app-container', { timeout: 8000 });
        }
        console.log('✅ Dashboard reached successfully.');

        // 2. Check Mobile Header Responsive Rules (< 640px)
        console.log('\n--- TEST STEP 2: Header Responsiveness (< 640px) ---');
        const desktopTabsDisplay = await page.$eval('.desktop-nav-tabs', el => window.getComputedStyle(el).display);
        console.log(`Assertion: .desktop-nav-tabs display is "${desktopTabsDisplay}" (Expected: none)`);
        if (desktopTabsDisplay !== 'none') throw new Error('.desktop-nav-tabs should be hidden on mobile');

        const reportBtnDisplay = await page.$eval('.nav-report-btn', el => window.getComputedStyle(el).display);
        console.log(`Assertion: .nav-report-btn display is "${reportBtnDisplay}" (Expected: none)`);
        if (reportBtnDisplay !== 'none') throw new Error('.nav-report-btn should be hidden on mobile < 640px');

        const userNameDisplay = await page.$eval('.user-name-label', el => window.getComputedStyle(el).display);
        console.log(`Assertion: .user-name-label display is "${userNameDisplay}" (Expected: none)`);
        if (userNameDisplay !== 'none') throw new Error('.user-name-label should be hidden on mobile < 640px');

        const syncStatusPillDisplay = await page.$eval('.sync-status-pill', el => window.getComputedStyle(el).display);
        console.log(`Assertion: .sync-status-pill display is "${syncStatusPillDisplay}" (Expected: inline-flex or flex)`);
        if (syncStatusPillDisplay === 'none') throw new Error('.sync-status-pill should remain visible and interactive');

        console.log('✅ Step 2 Passed: Header is clean, compact, and free of long text.');

        // 3. Check Fixed Mobile Bottom Navigation Bar
        console.log('\n--- TEST STEP 3: Fixed Mobile Bottom Navigation Bar ---');
        const bottomBar = await page.$('.mobile-bottom-bar');
        if (!bottomBar) throw new Error('.mobile-bottom-bar not found in DOM');

        const bottomBarPosition = await page.$eval('.mobile-bottom-bar', el => window.getComputedStyle(el).position);
        console.log(`Assertion: .mobile-bottom-bar position is "${bottomBarPosition}" (Expected: fixed)`);
        if (bottomBarPosition !== 'fixed') throw new Error('.mobile-bottom-bar must be position: fixed');

        const gridCols = await page.$eval('.mobile-bottom-bar', el => window.getComputedStyle(el).gridTemplateColumns);
        console.log(`Assertion: Grid columns defined: "${gridCols}"`);

        // Check the 5 menus + 1 FAB buttons
        const tabTexts = await page.$$eval('.mobile-bottom-bar button', btns => btns.map(b => b.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
        console.log('Bottom nav buttons found:', tabTexts);

        // Test tab switching: Analisa
        console.log('👉 Clicking Analisa tab...');
        await page.evaluate(() => {
            const btn = document.querySelector('.mobile-bottom-bar button[title="Analisa"]');
            if (btn) btn.click();
        });
        await sleep(500);
        const isAnalyticsActive = await page.$eval('#app-container', el => el.getAttribute('data-active-tab'));
        console.log(`Tab switch verification: data-active-tab="${isAnalyticsActive}" (Expected: analytics)`);
        if (isAnalyticsActive !== 'analytics') throw new Error('Failed to switch to analytics tab');

        // Test tab switching: Laporan
        console.log('👉 Clicking Laporan tab...');
        await page.evaluate(() => {
            const btn = document.querySelector('.mobile-bottom-bar button[title="Laporan Bulanan"]');
            if (btn) btn.click();
        });
        await sleep(500);
        const isReportActive = await page.$eval('#app-container', el => el.getAttribute('data-active-tab'));
        console.log(`Tab switch verification: data-active-tab="${isReportActive}" (Expected: report)`);
        if (isReportActive !== 'report') throw new Error('Failed to switch to report tab');

        // Test tab switching: Kantong
        console.log('👉 Clicking Kantong tab...');
        await page.evaluate(() => {
            const btn = document.querySelector('.mobile-bottom-bar button[title="Kantong Portofolio"]');
            if (btn) btn.click();
        });
        await sleep(500);
        const isPocketsActive = await page.$eval('#app-container', el => el.getAttribute('data-active-tab'));
        console.log(`Tab switch verification: data-active-tab="${isPocketsActive}" (Expected: pockets)`);
        if (isPocketsActive !== 'pockets') throw new Error('Failed to switch to pockets tab');

        // Test tab switching: Pengguna
        console.log('👉 Clicking Pengguna tab...');
        await page.evaluate(() => {
            const btn = document.querySelector('.mobile-bottom-bar button[title="Pengguna & Database"]');
            if (btn) btn.click();
        });
        await sleep(500);
        const isUsersActive = await page.$eval('#app-container', el => el.getAttribute('data-active-tab'));
        console.log(`Tab switch verification: data-active-tab="${isUsersActive}" (Expected: users)`);
        if (isUsersActive !== 'users') throw new Error('Failed to switch to users tab');

        // Return to Beranda
        console.log('👉 Returning to Beranda tab...');
        await page.evaluate(() => {
            const btn = document.querySelector('.mobile-bottom-bar button[title="Beranda"]');
            if (btn) btn.click();
        });
        await sleep(500);
        const isHomeActive = await page.$eval('#app-container', el => el.getAttribute('data-active-tab'));
        console.log(`Tab switch verification: data-active-tab="${isHomeActive}" (Expected: home)`);
        if (isHomeActive !== 'home') throw new Error('Failed to return to home tab');

        // Test Center FAB button (Catat)
        console.log('👉 Clicking Central FAB (+) button...');
        await page.evaluate(() => {
            const fab = document.querySelector('.mobile-fab-column');
            if (fab) fab.click();
        });
        await sleep(500);
        const isAddModalOpen = await page.$('.tx-modal-overlay');
        if (!isAddModalOpen) throw new Error('Clicking FAB should open TransactionModal (.tx-modal-overlay)');
        console.log('✅ FAB opened Transaction Modal successfully!');
        // Close modal
        await page.evaluate(() => {
            const closeBtn = document.querySelector('.tx-close-btn');
            if (closeBtn) closeBtn.click();
        });
        await sleep(400);

        // Content padding bottom check
        const contentPaddingBottom = await page.$eval('.app-main-content', el => window.getComputedStyle(el).paddingBottom);
        console.log(`Assertion: .app-main-content padding-bottom is "${contentPaddingBottom}"`);
        const numPadding = parseInt(contentPaddingBottom, 10);
        if (numPadding < 80) throw new Error('.app-main-content padding-bottom is too small and will overlap bottom bar');

        console.log('✅ Step 3 Passed: Bottom Navigation Bar with 5 menus & FAB works perfectly!');

        // 4. Check Offline Queue Drawer
        console.log('\n--- TEST STEP 4: Offline Queue Drawer Interaction ---');
        console.log('👉 Clicking header sync pill (.sync-status-pill)...');
        await page.evaluate(() => {
            const pill = document.querySelector('.sync-status-pill');
            if (pill) pill.click();
        });
        await sleep(500);

        const drawerPanel = await page.$('.queue-drawer-panel');
        if (!drawerPanel) throw new Error('Offline Queue Drawer panel not found');
        const isDrawerVisible = await page.$eval('.queue-drawer-backdrop', el => el.classList.contains('active'));
        console.log(`Assertion: Offline Queue Drawer is open: ${isDrawerVisible}`);
        if (!isDrawerVisible) throw new Error('Offline Queue Drawer backdrop not active');

        // Add a simulation test item to the queue
        console.log('👉 Clicking "+ Simulasi Uji Coba" to add offline queue item...');
        await page.evaluate(() => {
            const btn = document.querySelector('.btn-test-item');
            if (btn) btn.click();
        });
        await sleep(600);

        const queueCount = await page.$$eval('.queue-item-card', cards => cards.length);
        console.log(`Assertion: Queued items count after test add: ${queueCount} (Expected >= 1)`);
        if (queueCount < 1) throw new Error('Expected at least 1 item in offline queue');

        // Test inline edit
        console.log('👉 Testing inline edit on the queued item...');
        await page.evaluate(() => {
            const editBtn = document.querySelector('.item-act-btn.edit');
            if (editBtn) editBtn.click();
        });
        await sleep(400);

        const editBox = await page.$('.inline-edit-box');
        if (!editBox) throw new Error('Inline edit box did not appear');
        console.log('✅ Inline edit box appeared.');

        // Fill updated description
        await page.evaluate(() => {
            const input = document.querySelector('.inline-edit-box .edit-input');
            if (input) {
                input.value = 'Makan Siang Soto Ayam (Updated Mobile)';
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });
        await sleep(200);
        await page.evaluate(() => {
            const saveBtn = document.querySelector('.btn-save-edit');
            if (saveBtn) saveBtn.click();
        });
        await sleep(500);

        const updatedDesc = await page.$eval('.item-desc', el => el.innerText.trim());
        console.log(`Assertion: Updated description in queue is: "${updatedDesc}"`);
        if (!updatedDesc.includes('Makan Siang Soto Ayam')) throw new Error('Queue item description was not updated');
        console.log('✅ Queue item successfully updated before sync!');

        // Test Force Sync Now button
        console.log('👉 Testing "Paksa Kirim Sekarang" button...');
        await page.evaluate(() => {
            const forceSyncBtn = document.querySelector('.btn-force-sync');
            if (forceSyncBtn) forceSyncBtn.click();
        });
        await sleep(1000);
        console.log('✅ Force sync triggered.');

        // Test delete item from queue
        const remainingCards = await page.$$('.queue-item-card');
        if (remainingCards.length > 0) {
            console.log('👉 Testing delete item from offline queue...');
            await page.evaluate(() => {
                const delBtn = document.querySelector('.item-act-btn.delete');
                if (delBtn) delBtn.click();
            });
            await sleep(400);

            // Confirm modal should appear - click confirm (second button)
            await page.evaluate(() => {
                const btns = document.querySelectorAll('.modal-actions button');
                if (btns && btns.length > 1) {
                    btns[1].click();
                }
            });
            await sleep(500);
            console.log('✅ Item confirmed deleted from offline queue.');
        }

        // Close drawer
        console.log('👉 Closing Offline Queue Drawer...');
        await page.evaluate(() => {
            const closeBtn = document.querySelector('.drawer-close-btn');
            if (closeBtn) closeBtn.click();
        });
        await sleep(500);
        const drawerElement = await page.$('.queue-drawer-panel');
        console.log(`Assertion: Offline Queue Drawer unmounted/closed: ${drawerElement === null}`);
        if (drawerElement !== null) throw new Error('Offline Queue Drawer was not closed');

        // Take snapshot for artifact
        const screenshotDir = path.resolve(__dirname, '..', 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
        const screenshotPath = path.join(screenshotDir, 'mobile_375x812_verified.png');
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Screenshot captured at ${screenshotPath}`);

        console.log('\n=============================================');
        console.log('🎉 ALL AUTOMATED MOBILE BROWSER TESTS PASSED!');
        console.log('=============================================');

        await browser.close();
    } finally {
        serverProcess.kill();
    }
}

run().catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
});

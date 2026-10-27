const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PREVIEW_PORT = 4174;
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

    try {
        await waitForServer(BASE_URL);
        console.log(`✅ Vite preview server running at ${BASE_URL}`);

        console.log('🌐 Launching Chrome...');
        const browser = await puppeteer.launch({
            executablePath: CHROME_PATH,
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--window-size=1280,900'
            ]
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 900 });

        // Ensure screenshots directory exists
        const screenshotsDir = path.resolve(__dirname, '../screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        // Navigate to app
        await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
        await sleep(1500);

        // Handle initial login screen if present
        await page.waitForSelector('.form-user-btn, #app-container', { timeout: 12000 });
        const quickLoginBtn = await page.$('.form-user-btn');
        if (quickLoginBtn) {
            console.log('Logging in via quick user button...');
            await page.click('.form-user-btn');
            await page.waitForSelector('#app-container', { timeout: 8000 });
        }
        console.log('✅ Dashboard loaded.');

        // Wait for recurring checker popup if triggered and dismiss it
        await sleep(1500);
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('.modal-actions button'));
            const cancelBtn = btns.find(b => b.textContent.includes('Nanti Saja') || b.textContent.includes('Batal'));
            if (cancelBtn) cancelBtn.click();
        });
        await sleep(500);

        console.log('---------------------------------------------------------');
        console.log('TEST 1: Verify Initial Recurring Bills in Widget & Modal');
        console.log('---------------------------------------------------------');

        // Check widget on Home
        await page.waitForSelector('.bill-reminder-widget', { timeout: 10000 });
        const initialCards = await page.$$('.upcoming-bill-card');
        console.log(`Found ${initialCards.length} upcoming bill cards in widget on Home.`);

        // Open modal
        await page.evaluate(() => {
            const btn = document.querySelector('.btn-open-schedule');
            if (btn) btn.click();
        });
        await sleep(800);

        // Verify modal opened
        await page.waitForSelector('.recurring-modal-box', { timeout: 5000 });
        console.log('✅ Recurring modal opened successfully.');

        // Switch to "Semua" tab in modal
        const allTabBtn = await page.evaluateHandle(() => {
            const tabs = Array.from(document.querySelectorAll('.tab-pill'));
            return tabs.find(t => t.textContent.includes('Semua'));
        });
        if (allTabBtn && allTabBtn.click) {
            await allTabBtn.click();
            await sleep(400);
        }

        const modalItems = await page.$$eval('.recurring-item-card', cards => {
            return cards.map(c => {
                const title = c.querySelector('.bill-title')?.textContent?.trim();
                const amt = c.querySelector('.bill-amount')?.textContent?.trim();
                return { title, amt };
            });
        });
        console.log(`Found ${modalItems.length} items in modal "Semua" tab:`, modalItems.map(m => m.title));

        if (modalItems.length < 5) {
            throw new Error(`Expected at least 5 default items, found ${modalItems.length}`);
        }

        console.log('---------------------------------------------------------');
        console.log('TEST 2: Delete "Tagihan Listrik PLN" & "Spotify Family Plan"');
        console.log('---------------------------------------------------------');

        // Delete "Tagihan Listrik PLN"
        const deletedPLN = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.recurring-item-card'));
            const card = cards.find(c => c.querySelector('.bill-title')?.textContent?.includes('Tagihan Listrik PLN'));
            if (!card) return false;
            const delBtn = card.querySelector('.btn-icon-del');
            if (delBtn) {
                delBtn.click();
                return true;
            }
            return false;
        });
        console.log(`Clicked delete for Tagihan Listrik PLN: ${deletedPLN}`);
        await sleep(600);

        // Delete "Spotify Family Plan"
        const deletedSpotify = await page.evaluate(() => {
            const cards = Array.from(document.querySelectorAll('.recurring-item-card'));
            const card = cards.find(c => c.querySelector('.bill-title')?.textContent?.includes('Spotify Family Plan'));
            if (!card) return false;
            const delBtn = card.querySelector('.btn-icon-del');
            if (delBtn) {
                delBtn.click();
                return true;
            }
            return false;
        });
        console.log(`Clicked delete for Spotify Family Plan: ${deletedSpotify}`);
        await sleep(800);

        // Check remaining items in modal
        const remainingInModal = await page.$$eval('.recurring-item-card .bill-title', els => els.map(e => e.textContent.trim()));
        console.log('Remaining in modal:', remainingInModal);

        if (remainingInModal.some(t => t.includes('Tagihan Listrik PLN') || t.includes('Spotify Family Plan'))) {
            throw new Error('FAILED: Tagihan Listrik PLN or Spotify Family Plan is still in modal!');
        }
        console.log(`✅ Items successfully removed from modal. Remaining count: ${remainingInModal.length}`);

        // Close modal
        await page.evaluate(() => {
            const btn = document.querySelector('.modal-close-icon-btn');
            if (btn) btn.click();
        });
        await sleep(500);

        // Check Home dashboard widget
        const homeCardsAfterDelete = await page.$$eval('.upcoming-bill-card .card-bill-title', els => els.map(e => e.textContent.trim()));
        console.log('Home widget cards after delete:', homeCardsAfterDelete);
        if (homeCardsAfterDelete.some(t => t.includes('Tagihan Listrik PLN') || t.includes('Spotify Family Plan'))) {
            throw new Error('FAILED: Deleted items still appear on Home widget!');
        }
        console.log('✅ Home widget accurately reflects deletion.');

        // Take screenshot
        await page.screenshot({ path: path.join(screenshotsDir, 'recurring_deleted_2_items.png'), fullPage: false });
        console.log('📸 Screenshot saved: recurring_deleted_2_items.png');

        console.log('---------------------------------------------------------');
        console.log('TEST 3: Page Reload / F5 Persistence Verification');
        console.log('---------------------------------------------------------');
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(1500);

        const homeCardsAfterReload = await page.$$eval('.upcoming-bill-card .card-bill-title', els => els.map(e => e.textContent.trim()));
        console.log('Home widget cards after reload:', homeCardsAfterReload);
        if (homeCardsAfterReload.some(t => t.includes('Tagihan Listrik PLN') || t.includes('Spotify Family Plan'))) {
            throw new Error('FAILED: Deleted items resurrected after reload (F5)!');
        }

        // Open modal again to check all items
        await page.evaluate(() => {
            const btn = document.querySelector('.btn-open-schedule');
            if (btn) btn.click();
        });
        await sleep(600);

        const modalAfterReload = await page.$$eval('.recurring-item-card .bill-title', els => els.map(e => e.textContent.trim()));
        console.log('Modal items after reload:', modalAfterReload);
        if (modalAfterReload.some(t => t.includes('Tagihan Listrik PLN') || t.includes('Spotify Family Plan'))) {
            throw new Error('FAILED: Deleted items resurrected in modal after reload!');
        }
        console.log('✅ PASS: Deletions completely persisted across page reload!');
        await page.evaluate(() => {
            const btn = document.querySelector('.modal-close-icon-btn');
            if (btn) btn.click();
        });
        await sleep(500);

        console.log('---------------------------------------------------------');
        console.log('TEST 4: Offline Sync Button Simulation');
        console.log('---------------------------------------------------------');
        // Switch to Pengguna tab to click "Sinkronkan Sekarang"
        await page.evaluate(() => {
            const userBtn = document.querySelector('.nav-user-switcher');
            if (userBtn) userBtn.click();
        });
        await sleep(800);

        // Click "Sinkronkan Sekarang"
        const clickedSync = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const syncBtn = btns.find(b => b.textContent.includes('Sinkronkan Sekarang'));
            if (syncBtn) {
                syncBtn.click();
                return true;
            }
            return false;
        });
        console.log(`Clicked "Sinkronkan Sekarang": ${clickedSync}`);
        await sleep(1500);

        // Return to Beranda
        await page.evaluate(() => {
            const homeTab = Array.from(document.querySelectorAll('.tab-btn, .mobile-tab-btn')).find(b => b.textContent.includes('Beranda'));
            if (homeTab) homeTab.click();
        });
        await sleep(800);

        // Verify deleted items STILL do not reappear after sync
        const homeCardsAfterSync = await page.$$eval('.upcoming-bill-card .card-bill-title', els => els.map(e => e.textContent.trim()));
        console.log('Home cards after sync:', homeCardsAfterSync);
        if (homeCardsAfterSync.some(t => t.includes('Tagihan Listrik PLN') || t.includes('Spotify Family Plan'))) {
            throw new Error('FAILED: Deleted items resurrected after offline sync!');
        }
        console.log('✅ PASS: Deleted items did NOT reappear after Offline Sync!');

        console.log('---------------------------------------------------------');
        console.log('TEST 5: Delete All Remaining Items -> Verify Clean Empty State');
        console.log('---------------------------------------------------------');
        await page.evaluate(() => {
            const btn = document.querySelector('.btn-open-schedule');
            if (btn) btn.click();
        });
        await sleep(600);

        // Delete all remaining cards in modal
        let attempts = 0;
        while (attempts < 10) {
            attempts++;
            const deleted = await page.evaluate(() => {
                const delBtn = document.querySelector('.recurring-item-card .btn-icon-del');
                if (delBtn) {
                    delBtn.click();
                    return true;
                }
                return false;
            });
            if (!deleted) break;
            await sleep(400);
        }

        // Verify empty state in modal
        const emptyStateTitle = await page.$eval('.empty-state .empty-title', el => el.textContent.trim());
        console.log('Modal empty state title:', emptyStateTitle);
        if (!emptyStateTitle.includes('Belum ada')) {
            throw new Error(`Unexpected empty state title: ${emptyStateTitle}`);
        }
        console.log('✅ Modal displays clean empty state.');

        // Close modal and check Home widget
        await page.evaluate(() => {
            const btn = document.querySelector('.modal-close-icon-btn');
            if (btn) btn.click();
        });
        await sleep(600);

        const widgetSub = await page.$eval('.bill-reminder-widget .widget-sub', el => el.textContent.trim());
        console.log('Widget sub after deleting all bills:', widgetSub);
        if (!widgetSub.includes('Belum ada')) {
            throw new Error(`Widget sub did not indicate 0 bills: ${widgetSub}`);
        }

        const allClearTitle = await page.$eval('.all-clear-text strong', el => el.textContent.trim());
        console.log('Widget empty state box text:', allClearTitle);
        if (!allClearTitle.includes('Belum ada')) {
            throw new Error(`Widget empty state box unexpected: ${allClearTitle}`);
        }
        console.log('✅ Widget displays clean empty state without resurrecting default bills.');

        // Reload page again with 0 bills
        console.log('Reloading page with 0 bills...');
        await page.reload({ waitUntil: 'networkidle2' });
        await sleep(1500);

        const widgetSubAfterReload0 = await page.$eval('.bill-reminder-widget .widget-sub', el => el.textContent.trim());
        console.log('Widget sub after reload with 0 bills:', widgetSubAfterReload0);
        if (!widgetSubAfterReload0.includes('Belum ada')) {
            throw new Error(`Bills resurrected on reload when 0 bills remained!`);
        }
        console.log('✅ PASS: 0 bills persisted permanently across reload!');

        // Take final screenshot
        await page.screenshot({ path: path.join(screenshotsDir, 'recurring_empty_state_persisted.png'), fullPage: false });
        console.log('📸 Screenshot saved: recurring_empty_state_persisted.png');

        await browser.close();
        console.log('=========================================================');
        console.log('🎉 ALL RECURRING BILL DELETION & PERSISTENCE TESTS PASSED!');
        console.log('=========================================================');

    } catch (err) {
        console.error('❌ TEST FAILED:', err);
        process.exitCode = 1;
    } finally {
        serverProcess.kill('SIGTERM');
        process.exit();
    }
}

run();

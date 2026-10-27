<script>
    import { onMount } from 'svelte';
    import { activeTab } from './lib/stores/uiStore.js';
    import { isLoggedIn } from './lib/stores/authStore.js';
    import { fetchLiveGoldPrice, syncTransactionsFromSheet } from './lib/stores/financeStore.js';

    // Components
    import LoginScreen from './lib/components/LoginScreen.svelte';
    import Navbar from './lib/components/Navbar.svelte';
    import HeroBalanceCard from './lib/components/HeroBalanceCard.svelte';
    import CategoryBudgetCard from './lib/components/CategoryBudgetCard.svelte';
    import BillReminderWidget from './lib/components/BillReminderWidget.svelte';
    import DebtSummaryCard from './lib/components/DebtSummaryCard.svelte';
    import PocketsGrid from './lib/components/PocketsGrid.svelte';
    import TransactionHistory from './lib/components/TransactionHistory.svelte';
    import AnalyticsView from './lib/components/AnalyticsView.svelte';
    import MonthlyReportView from './lib/components/MonthlyReportView.svelte';
    import UsersSettingsView from './lib/components/UsersSettingsView.svelte';
    import MobileBottomBar from './lib/components/MobileBottomBar.svelte';

    // Modals
    import ToastContainer from './lib/modals/ToastContainer.svelte';
    import TransactionModal from './lib/modals/TransactionModal.svelte';
    import PocketTransferModal from './lib/modals/PocketTransferModal.svelte';
    import AddPocketModal from './lib/modals/AddPocketModal.svelte';
    import GoalsModal from './lib/modals/GoalsModal.svelte';
    import ManageBudgetModal from './lib/modals/ManageBudgetModal.svelte';
    import RecurringModal from './lib/modals/RecurringModal.svelte';
    import DebtModal from './lib/modals/DebtModal.svelte';
    import DebtPaymentModal from './lib/modals/DebtPaymentModal.svelte';
    import EditTransactionModal from './lib/modals/EditTransactionModal.svelte';
    import GooglePickerModal from './lib/modals/GooglePickerModal.svelte';
    import AppsScriptModal from './lib/modals/AppsScriptModal.svelte';
    import ManageUsersModal from './lib/modals/ManageUsersModal.svelte';
    import ConfirmModal from './lib/modals/ConfirmModal.svelte';
    import OfflineQueueDrawer from './lib/modals/OfflineQueueDrawer.svelte';

    // Automation Hooks
    import { useRecurringChecker } from './lib/hooks/useRecurringChecker.js';

    $: if ($isLoggedIn) {
        fetchLiveGoldPrice();
        syncTransactionsFromSheet();
        useRecurringChecker();
    }
</script>

<!-- FLOATING TOASTS -->
<ToastContainer />

<!-- ALWAYS AVAILABLE CONFIRM MODAL & GOOGLE MODAL -->
<ConfirmModal />
<GooglePickerModal />

{#if !$isLoggedIn}
    <LoginScreen />
{:else}
    <!-- DASHBOARD MODALS -->
    <TransactionModal />
    <PocketTransferModal />
    <AddPocketModal />
    <GoalsModal />
    <ManageBudgetModal />
    <RecurringModal />
    <DebtModal />
    <DebtPaymentModal />
    <EditTransactionModal />
    <AppsScriptModal />
    <ManageUsersModal />
    <OfflineQueueDrawer />

    <div id="app-container" data-active-tab={$activeTab} style="display: block;">
        <Navbar />

        <main class="app-main-content">
            {#if $activeTab === 'home'}
                <div class="dashboard-tab-view active">
                    <HeroBalanceCard />
                    <BillReminderWidget />
                    <DebtSummaryCard />
                    <CategoryBudgetCard />
                    <PocketsGrid />
                    <TransactionHistory />
                </div>
            {:else if $activeTab === 'pockets'}
                <div class="pockets-tab-view active">
                    <BillReminderWidget />
                    <PocketsGrid />
                </div>
            {:else if $activeTab === 'analytics'}
                <AnalyticsView />
            {:else if $activeTab === 'report'}
                <MonthlyReportView />
            {:else if $activeTab === 'users'}
                <UsersSettingsView />
            {/if}
        </main>

        <MobileBottomBar />
    </div>
{/if}

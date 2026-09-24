<script>
    import { onMount } from 'svelte';
    import { activeTab } from './lib/stores/uiStore.js';
    import { fetchLiveGoldPrice, syncTransactionsFromSheet } from './lib/stores/financeStore.js';

    // Components
    import Navbar from './lib/components/Navbar.svelte';
    import HeroBalanceCard from './lib/components/HeroBalanceCard.svelte';
    import PocketsGrid from './lib/components/PocketsGrid.svelte';
    import TransactionHistory from './lib/components/TransactionHistory.svelte';
    import AnalyticsView from './lib/components/AnalyticsView.svelte';
    import UsersSettingsView from './lib/components/UsersSettingsView.svelte';
    import MobileBottomBar from './lib/components/MobileBottomBar.svelte';

    // Modals
    import ToastContainer from './lib/modals/ToastContainer.svelte';
    import TransactionModal from './lib/modals/TransactionModal.svelte';
    import PocketTransferModal from './lib/modals/PocketTransferModal.svelte';
    import GoalsModal from './lib/modals/GoalsModal.svelte';
    import EditTransactionModal from './lib/modals/EditTransactionModal.svelte';
    import GooglePickerModal from './lib/modals/GooglePickerModal.svelte';
    import AppsScriptModal from './lib/modals/AppsScriptModal.svelte';
    import ManageUsersModal from './lib/modals/ManageUsersModal.svelte';
    import ConfirmModal from './lib/modals/ConfirmModal.svelte';

    onMount(() => {
        fetchLiveGoldPrice();
        syncTransactionsFromSheet();
    });
</script>

<!-- FLOATING TOASTS -->
<ToastContainer />

<!-- MODALS -->
<TransactionModal />
<PocketTransferModal />
<GoalsModal />
<EditTransactionModal />
<GooglePickerModal />
<AppsScriptModal />
<ManageUsersModal />
<ConfirmModal />

<div id="app-container" data-active-tab={$activeTab} style="display: block;">
    <Navbar />

    <main class="app-main-content">
        {#if $activeTab === 'home'}
            <div class="dashboard-tab-view active">
                <HeroBalanceCard />
                <PocketsGrid />
                <TransactionHistory />
            </div>
        {:else if $activeTab === 'analytics'}
            <AnalyticsView />
        {:else if $activeTab === 'users'}
            <UsersSettingsView />
        {/if}
    </main>

    <MobileBottomBar />
</div>

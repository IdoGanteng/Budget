<script>
    import { isManageUsersModalOpen } from '../stores/uiStore.js';
    import { usersList, activeUser, setActiveUser, addNewUser, deleteUser } from '../stores/authStore.js';

    let showAddForm = false;
    let newName = '';
    let newAvatar = '👤';
    let newRole = 'Member';
    let newColor = '#818cf8';

    const avatarPresets = ['👑', '🌸', '🏠', '🚀', '⭐', '🐱', '🕶️', '🔥'];
    const colorPresets = ['#818cf8', '#f472b6', '#38bdf8', '#fbbf24', '#34d399', '#c084fc', '#fb923c'];

    function handleCreate(e) {
        if (e) e.preventDefault();
        if (!newName.trim()) return;
        addNewUser({
            name: newName.trim(),
            avatar: newAvatar,
            role: newRole,
            color: newColor
        });
        newName = '';
        showAddForm = false;
    }
</script>

{#if $isManageUsersModalOpen}
    <div class="modal-overlay active" on:click={() => isManageUsersModalOpen.set(false)}>
        <div class="modal-box" style="text-align: left; max-width: 440px;" on:click|stopPropagation>
            <div style="font-size: 32px; margin-bottom: 8px;">👥</div>
            <h3>Kelola Profil Pengguna</h3>
            <p style="font-size: 12.5px; color: var(--text-gray); margin-bottom: 14px;">
                Setiap profil memiliki database &amp; riwayat keuangan mandiri.
            </p>

            {#if !showAddForm}
                <div style="display: flex; flex-direction: column; gap: 8px; max-height: 260px; overflow-y: auto; margin-bottom: 14px;">
                    {#each $usersList as u}
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--list-bg); border: 1px solid var(--border-color); border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div style="width: 32px; height: 32px; border-radius: 50%; background: {u.color || 'var(--primary)'}; display: flex; align-items: center; justify-content: center; font-size: 15px; color: white;">
                                    {#if u.picture}
                                        <img src={u.picture} alt={u.name} style="width: 100%; height: 100%; border-radius: 50%;">
                                    {:else}
                                        {u.avatar || '👤'}
                                    {/if}
                                </div>
                                <div>
                                    <div style="font-weight: 700; font-size: 13px; color: var(--text-dark);">
                                        {u.name} {#if u.id === $activeUser.id}<span style="color: #10b981; font-size: 11px;">(Aktif)</span>{/if}
                                    </div>
                                    <div style="font-size: 11px; color: var(--text-gray);">{u.role || 'Member'}</div>
                                </div>
                            </div>
                            <div style="display: flex; gap: 6px;">
                                {#if u.id !== $activeUser.id}
                                    <button
                                        type="button"
                                        on:click={() => setActiveUser(u.id)}
                                        class="btn-primary"
                                        style="padding: 6px 10px; font-size: 11px; border-radius: 8px;"
                                    >
                                        Pilih
                                    </button>
                                {/if}
                                {#if $usersList.length > 1}
                                    <button
                                        type="button"
                                        on:click={() => deleteUser(u.id)}
                                        class="btn-danger"
                                        style="padding: 6px 10px; font-size: 11px; border-radius: 8px;"
                                    >
                                        Hapus
                                    </button>
                                {/if}
                            </div>
                        </div>
                    {/each}
                </div>

                <div style="display: flex; gap: 8px;">
                    <button
                        type="button"
                        on:click={() => isManageUsersModalOpen.set(false)}
                        class="btn-danger"
                        style="flex: 1; border-radius: 12px;"
                    >
                        Tutup
                    </button>
                    <button
                        type="button"
                        on:click={() => showAddForm = true}
                        class="btn-primary"
                        style="flex: 1; border-radius: 12px;"
                    >
                        + Tambah Profil
                    </button>
                </div>
            {:else}
                <form on:submit={handleCreate} style="gap: 12px;">
                    <div>
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Nama Profil</label>
                        <input type="text" bind:value={newName} placeholder="Misal: Ido Ganteng" required>
                    </div>

                    <div>
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Pilih Emoji Avatar</label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            {#each avatarPresets as av}
                                <button
                                    type="button"
                                    class="cat-btn"
                                    class:selected={newAvatar === av}
                                    on:click={() => newAvatar = av}
                                    style="font-size: 18px; padding: 6px 10px;"
                                >
                                    {av}
                                </button>
                            {/each}
                        </div>
                    </div>

                    <div>
                        <label style="font-size: 12px; font-weight: 700; display: block; margin-bottom: 6px;">Pilih Warna Profil</label>
                        <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                            {#each colorPresets as c}
                                <button
                                    type="button"
                                    on:click={() => newColor = c}
                                    style="width: 28px; height: 28px; border-radius: 50%; background: {c}; border: {newColor === c ? '2px solid white' : 'none'}; cursor: pointer;"
                                ></button>
                            {/each}
                        </div>
                    </div>

                    <div style="display: flex; gap: 8px; margin-top: 8px;">
                        <button
                            type="button"
                            on:click={() => showAddForm = false}
                            class="btn-danger"
                            style="flex: 1; border-radius: 12px;"
                        >
                            Kembali
                        </button>
                        <button
                            type="submit"
                            class="btn-primary"
                            style="flex: 1; border-radius: 12px;"
                        >
                            Simpan Profil
                        </button>
                    </div>
                </form>
            {/if}
        </div>
    </div>
{/if}

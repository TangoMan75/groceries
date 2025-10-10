// Grocery List App - Main JavaScript
import { DataStore } from './dataStore.js';
class GroceryApp {
    constructor() {
        this.groceryItems = [];
        this.shoppingSet = new Set();
        this.uncheckedSet = new Set(); // items in shopping list that are unchecked (struck)
        this.filteredItems = [];
        this.currentTab = 'shopping';
        this.editingItem = null;
        this.isLoading = true; // track initial loading state for UI messages

        // DataStore instances
        this.itemsStore = new DataStore('groceries.items');
        this.shoppingStore = new DataStore('groceries.shopping');
        this.shoppingStatusStore = new DataStore('groceries.shoppingStatus');

        this.init();
    }

    async init() {
        this.isLoading = true;
        this.renderShoppingList();

        await this.loadData();
        await this.loadShopping();
        await this.loadShoppingStatus();
        this.isLoading = false;
        this.setupEventListeners();
        this.renderCurrentTab();
        this.hideLoading();
    }

    async loadData() {
        const stored = await this.itemsStore.get(null);
        if (Array.isArray(stored) && stored.length) {
            this.groceryItems = stored;
        }
        this.filteredItems = [...this.groceryItems];
        console.log('Loaded data with', this.groceryItems.length, 'items');
    }

    async loadShopping() {
        try {
            const shopping = await this.shoppingStore.get([]);
            if (Array.isArray(shopping)) {
                this.shoppingSet = new Set(shopping.map(String));
            }
        } catch (e) {
            console.warn('Failed to load shopping list:', e);
        }
    }

    async loadShoppingStatus() {
        try {
            const unchecked = await this.shoppingStatusStore.get([]);
            if (Array.isArray(unchecked)) {
                this.uncheckedSet = new Set(unchecked.map(String));
            }
        } catch (e) {
            console.warn('Failed to load shopping status:', e);
        }
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('create-button').addEventListener('click', () => this.openCreateModal());
        document.getElementById('close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('cancel-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('submit-modal').addEventListener('click', () => this.handleModalSubmit());

        // Add item form
        const createForm = document.getElementById('add-item-form');
        createForm.addEventListener('submit', (e) => this.handleCreateItem(e));

        // Edit item form
        const editForm = document.getElementById('edit-item-form');
        editForm.addEventListener('submit', (e) => this.handleEditItem(e));

        // Shopping tab controls
        // Replace Clear Selected with Clear Shopping List
        const clearShoppingButton = document.getElementById('clear-shopping');
        if (clearShoppingButton) {
            clearShoppingButton.addEventListener('click', () => this.clearShoppingList());
        }

        // Store filters
        document.getElementById('manage-filter-store').addEventListener('change', (e) => this.filterByStoreManage(e.target.value));

        // Export items button (Manage tab)
        const exportBtn = document.getElementById('export-button');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportItems());
        }

        // Import items button and file input (Manage tab)
        const importButton = document.getElementById('import-button');
        const importFileInput = document.getElementById('import-file');
        if (importButton && importFileInput) {
            // Platform detection: Chrome on Android still has quirks opening pickers via FS Access
            const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
            const isAndroid = /Android/i.test(userAgent);
            const isChrome = /Chrome\//i.test(userAgent) && !/EdgA\//i.test(userAgent) && !/OPR\//i.test(userAgent) && !/SamsungBrowser\//i.test(userAgent);
            const isAndroidChrome = isAndroid && isChrome;

            // Helper using File System Access API when appropriate
            const tryFileSystemAccessPicker = async (event) => {
                const canUseFileSystem = ('showOpenFilePicker' in window) && !isAndroidChrome;
                if (!canUseFileSystem) return false;
                try {
                    // Prevent default label->input behavior to avoid double dialogs
                    event?.preventDefault?.();
                    const [handle] = await window.showOpenFilePicker({
                        multiple: false,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
                    if (!handle) return true; // handled, but nothing chosen
                    const file = await handle.getFile();
                    if (file) await this.handleImportFile(file);
                    return true;
                } catch (error) {
                    // If user canceled, do nothing; otherwise fall back
                    if (error && (error.name === 'AbortError' || error.name === 'NotAllowedError')) return true; // handled
                    return false;
                }
            };

            const openInputPicker = () => {
                try {
                    // Clear previous selection so picking the same file triggers change
                    importFileInput.value = '';
                    if (typeof importFileInput.showPicker === 'function') {
                        importFileInput.showPicker();
                    } else {
                        importFileInput.click();
                    }
                } catch {
                    importFileInput.click();
                }
            };

            const isLabel = importButton.tagName && importButton.tagName.toLowerCase() === 'label' && importButton.getAttribute('for') === 'import-file';

            if (!isLabel) {
                // Non-label button: prefer FS Access (except on Android Chrome), fall back to input APIs
                importButton.addEventListener('click', async (ev) => {
                    const handled = await tryFileSystemAccessPicker(ev);
                    if (!handled) openInputPicker();
                });
                // Also wire pointerup for better mobile compatibility
                importButton.addEventListener('pointerup', async (ev) => {
                    const handled = await tryFileSystemAccessPicker(ev);
                    if (!handled) openInputPicker();
                });
            } else {
                // Label-based control: intercept to use FS Access first when suitable
                importButton.addEventListener('click', async (ev) => {
                    const handled = await tryFileSystemAccessPicker(ev);
                    if (handled) return; // FS Access handled or user canceled
                    // When FS Access not used, let label default fire; also explicitly open for reliability
                    openInputPicker();
                });

                // Touch/pointer fallback to ensure a picker opens on some Android versions
                importButton.addEventListener('pointerup', async (ev) => {
                    // Do not prevent default here unless FS path is taken
                    const handled = await tryFileSystemAccessPicker(ev);
                    if (!handled) openInputPicker();
                }, { passive: true });

                // Keyboard accessibility (Enter/Space)
                importButton.setAttribute('tabindex', '0');
                importButton.addEventListener('keydown', async (ev) => {
                    if (ev.key === 'Enter' || ev.key === ' ') {
                        ev.preventDefault();
                        const handled = await tryFileSystemAccessPicker(ev);
                        if (!handled) openInputPicker();
                    }
                });
            }

            // Input-based import fallback
            importFileInput.addEventListener('change', async (e) => {
                const file = e.target.files?.[0];
                // Reset value so the same file can be selected again next time
                e.target.value = '';
                if (file) {
                    await this.handleImportFile(file);
                }
            });
        }

        // Listen for tab changes (Pivot CSS handles the switching)
        document.getElementById('shopping-tab').addEventListener('click', () => {
            this.currentTab = 'shopping';
            setTimeout(() => this.renderShoppingList(), 100);
        });

        document.getElementById('manage-tab').addEventListener('click', () => {
            this.currentTab = 'manage';
            setTimeout(() => this.renderManageTable(), 100);
        });

        // Event delegation for dynamically created buttons
        document.addEventListener('click', (e) => {
            const editBtn = e.target.closest('.edit-btn');
            if (editBtn) {
                const itemId = editBtn.getAttribute('data-item-id');
                this.startEdit(itemId);
                return;
            }
            const removeBtn = e.target.closest('.remove-btn');
            if (removeBtn) {
                const itemId = removeBtn.getAttribute('data-item-id');
                this.removeItem(itemId);
                return;
            }
            // Clicking on the Item cell in Manage tab also adds to shopping list
            const itemCell = e.target.closest('.item-cell');
            if (itemCell) {
                // Manage tab behavior
                if (itemCell.closest('#manage-panel')) {
                    const itemId = itemCell.getAttribute('data-item-id');
                    // Toggle: if already in shopping list, remove it; otherwise add it
                    if (this.shoppingSet.has(String(itemId))) {
                        this.removeFromShopping(itemId);
                    } else {
                        this.addToShopping(itemId);
                    }
                    return;
                }
                // Shopping tab behavior: toggle the item
                if (itemCell.closest('#shopping-panel')) {
                    const itemId = itemCell.getAttribute('data-item-id');
                    // Prefer toggling via the checkbox to reuse native change flow
                    const checkbox = document.getElementById(`switch-${itemId}`);
                    if (checkbox) {
                        checkbox.click();
                    } else {
                        // Fallback: call toggle directly
                        this.toggleItem(itemId);
                    }
                    return;
                }
            }
        });
    }

    renderCurrentTab() {
        this.renderShoppingList();
        this.renderManageTable();
    }

    handleCreateItem(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const newItem = {
            id: `item-${Date.now()}`,
            store: formData.get('store'),
            item: formData.get('item'),
            price: parseFloat(formData.get('price')) || 0
        };

        this.groceryItems.push(newItem);
        // Persist items
        this.itemsStore.set(this.groceryItems).catch(err => console.error('Failed to persist items:', err));
        this.applyCurrentFilter();
        this.renderCurrentTab();
        
        // Reset form
        e.target.reset();

        // Show success message
        Toast.show({type: 'success', message: 'Item added successfully!'});

        // Close modal
        this.closeModal();
    }

    handleEditItem(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const itemId = formData.get('id');
        const itemIndex = this.groceryItems.findIndex(item => String(item.id) === String(itemId));

        if (itemIndex !== -1) {
            this.groceryItems[itemIndex] = {
                id: itemId,
                store: formData.get('store'),
                item: formData.get('item'),
                price: parseFloat(formData.get('price')) || 0
            };

            this.applyCurrentFilter();
            this.renderCurrentTab();
            // Persist items
            this.itemsStore.set(this.groceryItems).catch(err => console.error('Failed to persist items:', err));
            Toast.show({type: 'success', message: 'Item updated successfully!'});

            // Close modal
            this.closeModal();
        }
    }

    startEdit(itemId) {
        const item = this.groceryItems.find(item => String(item.id) === String(itemId));
        if (!item) return;

        this.editingItem = itemId;

        // Populate edit form
        document.getElementById('edit-item-id').value = item.id;
        document.getElementById('edit-store-select').value = item.store;
        document.getElementById('edit-item-name').value = item.item;
        document.getElementById('edit-item-price').value = item.price;

        // Open modal in edit mode
        this.openEditModal();
    }

    cancelEdit() {
        this.editingItem = null;

        // Reset edit form
        document.getElementById('edit-item-form').reset();

        // Close modal
        this.closeModal();
    }

    filterByStore(store) {
        if (!store) {
            this.filteredItems = [...this.groceryItems];
        } else {
            this.filteredItems = this.groceryItems.filter(item => item.store === store);
        }
        this.renderShoppingList();
    }

    filterByStoreManage(store) {
        if (!store) {
            this.filteredItems = [...this.groceryItems];
        } else {
            this.filteredItems = this.groceryItems.filter(item => item.store === store);
        }
        this.renderManageTable();
    }

    applyCurrentFilter() {
        if (this.currentTab === 'shopping') {
            const filterSelect = document.getElementById('filter-store');
            const currentFilter = filterSelect.value;
            this.filterByStore(currentFilter);
        } else {
            const filterSelect = document.getElementById('manage-filter-store');
            const currentFilter = filterSelect.value;
            this.filterByStoreManage(currentFilter);
        }
    }

    renderShoppingList() {
        const tbody = document.getElementById('shopping-tbody');

        // Build the list from shoppingSet only
        const toRender = this.groceryItems.filter(item => this.shoppingSet.has(String(item.id)));

        if (tbody) {
            // Loading state
            if (this.isLoading) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align:center; color: var(--pico-muted-color);">Loading grocery items...</td>
                    </tr>
                `;
                return;
            }

            // Empty state
            if (toRender.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align:center; color: var(--pico-muted-color);">
                            No items found. Add some items in the Manage tab to get started!
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = toRender.map(item => {
                let badge = 'warning';
                switch (item.store.toLowerCase()) {
                    case 'auchan':
                        badge = 'danger';
                        break;
                    case 'inter':
                        badge = 'success';
                        break;
                    case 'picard':
                        badge = 'info';
                        break;
                }
                const isUnchecked = this.uncheckedSet.has(String(item.id));
                return `
                    <tr class="shopping-item ${isUnchecked ? 'struck' : ''}" data-item-id="${item.id}">
                        <td class="actions"><input type="checkbox" role="switch" id="switch-${item.id}" ${!isUnchecked ? 'checked' : ''} onchange="groceryApp.toggleItem('${item.id}')"></td>
                        <td class="item-cell clickable-item" data-item-id="${item.id}">${this.escapeHtml(item.item)}</td>
                        <td class="price">€${item.price.toFixed(2)}</td>
                    </tr>
                `;
            }).join('');
        }
    }

    renderManageTable() {
        const tbody = document.getElementById('grocery-tbody');

        if (this.filteredItems.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--pico-muted-color);">No items found</td></tr>';
            return;
        }

        tbody.innerHTML = this.filteredItems.map(item => {
            let badge = 'warning';
            switch (item.store.toLowerCase()) {
                case 'auchan':
                    badge = 'danger';
                    break;
                case 'inter':
                    badge = 'success';
                    break;
                case 'picard':
                    badge = 'info';
                    break;
            }
            const inShopping = this.shoppingSet.has(String(item.id));
            return `
                <tr data-item-id="${item.id}">
                    <td>
                        <small role="status" class="${badge}">${item.store}</small>
                    </td>
                    <td class="item-cell clickable-item ${inShopping ? 'in-shopping-list' : ''}" data-item-id="${item.id}" title="${inShopping ? 'Remove from shopping list' : 'Add to shopping list'}">${this.escapeHtml(item.item)}</td>
                    <td class="price">€${item.price.toFixed(2)}</td>
                    <td class="actions">
                        <ul role="toolbar">
                            <li role="menuitem">
                                <a role="button" class="edit-btn" data-item-id="${item.id}" title="Edit item">
                                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><!-- warning -->
                                        <circle cx="8" cy="8" r="8" fill="#ffbf00"></circle>
                                    </svg>
                                </a>
                            </li>
                            <li role="menuitem">
                                <a role="button" class="remove-btn" data-item-id="${item.id}" title="Remove item">
                                    <svg width="16" height="16" xmlns="http://www.w3.org/2000/svg"><!-- danger -->
                                        <circle cx="8" cy="8" r="8" fill="#ee402e"></circle>
                                    </svg>
                                </a>
                            </li>
                        </ul>
                    </td>
                </tr>
            `;
        }).join('');
    }

    addToShopping(itemId) {
        if (this.shoppingSet.has(itemId)) {
            Toast.show({type: 'danger', message: 'Item already in shopping list'});
            // Also ensure UI reflects current state
            this.renderManageTable();
            return;
        }
        this.shoppingSet.add(itemId);
        this.shoppingStore.set([...this.shoppingSet]).catch(err => console.error('Failed to persist shopping list:', err));
        // Default to checked when added (i.e., not in unchecked set)
        if (this.uncheckedSet.delete(itemId)) {
            this.shoppingStatusStore.set([...this.uncheckedSet]).catch(err => console.error('Failed to persist shopping status:', err));
        }
        Toast.show({type: 'success', message: 'Added to shopping list'});
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        }
        // Update Manage table highlighting
        this.renderManageTable();
    }

    removeFromShopping(itemId) {
        if (!this.shoppingSet.has(itemId)) {
            // Nothing to do
            return;
        }
        this.shoppingSet.delete(itemId);
        this.shoppingStore.set([...this.shoppingSet]).catch(err => console.error('Failed to persist shopping list:', err));
        // Also remove any unchecked status associated with this item
        if (this.uncheckedSet.delete(itemId)) {
            this.shoppingStatusStore.set([...this.uncheckedSet]).catch(err => console.error('Failed to persist shopping status:', err));
        }
        Toast.show({type: 'info', message: 'Removed from shopping list'});
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        }
        // Update Manage table highlighting
        this.renderManageTable();
    }

    toggleItem(itemId) {
        // Toggle checked/unchecked for shopping list item and persist
        const id = String(itemId);
        const row = document.querySelector(`[data-item-id="${id}"]`);
        const checkbox = document.getElementById(`switch-${id}`);
        const isChecked = !!checkbox?.checked;

        if (isChecked) {
            // Checked => remove from unchecked set (no strike)
            this.uncheckedSet.delete(id);
            row?.classList.remove('struck');
        } else {
            // Unchecked => add to unchecked set (strike)
            this.uncheckedSet.add(id);
            row?.classList.add('struck');
        }

        // Persist unchecked set status
        this.shoppingStatusStore.set([...this.uncheckedSet]).catch(err => console.error('Failed to persist shopping status:', err));

        // Also update the text decoration immediately for UX
        const nameCell = row?.querySelector('td:nth-child(2)');
        if (nameCell) {
            if (isChecked) {
                nameCell.style.textDecoration = '';
                nameCell.style.opacity = '';
            } else {
                nameCell.style.textDecoration = 'line-through';
                nameCell.style.opacity = '0.6';
            }
        }

        // Re-render to apply ordering so checked items move to the end
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        }
    }

    removeItem(itemId) {
        this.groceryItems = this.groceryItems.filter(item => String(item.id) !== String(itemId));
        // Also remove from shopping list if present
        if (this.shoppingSet.delete(itemId)) {
            this.shoppingStore.set([...this.shoppingSet]).catch(err => console.error('Failed to persist shopping list:', err));
        }
        // Remove strike status tracking if present
        if (this.uncheckedSet.delete(itemId)) {
            this.shoppingStatusStore.set([...this.uncheckedSet]).catch(err => console.error('Failed to persist shopping status:', err));
        }
        this.applyCurrentFilter();
        this.renderCurrentTab();
        // Persist items
        this.itemsStore.set(this.groceryItems).catch(err => console.error('Failed to persist items:', err));
        Toast.show({type: 'success', message: 'Item removed successfully!'});
    }

    clearSelected() {
        this.selectedItems.clear();
        this.renderShoppingList();
        // Persist selection
        this.selectedStore.set([]).catch(err => console.error('Failed to persist selection:', err));
        Toast.show({type: 'info', message: 'Selection cleared!'});
    }

    updateSelectedCount() {
        // With the new UI, we display a static label for the clear shopping button
        const clearBtn = document.getElementById('clear-shopping');
        if (clearBtn) {
            clearBtn.textContent = 'Clear Shopping List';
        }
    }

    hideLoading() {
        const loading = document.getElementById('loading');
        if (loading && loading.style) {
            loading.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoading();
        const tbody = document.getElementById('shopping-tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center; color: var(--pico-del-color);">Error: ${this.escapeHtml(message)}</td>
                </tr>
            `;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Modal methods
    openCreateModal() {
        const modal = document.getElementById('item-modal');
        const modalTitle = document.getElementById('modal-title');
        const createForm = document.getElementById('add-item-form');
        const editForm = document.getElementById('edit-item-form');
        const submitBtn = document.getElementById('submit-modal');

        // Reset editing state
        this.editingItem = null;

        // Configure modal for adding
        modalTitle.textContent = 'Create Item';
        createForm.style.display = 'block';
        editForm.style.display = 'none';
        submitBtn.textContent = '💾 Add Item';

        // Reset add form
        createForm.reset();

        // Open modal
        modal.showModal();
    }

    openEditModal() {
        const modal = document.getElementById('item-modal');
        const modalTitle = document.getElementById('modal-title');
        const createForm = document.getElementById('add-item-form');
        const editForm = document.getElementById('edit-item-form');
        const submitBtn = document.getElementById('submit-modal');

        // Configure modal for editing
        modalTitle.textContent = 'Edit Item';
        createForm.style.display = 'none';
        editForm.style.display = 'block';
        submitBtn.textContent = '💾 Update Item';

        // Open modal
        modal.showModal();
    }

    closeModal() {
        const modal = document.getElementById('item-modal');
        const createForm = document.getElementById('add-item-form');
        const editForm = document.getElementById('edit-item-form');

        // Reset forms
        createForm.reset();
        editForm.reset();

        // Reset editing state
        this.editingItem = null;

        // Close modal
        modal.close();
    }

    handleModalSubmit() {
        if (this.editingItem) {
            // Submit edit form
            const editForm = document.getElementById('edit-item-form');
            const event = new Event('submit', { bubbles: true, cancelable: true });
            editForm.dispatchEvent(event);
        } else {
            // Submit add form
            const createForm = document.getElementById('add-item-form');
            const event = new Event('submit', { bubbles: true, cancelable: true });
            createForm.dispatchEvent(event);
        }
    }

    clearShoppingList() {
        // Empty the shopping list and associated unchecked statuses
        if (this.shoppingSet.size === 0) {
            Toast.show({type: 'danger', message: 'Shopping list is already empty'});
            return;
        }
        this.shoppingSet.clear();
        this.uncheckedSet.clear();
        // Persist
        this.shoppingStore.set([]).catch(err => console.error('Failed to persist shopping list:', err));
        this.shoppingStatusStore.set([]).catch(err => console.error('Failed to persist shopping status:', err));
        // Re-render
        if (this.currentTab === 'shopping') {
            this.renderShoppingList();
        }
        Toast.show({type: 'success', message: 'Shopping list cleared'});
    }

    exportItems() {
        try {
            // Ensure we export the complete, current item list
            const data = this.groceryItems.map(({ id, store, item, price }) => ({ id, store, item, price }));
            const json = JSON.stringify(data, null, 2);

            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            const fileName = `groceries-items-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            Toast.show({type: 'success', message: 'Item list exported'});
        } catch (err) {
            console.error('Failed to export items:', err);
            Toast.error('Failed to export items');
        }
    }

    async handleImportFile(file) {
        try {
            if (!(file instanceof File)) {
                Toast.error('No file selected');
                return;
            }
            const text = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ''));
                reader.onerror = () => reject(reader.error || new Error('Failed to read file'));
                reader.readAsText(file);
            });

            let data;
            try {
                data = JSON.parse(text);
            } catch (parseErr) {
                console.error('Invalid JSON file:', parseErr);
                Toast.error('Invalid JSON file');
                return;
            }

            if (!Array.isArray(data)) {
                Toast.error('JSON must be an array of items');
                return;
            }

            // Build indexes for fast checks
            const existingIdSet = new Set(this.groceryItems.map(it => String(it.id)));
            const existingKeySet = new Set(
                this.groceryItems.map(it => `${String(it.store).trim().toLowerCase()}|${String(it.item).trim().toLowerCase()}`)
            );

            const toAdd = [];
            let skippedInvalid = 0;
            let skippedDuplicates = 0;
            let counter = 0;

            const makeUniqueId = () => {
                let id;
                do {
                    id = `item-${Date.now()}-${counter++}`;
                } while (existingIdSet.has(id));
                existingIdSet.add(id);
                return id;
            };

            for (const raw of data) {
                // Basic shape check and normalization (accepts variations in key case/names)
                const store = raw?.store ?? raw?.Store ?? raw?.STORE;
                const name = raw?.item ?? raw?.name ?? raw?.Item ?? raw?.ITEM;
                const priceRaw = raw?.price ?? raw?.Price ?? raw?.PRICE;

                if (!store || !name) {
                    skippedInvalid++;
                    continue;
                }

                const item = String(name).trim();
                const storeStr = String(store).trim();

                // Parse price to number (default 0)
                let price = Number(priceRaw);
                if (!isFinite(price)) price = 0;

                // Deduplicate by (store,item) pair
                const key = `${storeStr.toLowerCase()}|${item.toLowerCase()}`;
                if (existingKeySet.has(key)) {
                    skippedDuplicates++;
                    continue;
                }
                // Also prevent duplicates within the current batch
                if (toAdd.some(x => `${x.store.toLowerCase()}|${x.item.toLowerCase()}` === key)) {
                    skippedDuplicates++;
                    continue;
                }

                // Ensure ID is present and unique
                let id = raw?.id != null ? String(raw.id) : '';
                if (!id || existingIdSet.has(id)) {
                    id = makeUniqueId();
                } else {
                    existingIdSet.add(id);
                }

                toAdd.push({ id, store: storeStr, item, price });
                existingKeySet.add(key);
            }

            if (toAdd.length === 0) {
                if (skippedInvalid > 0) {
                    Toast.show({type: 'warning', message: 'No items imported: invalid or duplicate entries'});
                } else {
                    Toast.show({type: 'info', message: 'No new items to import'});
                }
                return;
            }

            // Merge and persist
            this.groceryItems.push(...toAdd);
            await this.itemsStore.set(this.groceryItems);

            // Reapply filter and re-render manage table
            this.applyCurrentFilter();
            this.renderCurrentTab();

            const details = [];
            if (skippedDuplicates) details.push(`${skippedDuplicates} duplicate(s) skipped`);
            if (skippedInvalid) details.push(`${skippedInvalid} invalid item(s) skipped`);
            const suffix = details.length ? ` (${details.join(', ')})` : '';
            Toast.show({type: 'success', message: `Imported ${toAdd.length} item(s)${suffix}`});
        } catch (err) {
            console.error('Failed to import items:', err);
            Toast.error('Failed to import items');
        }
    }
}

// Initialize the app when DOM is loaded
window.groceryApp = null;
document.addEventListener('DOMContentLoaded', () => {
    window.groceryApp = new GroceryApp();
});

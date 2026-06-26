/**
 * Enhanced DataStore class for managing persistent data storage
 * Supports both Chrome extension storage API and browser localStorage fallback
 * @class DataStore
 */
class DataStore {
    /**
     * Create a DataStore instance
     * @param {string} namespace - The storage namespace/key
     * @param {string} [type='local'] - Storage type: 'local', 'sync', 'managed', 'session'
     * @throws {Error} When namespace is invalid
     */
    constructor(namespace, type = 'local') {
        this._validateNamespace(namespace);
        this.namespace = namespace;
        this.validTypes = ['local', 'sync', 'managed', 'session'];
        this.type = this.validTypes.includes(type) ? type : 'local';
        this._initializeStorage();
        this._eventListeners = new Map();
    }

    /**
     * Validate namespace parameter
     * @private
     * @param {*} namespace - The namespace to validate
     * @throws {Error} When namespace is invalid
     */
    _validateNamespace(namespace) {
        if (typeof namespace !== 'string') {
            throw new TypeError('Namespace must be a string');
        }
        if (!namespace.trim()) {
            throw new Error('Namespace cannot be empty');
        }
        if (namespace.length > 255) {
            throw new Error('Namespace cannot exceed 255 characters');
        }
        if (!/^[a-zA-Z0-9._-]+$/.test(namespace)) {
            throw new Error('Namespace contains invalid characters. Only alphanumeric, dots, underscores, and hyphens are allowed');
        }
    }

    /**
     * Initialize storage with Chrome extension API or localStorage fallback
     * @private
     */
    _initializeStorage() {
        try {
            // Check if Chrome extension API is available
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage[this.type]) {
                this.storage = chrome.storage[this.type];
                this.storageType = 'chrome';
            } else {
                // Fallback to localStorage/sessionStorage
                this.storage = this.type === 'session' ? sessionStorage : localStorage;
                this.storageType = 'web';
            }
        } catch (error) {
            this.storage = localStorage;
            this.storageType = 'web';
            console.warn('DataStore: Falling back to localStorage due to:', error.message);
        }
    }

    /**
     * Get data from storage
     * @param {*} [defaultValue=undefined] - Default value if key doesn't exist
     * @returns {Promise<*>} The stored value or default value
     */
    async get(defaultValue = undefined) {
        try {
            if (this.storageType === 'chrome') {
                return new Promise((resolve, reject) => {
                    this.storage.get([this.namespace], (result) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(`Chrome storage error: ${chrome.runtime.lastError.message}`));
                        } else {
                            const value = result[this.namespace];
                            resolve(value !== undefined ? value : defaultValue);
                        }
                    });
                });
            } else {
                // Web storage fallback
                const item = this.storage.getItem(this.namespace);
                if (item === null) {
                    return defaultValue;
                }
                try {
                    return JSON.parse(item);
                } catch (parseError) {
                    console.warn(`DataStore: Failed to parse stored data for ${this.namespace}:`, parseError);
                    return defaultValue;
                }
            }
        } catch (error) {
            console.error(`DataStore: Error getting data for ${this.namespace}:`, error);
            throw new Error(`Failed to get data: ${error.message}`);
        }
    }

    /**
     * Set data in storage
     * @param {*} value - The value to store
     * @returns {Promise<void>}
     * @throws {Error} When storage operation fails
     */
    async set(value) {
        try {
            this._validateValue(value);
            if (this.storageType === 'chrome') {
                return new Promise((resolve, reject) => {
                    this.storage.set({ [this.namespace]: value }, () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(`Chrome storage error: ${chrome.runtime.lastError.message}`));
                        } else {
                            this._dispatchChangeEvent('set', value);
                            resolve();
                        }
                    });
                });
            } else {
                try {
                    const serialized = JSON.stringify(value);
                    this.storage.setItem(this.namespace, serialized);
                    this._dispatchChangeEvent('set', value);
                } catch (storageError) {
                    if (storageError.name === 'QuotaExceededError') {
                        throw new Error('Storage quota exceeded');
                    }
                    throw storageError;
                }
            }
        } catch (error) {
            console.error(`DataStore: Error setting data for ${this.namespace}:`, error);
            throw new Error(`Failed to set data: ${error.message}`);
        }
    }

    /**
     * Validate that a value can be stored
     * @private
     * @param {*} value - The value to validate
     * @throws {Error} When value cannot be stored
     */
    _validateValue(value) {
        if (value === undefined) {
            throw new Error('Cannot store undefined value');
        }
        try {
            JSON.stringify(value);
        } catch (error) {
            if (error.message.includes('circular')) {
                throw new Error('Cannot store value with circular references');
            }
            throw new Error(`Value is not serializable: ${error.message}`);
        }
    }

    /**
     * Add a value to an array stored in the namespace
     * @param {*} value - The value to add
     * @param {boolean} [allowDuplicates=true] - Whether to allow duplicate values
     * @returns {Promise<number>} The new length of the array
     * @throws {Error} When the stored data is not an array or value is invalid
     */
    async add(value, allowDuplicates = true) {
        if (value === undefined || value === null) {
            throw new Error(`Cannot add undefined or null value to "${this.namespace}"`);
        }
        try {
            const data = await this.get([]);
            if (!Array.isArray(data)) {
                throw new Error(`"${this.namespace}" does not contain an array`);
            }
            if (!allowDuplicates && data.some(item => JSON.stringify(item) === JSON.stringify(value))) {
                throw new Error('Duplicate value not allowed');
            }
            data.push(value);
            await this.set(data);
            return data.length;
        } catch (error) {
            console.error(`DataStore: Error adding value to ${this.namespace}:`, error);
            throw error;
        }
    }

    /**
     * Clear all data in the entire namespace from storage
     * @returns {Promise<void>}
     * @throws {Error} When deletion fails
     */
    async clear() {
        try {
            if (this.storageType === 'chrome') {
                return new Promise((resolve, reject) => {
                    this.storage.remove([this.namespace], () => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(`Chrome storage error: ${chrome.runtime.lastError.message}`));
                        } else {
                            this._dispatchChangeEvent('clear');
                            resolve();
                        }
                    });
                });
            } else {
                // Web storage fallback
                this.storage.removeItem(this.namespace);
                this._dispatchChangeEvent('clear');
            }
        } catch (error) {
            console.error(`DataStore: Error deleting ${this.namespace}:`, error);
            throw new Error(`Failed to delete data: ${error.message}`);
        }
    }

    /**
     * Append a value to an array at a specific path within the stored object
     * @param {string} itemPath - Dot-notation path to the array (e.g., 'user.preferences.items')
     * @param {*} value - The value to append
     * @returns {Promise<number>} The new length of the array
     * @throws {Error} When path is invalid, target is not an array, or value is invalid
     */
    async appendItem(itemPath, value) {
        if (value === undefined || value === null) {
            throw new Error(`Cannot add undefined or null value to "${itemPath}"`);
        }
        this._validatePath(itemPath);
        try {
            const data = await this.get();
            if (!data) {
                throw new Error(`No data found in namespace "${this.namespace}"`);
            }
            const { parent, key } = this._navigateToPath(data, itemPath);
            if (!Array.isArray(parent[key])) {
                throw new Error(`Path "${itemPath}" does not point to an array`);
            }
            parent[key].push(value);
            await this.set(data);
            return parent[key].length;
        } catch (error) {
            console.error(`DataStore: Error appending to ${itemPath}:`, error);
            throw error;
        }
    }

    /**
     * Edit/update a value at a specific path within the stored object
     * @param {string} itemPath - Dot-notation path to the value (e.g., 'user.name')
     * @param {*} value - The new value
     * @param {boolean} [createPath=false] - Whether to create the path if it doesn't exist
     * @returns {Promise<void>}
     * @throws {Error} When path is invalid or not found
     */
    async editItem(itemPath, value, createPath = false) {
        this._validatePath(itemPath);
        try {
            let data = await this.get();
            if (!data) {
                if (createPath) {
                    data = {};
                } else {
                    throw new Error(`No data found in namespace "${this.namespace}"`);
                }
            }
            const { parent, key } = this._navigateToPath(data, itemPath, createPath);
            if (!createPath && !(key in parent)) {
                throw new Error(`Path "${itemPath}" not found`);
            }
            const oldValue = parent[key];
            parent[key] = value;
            await this.set(data);
            this._dispatchChangeEvent('edit', { path: itemPath, oldValue, newValue: value });
        } catch (error) {
            console.error(`DataStore: Error editing ${itemPath}:`, error);
            throw error;
        }
    }

    /**
     * Delete an item at a specific path within the stored object
     * @param {string} itemPath - Dot-notation path to the value to delete
     * @returns {Promise<boolean>} True if item was deleted, false if not found
     * @throws {Error} When path is invalid
     */
    async deleteItem(itemPath) {
        this._validatePath(itemPath);
        try {
            const data = await this.get();
            if (!data) {
                return false;
            }
            const { parent, key } = this._navigateToPath(data, itemPath);
            if (!(key in parent)) {
                return false;
            }
            const deletedValue = parent[key];
            if (Array.isArray(parent)) {
                const index = Number(key);
                if (isNaN(index) || index < 0 || index >= parent.length) {
                    throw new Error(`Invalid array index: ${key}`);
                }
                parent.splice(index, 1);
            } else {
                delete parent[key];
            }
            await this.set(data);
            this._dispatchChangeEvent('deleteItem', { path: itemPath, deletedValue });
            return true;
        } catch (error) {
            console.error(`DataStore: Error deleting ${itemPath}:`, error);
            throw error;
        }
    }

    // === UTILITY METHODS ===

    /**
     * Update data using a function
     * @param {Function} updater - Function that receives current data and returns new data
     * @param {*} [defaultValue] - Default value if no data exists
     * @returns {Promise<*>} The updated data
     */
    async update(updater, defaultValue = undefined) {
        if (typeof updater !== 'function') {
            throw new TypeError('Updater must be a function');
        }
        try {
            const currentData = await this.get(defaultValue);
            const newData = updater(currentData);
            await this.set(newData);
            return newData;
        } catch (error) {
            console.error(`DataStore: Error updating ${this.namespace}:`, error);
            throw error;
        }
    }

    /**
     * Merge an object with existing data
     * @param {Object} newData - Object to merge
     * @param {boolean} [deep=false] - Whether to perform deep merge
     * @returns {Promise<Object>} The merged data
     */
    async merge(newData, deep = false) {
        if (typeof newData !== 'object' || newData === null || Array.isArray(newData)) {
            throw new TypeError('Data to merge must be a plain object');
        }
        try {
            const currentData = await this.get({});
            if (typeof currentData !== 'object' || Array.isArray(currentData)) {
                throw new Error('Cannot merge with non-object data');
            }

            const merged = deep ? this._deepMerge(currentData, newData) : { ...currentData, ...newData };
            await this.set(merged);
            return merged;
        } catch (error) {
            console.error(`DataStore: Error merging data in ${this.namespace}:`, error);
            throw error;
        }
    }

    /**
     * Validate a dot-notation path
     * @private
     * @param {string} path - The path to validate
     */
    _validatePath(path) {
        if (typeof path !== 'string' || !path.trim()) {
            throw new Error('Path must be a non-empty string');
        }
    }

    /**
     * Navigate to a path within an object, optionally creating missing parts
     * @private
     * @param {Object} data - The data object to navigate
     * @param {string} path - Dot-notation path
     * @param {boolean} [create=false] - Whether to create missing path parts
     * @returns {Object} Object with parent and key properties
     */
    _navigateToPath(data, path, create = false) {
        const pathParts = path.split('.');
        const key = pathParts.pop();
        let parent = data;
        for (const part of pathParts) {
            if (parent == null) {
                throw new Error(`Cannot navigate through null/undefined at path "${path}"`);
            }
            if (!(part in parent)) {
                if (create) {
                    parent[part] = {};
                } else {
                    throw new Error(`Path "${path}" not found`);
                }
            }
            parent = parent[part];
        }
        return { parent, key };
    }

    /**
     * Deep merge two objects
     * @private
     * @param {Object} target - Target object
     * @param {Object} source - Source object
     * @returns {Object} Merged object
     */
    _deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key]) &&
                    typeof result[key] === 'object' && result[key] !== null && !Array.isArray(result[key])) {
                    result[key] = this._deepMerge(result[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }

    /**
     * Dispatch change events
     * @private
     * @param {string} type - Event type
     * @param {*} [data] - Event data
     */
    _dispatchChangeEvent(type, data = null) {
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('datastore-changed', {
                    detail: { 
                        namespace: this.namespace, 
                        type, 
                        data,
                        timestamp: Date.now()
                    }
                }));
            }
            const listeners = this._eventListeners.get(type) || [];
            listeners.forEach(callback => {
                try {
                    callback({ namespace: this.namespace, type, data });
                } catch (error) {
                    console.error('DataStore event listener error:', error);
                }
            });
        } catch (error) {
            console.warn('DataStore: Failed to dispatch change event:', error);
        }
    }

    /**
     * Add an event listener for DataStore changes
     * @param {string} type - Event type ('set', 'clear', 'edit', 'deleteItem')
     * @param {Function} callback - Callback function
     */
    addEventListener(type, callback) {
        if (typeof callback !== 'function') {
            throw new TypeError('Callback must be a function');
        }
        if (!this._eventListeners.has(type)) {
            this._eventListeners.set(type, []);
        }
        this._eventListeners.get(type).push(callback);
    }

    /**
     * Remove an event listener
     * @param {string} type - Event type
     * @param {Function} callback - Callback function to remove
     */
    removeEventListener(type, callback) {
        const listeners = this._eventListeners.get(type);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
}

// Export for module use
export { DataStore };

// Make DataStore available globally
if (typeof window !== 'undefined') {
    window.DataStore = DataStore;
}

// Export default for easier importing
export default DataStore;
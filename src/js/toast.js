/**
 * Toast Notification System
 * A reusable toast notification library for displaying temporary messages
 *
 * Features:
 * - Multiple toast types (success, error, warning, info)
 * - Configurable positioning (top, left, right, center)
 * - Auto-dismiss with custom duration
 * - Manual dismiss with close button
 * - Smooth animations
 * - Multiple toasts support
 *
 * Usage:
 * const toast = new Toast();
 * toast.show({message: 'Hello World!', type: 'success'});
 *
 * Or use static methods:
 * Toast.info('Information message');
 * Toast.success('Operation completed!');
 * Toast.warning('Please check your input');
 * Toast.danger('Something went wrong!');
 */

class Toast {
    /**
     * Static method to show a toast
     * @param {Object} config - Configuration options
     */
    static show(config = {}) {
        const toast = new Toast();
        return toast.show(config);
    }

    /**
     * Create and display a toast element
     * @param {Object} config - Configuration options
     * @returns {string} Toast ID
     */
    show(config = {}) {
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', danger: '🚨' };
        const defaultConfig = { type: 'info', position: 'right', duration: 3000 };
        const toastConfig = { ...defaultConfig, ...config, ...{ id: this._generateUUID() } };
        if (config.type === null) toastConfig.type = defaultConfig.type;
        if (config.position === null) toastConfig.position = defaultConfig.position;
        if (config.duration === null) toastConfig.duration = defaultConfig.duration;
        toastConfig.icon = toastConfig.fonticon ? `<span class="${toastConfig.fonticon}"></span>` : icons[toastConfig.type] || icons[defaultConfig.type];
        toastConfig.title = toastConfig.title || toastConfig.type.charAt(0).toUpperCase() + toastConfig.type.slice(1);

        let toastContainer = document.getElementById(`toast-container-${toastConfig.position}`);
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = `toast-container-${toastConfig.position}`;
            toastContainer.className = `toast-container ${toastConfig.position}`;
            document.body.appendChild(toastContainer);
        }

        const toastElement = document.createElement('div');
        toastElement.setAttribute('id', toastConfig.id);
        toastElement.setAttribute('role', 'alert');
        toastElement.className = `${toastConfig.type} ${toastConfig.className || ''}`.trim();

        toastElement.innerHTML = `
            <header>
                <span class="close"></span>
                ${toastConfig.icon}&nbsp;${toastConfig.title}
            </header>
            <p role="alertdialog">${this._escapeHtml(toastConfig.message)}</p>
            ${toastConfig.footer ? `<footer>${toastConfig.footer}</footer>` : ''}
        `;
        toastElement.style.opacity = '0';
        toastElement.style.transition = 'opacity 0.2s';
        toastContainer.appendChild(toastElement);

        toastElement.addEventListener('click', () => {
            this.dismiss(toastConfig.id);
        });

        requestAnimationFrame(() => {
            toastElement.style.opacity = '1';
        });

        if (toastConfig.duration > 0) {
            setTimeout(() => {
                this.dismiss(toastConfig.id);
            }, toastConfig.duration);
        }
    }

    /**
     * Dismiss a specific toast by ID
     * @param {string} toastId - The ID of the toast to dismiss
     */
    dismiss(toastId) {
        const toast = document.getElementById(toastId);
        if (toast && toast.parentNode) {
            toast.style.opacity = '0';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }
    }

    /**
     * Escape HTML characters to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * generate random UUID
     * @returns {string} UUID
     */
    _generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Toast;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.Toast = Toast;
}

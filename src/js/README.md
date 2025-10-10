# Toast Notification System

A lightweight, reusable toast notification library extracted from the Groceries app for easy use in other applications.

## Features

- ✅ Multiple toast types (success, error, warning, info)
- 🎯 Configurable positioning (left, right, center)
- ⏰ Auto-dismiss with custom duration
- ❌ Manual dismiss with close button
- 🎨 Smooth animations
- 📚 Multiple toasts support
- 🔧 Both instance and static API
- 🛡️ XSS protection with HTML escaping

## Usage

### Quick Start

Include the toast.js file in your HTML:

```html
<script src="./js/toast.js"></script>
```

Make sure you have the toast CSS styles included (see `_components.scss` for the required styles).

### Static Methods (Recommended)

```javascript
// Show different types of toasts
Toast.success('Operation completed successfully!');
Toast.error('Something went wrong!');
Toast.warning('Please check your input');
Toast.info('Information message');

// Dismiss specific toast by ID
const toastId = Toast.success('This is a toast');
Toast.dismiss(toastId);

// Dismiss all toasts
Toast.dismissAll();

// Clear all toasts immediately (no animation)
Toast.clear();
```

### Instance API

```javascript
// Create a new toast instance with custom options
const toast = new Toast({
    position: 'left',    // 'left', 'right', 'center'
    duration: 5000,      // milliseconds, 0 for no auto-dismiss
    className: 'custom'  // additional CSS classes
});

// Show toasts using the instance
toast.show('Hello World!', 'success');
toast.show('Custom toast', 'info', {
    duration: 0,  // Override default duration
    position: 'center'
});

// Instance methods
toast.dismiss('toast-id');
toast.dismissAll();
toast.clear();
toast.setPosition('right');
toast.setDuration(3000);
```

### Advanced Usage

```javascript
// Create toast with custom options
Toast.success('Success message', {
    duration: 10000,     // Show for 10 seconds
    position: 'center',  // Override default position
    className: 'large'   // Add custom CSS class
});

// Create persistent toast (no auto-dismiss)
Toast.error('Critical error', { duration: 0 });

// Multiple instances for different areas
const headerToast = Toast.create({ position: 'center' });
const sidebarToast = Toast.create({ position: 'left' });

headerToast.info('Header notification');
sidebarToast.warning('Sidebar warning');
```

## Toast Types

- **success**: Green border, checkmark icon
- **error/danger**: Red border, alert icon  
- **warning**: Orange border, warning icon
- **info**: Blue border, info icon

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `position` | string | `'right'` | Toast container position: 'left', 'right', 'center' |
| `duration` | number | `3000` | Auto-dismiss duration in milliseconds, 0 for no auto-dismiss |
| `className` | string | `''` | Additional CSS classes to apply to the toast |

## CSS Requirements

The toast system requires specific CSS styles to work properly. Include the toast styles from `_components.scss`:

```scss
// Toast container positioning
#toast-container {
  position: fixed;
  top: 1rem;
  z-index: 9999;
  pointer-events: none;
  
  &.right { right: 1rem; }
  &.left { left: 1rem; }
  &.center { 
    left: 50%;
    transform: translateX(-50%);
  }
}

// Toast styling
.toast {
  background: var(--pico-background-color);
  border: 1px solid var(--pico-muted-border-color);
  border-radius: var(--pico-border-radius);
  box-shadow: var(--pico-box-shadow);
  margin-bottom: 0.5rem;
  max-width: 350px;
  opacity: 0;
  pointer-events: auto;
  transform: translateX(100%);
  transition: all 0.3s ease-in-out;
  
  &.success { border-left: 4px solid var(--pico-ins-color); }
  &.error, &.danger { border-left: 4px solid var(--pico-del-color); }
  &.warning { border-left: 4px solid #f39c12; }
  &.info { border-left: 4px solid var(--pico-primary); }
}

// Toast content layout
.toast-content {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  gap: 0.5rem;
}

.toast-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.toast-message {
  flex: 1;
  font-size: 0.875rem;
  line-height: 1.4;
}

.toast-close {
  background: none;
  border: none;
  color: var(--pico-muted-color);
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0;
  
  &:hover { color: var(--pico-color); }
}
```

## Browser Support

This library uses modern JavaScript features and should work in all modern browsers. For older browser support, you may need to transpile the code.

## License

This toast system is part of the TangoMan Groceries project and follows the same license terms.

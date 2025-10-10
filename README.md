![GH language](https://img.shields.io/github/languages/top/TangoMan75/groceries)
[![GH release](https://img.shields.io/github/v/release/TangoMan75/groceries)](https://github.com/TangoMan75/groceries/releases)
![GH license](https://img.shields.io/github/license/TangoMan75/groceries)
![GH stars](https://img.shields.io/github/stars/TangoMan75/groceries)
[![CI Status](https://github.com/TangoMan75/groceries/workflows/CI/badge.svg)](https://github.com/TangoMan75/groceries/actions/workflows/ci.yml)
![Visitors](https://api.visitorbadge.io/api/visitors?path=https%3A%2F%2Fgithub.com%2FTangoMan75%2Fgroceries&labelColor=%23697689&countColor=%2337d67a&style=flat)

TangoMan Groceries
==================

Simple, offline-first grocery list in vanilla JavaScript
--------------------------------------------------------

A fast and lightweight grocery list app built with vanilla JavaScript and Parcel. Manage items, import/export JSON, and enjoy smooth UX with toast notifications.

- [https://tangoman75.github.io/groceries](https://tangoman75.github.io/groceries)

🚀 Features
-----------

### ⚡ Grocery Management

1. **Import and Merge JSON:** Merge items from a `.json` file, auto-generating IDs and skipping duplicates by `(store, item)` case-insensitively.
2. **Export Items:** One-click export to `groceries-items-YYYYMMDD-HHMMSS.json`.
3. **Edit and Manage:** Add, edit, delete items from the `✏️ Manage Items` tab.

### ⚡ Experience & Reliability

1. **Toast Notifications:** Success, error, warning, info toasts with animations and auto-dismiss.
2. **Offline Storage:** Persists data using browser `localStorage` (no backend required).

📦 Installation
---------------

Setup Instructions.

1. Clone the repo and install dependencies.
2. Node.js 18+ recommended.
3. Use Yarn or npm.

```bash
# install
yarn install
# or
npm install

# start dev server
yarn watch
# or
npm run watch

# production build
yarn build
# or
npm run build
```

🛠️ Usage
--------

A clear, step-by-step guide on how to use your project.

1. **Open Manage Items:** Go to the `✏️ Manage Items` tab to add, edit, or remove items.
2. **Import JSON:** Click `Import`, choose a `.json` file with an array of items having at least `store` and `item` fields; `price` is optional.
3. **Export JSON:** Click `Export` to download the current list as JSON.

🖇️ Dependencies / Requirements
------------------------------

**TangoMan Groceries** requires the following dependencies:

1. Parcel 2 (bundler) and related transformers (`@parcel/transformer-sass`, `@parcel/packager-raw-url`).
2. A modern browser with `localStorage` support.
3. Node.js and Yarn or npm for development.

🐛 Limitations
--------------

Optional description of known bugs and limitations

1. ⚠️ **No Sync:** Data is local to the browser; no cloud sync.
2. ⚠️ **Single User:** No multi-user or real-time collaboration.
3. ⚠️ **No Auth:** Anyone with device access can view/edit the list.

📝 Notes
--------

Data is stored in `localStorage`. Toasts are provided by a reusable `Toast` class with multiple types and smooth animations.

🤝 Contributing
---------------

Thank you for your interest in contributing to **TangoMan Groceries**.

Please review the [code of conduct](https://www.google.com/search?q=./CODE_OF_CONDUCT.md) and [contribution guidelines](https://www.google.com/search?q=./CONTRIBUTING.md) before starting to work on any features.

If you want to open an issue, please check first if it was not [reported already](https://www.google.com/search?q=https://github.com/%5BUSERNAME%5D/%5BREPOSITORY%5D/issues) before creating a new one.

📜 License
----------

Copyrights (c) 2025 "Matthias Morin" <mat@tangoman.io>

[![License](https://img.shields.io/badge/Licence-MIT-green.svg)](LICENSE)
Distributed under the MIT license.

If you like **TangoMan Groceries** please star, follow or tweet:

[![GitHub stars](https://img.shields.io/github/stars/TangoMan75/shoe?style=social)](https://github.com/TangoMan75/shoe/stargazers)
[![GitHub followers](https://img.shields.io/github/followers/TangoMan75?style=social)](https://github.com/TangoMan75)
[![Twitter](https://img.shields.io/twitter/url?style=social&url=https%3A%2F%2Fgithub.com%2FTangoMan75%2Fshoe)](https://twitter.com/intent/tweet?text=Wow:&url=https%3A%2F%2Fgithub.com%2FTangoMan75%2Fshoe)

🙏 Acknowledgements
-------------------

- **Parcel:** Zero-config web application bundler used for development and builds.
- **Shields.io:** Badges for GitHub metadata displayed in this README.
- **VisitorBadge:** Simple visitor counter badge service.

👋 Let's Build Your Next Project Together !
-------------------------------------------

Clean code. Clear communication.

From first sketch to final launch, I've got your back.

[![tangoman.io](https://img.shields.io/badge/✉️%20Get%20in%20touch%20now%20!-FD9400?style=for-the-badge)](https://tangoman.io)

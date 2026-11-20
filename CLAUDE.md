# Tab Sleep

A Chrome extension (Manifest V3) that discards inactive tabs to reduce memory use, with a memory-pressure mode. Plain HTML, CSS and JavaScript; no build step and no dependencies. See README.md for features and defaults.

## Running and checking

- Load it: open `chrome://extensions`, enable Developer mode, click **Load unpacked** and pick this folder. After a change, click the reload icon on the extension card.
- Debug the background logic from the card's **service worker** link (DevTools for `background.js`). Debug the popup and options pages by right-clicking them and choosing **Inspect**.
- There are no tests or linters. Check every change in Chrome: the popup, the settings page, and an actual tab being discarded (shorten the thresholds in settings to test).

## Layout

- `manifest.json`: MV3 manifest and permissions (`tabs`, `storage`, `alarms`, `system.memory`)
- `background.js`: service worker; periodic checks via `chrome.alarms` and the discard logic
- `popup.html/.css/.js`: stats, memory status, toggle and "Sleep inactive tabs now"
- `options.html/.css/.js`: settings page; settings live in `chrome.storage.sync`

## Rules

- The service worker can be stopped at any time. Keep no state in global variables between events; persist it in `chrome.storage` and schedule work with `chrome.alarms`, not `setInterval`.
- Do not add permissions to `manifest.json` without asking first; each one shows a new warning to users.
- Keep the exclusions working: never discard the active tab, pinned tabs or audible tabs (when those options are on), or excluded domains, subdomains included.
- Bump `version` in `manifest.json` for every user-visible change.
- `.DS_Store` should not be committed; add it to a `.gitignore` if you touch that area.

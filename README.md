# Ghostwriter AI Chrome Extension
[watch the demo here](https://www.youtube.com/watch?v=kInvV8zx8hM)
Ghostwriter AI is a production-oriented Chrome Extension built with TypeScript, Manifest V3, Vite, and React. It brings Cursor-style inline autocomplete to editable fields across nearly any website by rendering non-destructive ghost text suggestions that can be accepted with `Tab`.

## Features

- Inline AI autocomplete for `textarea`, `input[type="text"]`, `input[type="search"]`, and `contenteditable` elements
- Ghost text overlay that does not mutate the live field value while suggestions are previewed
- `Tab` acceptance with undo-friendly insertion via `setRangeText()` or `execCommand("insertText")`
- Debounced background requests with per-tab cancellation and recent-prompt caching
- Secure API key handling through extension storage and background-only network requests
- MutationObserver support for dynamic pages, SPA flows, and newly mounted editors
- Popup and options page for enabling the extension, managing providers, and saving settings
- Google Gemini (Cloud) and Chrome Built-in AI (On-device Gemini Nano) providers for advanced, reliable suggestions
- `Ctrl+Space` shortcut for manually triggering a fresh suggestion

## Architecture

```text
src/
  background/    Background service worker and request broker
  content/       Inline autocomplete controller, DOM observers, overlay renderer
  popup/         React popup UI
  options/       React options page UI
  services/      Storage and AI provider services
  utils/         DOM, logging, and text helpers
  hooks/         Shared React hooks
  styles/        Shared popup/options styling
  types/         Shared TypeScript contracts
manifest.json    Manifest V3 definition
```

### Runtime design

1. The content script detects focused editable elements and watches typing, focus, blur, selection, resize, scroll, and DOM mutations.
2. When the caret is at the end and no text is selected, the content script debounces a suggestion request.
3. The background service worker performs the AI request, cancels stale in-flight work, and returns only the continuation text.
4. The content script renders the returned continuation as ghost text in an overlay aligned to the active editor.
5. Pressing `Tab` inserts the suggestion into the live field while preserving native editing behavior as much as possible.

## How It Works

### Editable detection

- Uses delegated document listeners for focus, input, keyboard, and selection activity
- Detects supported text controls and `contenteditable` elements
- Watches DOM mutations so dynamically inserted editors become eligible automatically

### Suggestion lifecycle

- Debounces requests with a default `250ms` delay
- Cancels older in-flight background requests per tab with `AbortController`
- Avoids duplicate requests for the same prompt
- Caches recent prompt completions for fast re-use

### Ghost text rendering

- Keeps the user’s actual field value untouched while previewing completions
- Mirrors typography and spacing styles from the active field
- Syncs overlay position on scroll, resize, selection movement, and layout changes
- Adapts color opacity to the active field’s computed text color for better light/dark compatibility

## Installation

### 1. Install dependencies

```bash
npm install
```

### 2. Start a development build

```bash
npm run dev
```

This watches the project and rebuilds the extension into `dist/`.

### 3. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable Developer Mode
3. Click **Load unpacked**
4. Select the generated `dist/` directory

## Build

```bash
npm run build
```

The production bundle is emitted to `dist/`.

## Configuration

Use the popup or options page to manage:

- Extension enabled state
- Provider selection
- OpenRouter API key
- Model name
- Debounce timing

The API key is stored separately from public runtime settings so the content script does not need direct access to it.

## Screenshots

- `[Placeholder] Popup UI`
- `[Placeholder] Options page`
- `[Placeholder] Inline ghost text in a textarea`

## Development Notes

- `npm run dev` uses Vite in watch mode for extension-friendly builds
- The background service worker handles all provider requests
- The popup and options pages are standard React entry points
- The Chrome Built-in AI provider runs a local Gemini Nano model on-device and does not require any network calls or API keys

## Future Improvements

- Streaming token-by-token ghost text
- Additional providers such as Anthropic, Azure OpenAI, or local models
- Smarter editor adapters for complex rich text environments
- Better context windows using nearby form labels and surrounding DOM content
- Optional per-site rules and blacklist support
- Telemetry and diagnostics for suggestion latency
- Improved multi-line caret positioning for advanced editors

## License

MIT

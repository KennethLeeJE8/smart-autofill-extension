# Smart Autofill Browser Extension

A cross-browser compatible extension that helps you fill forms automatically with your saved personal information.

## Features

- Save and manage personal information
- Store multiple addresses
- Save payment methods
- Automatic form field detection
- Cross-browser compatibility (Chrome, Firefox, Edge)
- Secure local storage of sensitive data
- Context menu integration
- Keyboard shortcuts support

## Installation

### Chrome/Edge
1. Download or clone this repository
2. Open Chrome/Edge and go to `chrome://extensions`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

### Firefox
1. Download or clone this repository
2. Open Firefox and go to `about:debugging`
3. Click "This Firefox" in the left sidebar
4. Click "Load Temporary Add-on"
5. Select any file in the extension directory

## Usage

1. Click the extension icon in your browser toolbar
2. Add your personal information, addresses, and payment methods
3. When visiting a website with forms:
   - The extension will automatically detect and fill matching fields
   - Use the context menu (right-click) and select "Fill Forms"
   - Use the keyboard shortcut (default: Ctrl+Shift+F)

## Security

- All data is stored locally in your browser
- No data is sent to external servers
- Sensitive information like credit card numbers are partially masked in the UI

## Development

The extension is built using:
- HTML/CSS/JavaScript
- Chrome Extension Manifest V3
- WebExtensions API

## Contributing

Feel free to submit issues and enhancement requests! 
# Minimalist Markdown Editor

A sleek, clutter-free markdown editor built with Electron. Features a split-pane layout, real-time preview, auto-save, and a premium dark aesthetic.

## Features
*   **Minimalist Design**: Distraction-free interface with glassmorphism effects.
*   **Offline Capable**: Works 100% without an internet connection.
*   **Auto-Save**: Never lose your work (debounced saving).
*   **In-Place Rename**: Double-click the file title to rename instantly.
*   **Cross-Platform CodeBase**: Ready for Windows, Mac, and Linux.

## Development

1.  **Clone the repository**
    ```bash
    git clone https://github.com/Rajat-malhotra0/Minimalist-Markdown.git
    cd Minimalist-Markdown
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Run Locally**
    ```bash
    npm start
    ```

## How to Build (Create Executable)

This project uses `electron-builder` to create installers.

### Important: Windows Permissions
**Windows Users:** The build process creates symbolic links which requires administrator privileges.

**You MUST run your terminal (Command Prompt / PowerShell) as Administrator** before running the build command.
*   *If you don't, you will see a `Cannot create symbolic link` error.*

### Build Command
Once your terminal is running as Admin:

```bash
# Build for Windows (Results in /dist folder)
npm run dist
```

### Cross-Platform Build
To attempt building for all platforms (Windows, Mac, Linux) from a single machine:

```bash
npm run dist -- -mwl
```
*(Note: Mac builds created on Windows will not be signed and may show security warnings on macOS)*

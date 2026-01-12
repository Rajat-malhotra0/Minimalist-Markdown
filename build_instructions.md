# Build Instructions

To create a production-ready executable for Windows:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Build the Installer**:
    ```bash
    npm run dist
    ```

3.  **Locate the Output**:
    The executable and installer will be created in the `dist` folder.
    *   **Windows**: `dist/Minimalist Markdown Setup 1.0.0.exe`
    *   **Linux**: `dist/Minimalist Markdown 1.0.0.AppImage` (if built)
    *   **Mac**: `dist/Minimalist Markdown 1.0.0.dmg` (if built)

## Building for Other Platforms
*   **Linux**: You can typically build Linux binaries on Windows.
*   **Mac**: For the best results, build the Mac version **on a Mac**. You *can* build it on Windows, but it won't be signed (users will get a security warning).

To build all platforms (may require extra setup):
```bash
npm run dist -- -mwl
```

## Customization
To change the version, author, or description, edit `package.json`.
To change the icon, replace `src/assets/icon.png`.

## Troubleshooting

### "Cannot create symbolic link" Error
If you see an error like `A required privilege is not held by the client` during the build:
1.  **Run as Administrator**: Open your terminal (PowerShell or Command Prompt) as **Administrator** and run `npm run dist` again.
2.  **Developer Mode**: Alternatively, enable "Developer Mode" in Windows Settings > Update & Security > For developers.

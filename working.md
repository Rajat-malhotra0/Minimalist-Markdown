# How Minimalist Markdown Editor Works

Welcome! This document explains the inner workings of the Minimalist Markdown Editor. It is designed for beginners to understand how a desktop application is built using web technologies (HTML, CSS, JavaScript) and **Electron**.

## 1. The Big Picture: What is Electron?

Electron allows us to build desktop apps using the same tools used for websites. Think of it as a special web browser (like Chrome) dedicated to running just one app, plus a powerful backend (Node.js) that can talk to your computer's file system.

### Simplified Architecture

```ascii
+---------------------------------------------------------+
|                   YOUR COMPUTER (OS)                    |
+---------------------------------------------------------+
            |                           |
            v                           v
+-----------------------+   +---------------------------+
|    Main Process       |   |     Renderer Process      |
|      (Node.js)        |   |    (Chromium Website)     |
|                       |   |                           |
|  - Controls Windows   |   |  - UI (HTML/CSS)          |
|  - Reads/Writes Files |   |  - Handles User Input     |
|  - System Dialogs     |   |  - Renders Markdown       |
+-----------------------+   +---------------------------+
            ^                           ^
            |                           |
            +----------- IPC -----------+
            (Inter-Process Communication)
```

## 2. Key Components & Files

Here is a breakdown of the files in this project and what they do:

| File Name | Role | Analogy |
| :--- | :--- | :--- |
| **`main.js`** | The "Brain" (Main Process). It starts the app, creates the window, and listens for system commands (like "Save File"). | The Manager who has the keys to the office. |
| **`src/index.html`** | The "Skeleton" (Renderer). The structure of the page (Editor on left, Preview on right). | The blank canvas of a painting. |
| **`src/renderer.js`** | The "Artist" (Renderer Logic). It takes your typing and turns it into the visual preview. It also asks the Main Process to save files. | The painter who draws on the canvas. |
| **`preload.js`** | The "Translator" (Bridge). A secure bridge that allows the Renderer to talk to the Main Process without exposing the entire computer to the web page. | A security guard passing messages between rooms. |
| **`src/styles.css`** | The "Stylist". Defines the dark theme, fonts, and smooth animations. | The interior designer. |

## 3. Key Features

### A. File Management (Open/Save)
*   **Status Indicator**: The filename in the title bar shows an asterisk (`*`) if you have unsaved changes.
*   **Shortcut**: `Ctrl+S` auto-saves to the file.

### B. Preview Only Mode
*   **Toggle**: Go to `View > Toggle Preview Only` or press `Ctrl+Shift+P`.
*   **Behavior**: This hides the editor and expands the preview to full width for reading.

## 4. The Communication Flow (IPC)

Since the **Renderer** (the web page) is sandboxed for security, it cannot directly touch your hard drive. It must ask the **Main Process** to do it. This "asking" is done via **IPC (Inter-Process Communication)**.

### Example: Saving a File

Here is step-by-step what happens when you press `Ctrl+S`:

1.  **User Action**: You press `Ctrl+S` or click "Save".
2.  **Renderer**: `renderer.js` detects this and calls `window.electronAPI.saveFile()`.
3.  **Preload**: `preload.js` takes this call and sends a message `'save-file'` to the Main Process.
4.  **Main Process**: `main.js` hears `'save-file'`, takes the text content, and writes it to the hard drive using Node.js `fs` (file system) module.
5.  **Response**: `main.js` sends back a "Success" message.
6.  **Update UI**: `renderer.js` receives "Success" and changes the status to "Saved".

```ascii
[renderer.js]        [preload.js]          [main.js]             [Hard Drive]
      |                    |                   |                      |
      |  1. saveFile()     |                   |                      |
      |------------------->|                   |                      |
      |                    |  2. IPC Invoke    |                      |
      |                    |------------------>|                      |
      |                    |                   |  3. fs.writeFile()   |
      |                    |                   |--------------------->|
      |                    |                   |                      | [Saved!]
      |                    |                   |  4. Return Success   |
      |                    |  <----------------|                      |
      |  5. Update UI      |                   |                      |
      |<-------------------|                   |                      |
      v                    v                   v                      v
```

## 4. Code Deep Dive

### The Bridge (`preload.js`)
This is the most critical security feature. We expose only specific functions to the window.

```javascript
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // The renderer calls this function...
  saveFile: (path, content) => 
    // ...which sends a secure message to the Main Process
    ipcRenderer.invoke('save-file', path, content)
});
```

### The Listener (`main.js`)
The main process sits and waits for the message.

```javascript
const { ipcMain } = require('electron');
const fs = require('fs').promises;

// Listen for the 'save-file' message
ipcMain.handle('save-file', async (event, filePath, content) => {
    try {
        // ACTUALLY write to the computer
        await fs.writeFile(filePath, content, 'utf-8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

## 5. Markdown Rendering Pipeline

How does text become styled HTML?

1.  **Input**: You type `# Hello` in the textarea.
2.  **Event**: The `input` event triggers in `renderer.js`.
3.  **Library**: We pass the text to a library called **`marked`**.
    *   `marked` converts `# Hello` -> `<h1>Hello</h1>`.
4.  **Highlighting**: We pass code blocks to **`highlight.js`** to colorize code syntax.
5.  **Output**: The resulting HTML is inserted into the `<div id="preview">`.

```javascript
// renderer.js simplified
function render() {
    const rawText = editor.value;
    const html = marked.parse(rawText); // Convert to HTML
    preview.innerHTML = html;           // Update the page
}
```

## 6. Project Structure

```
minimalist_markdown/
├── main.js              (Entry point, Node.js environment)
├── preload.js           (Bridge, Security layer)
├── package.json         (Project settings & dependencies)
└── src/
    ├── index.html       (The layout)
    ├── styles.css       (The looks)
    └── renderer.js      (The frontend logic)
```

## 7. Troubleshooting

If the application is not starting or behaviors seem odd, try these steps:

### A. App Won't Open / White Screen
1.  **Check Terminal**: Look for errors in the terminal where you ran `npm start`.
2.  **Dependencies**: Ensure all libraries are installed. Run:
    ```bash
    npm install
    ```
3.  **Processes**: Sometimes an old Electron process gets stuck.
    *   **Windows**: Task Manager -> End Task `Electron` or `Node.js`.
    *   **Mac/Linux**: `pkill -f electron`

### B. "Module Not Found" Error
This usually happens if the preload script tries to load a library that isn't allowed.
*   **Fix**: We load libraries like `marked` and `highlight.js` via `<script>` tags in `index.html` (using CDNs) instead of requiring them in `preload.js`.

### C. File Save Doesn't Work
1.  **Check Console**: Uncomment `mainWindow.webContents.openDevTools();` in `main.js` to see errors.
2.  **Permissions**: Ensure the app has permission to write to the folder.

### D. Typing Feels Laggy
*   **Performance**: The app uses a "debounce" timer. It waits for you to stop typing for a split second before converting Markdown to HTML. This keeps it fast.

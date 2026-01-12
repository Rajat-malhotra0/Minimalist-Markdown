const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const fileStatus = document.getElementById('file-status');
const saveStatus = document.getElementById('save-status');
const resizer = document.getElementById('resizer');
const container = document.querySelector('.container');

let currentFilePath = null;
let isDirty = false;
let saveTimeout = null;
let renderTimeout = null;
const DEBOUNCE_DELAY = 2000;
const PREVIEW_DELAY = 10; // Instant preview

// --- Markdown Rendering ---

function renderMarkdown() {
    const markdownText = editor.value;
    if (!markdownText.trim()) {
        preview.innerHTML = '<div class="empty-state">Preview</div>';
        return;
    }
    try {
        // Use marked from global scope (loaded via script tag)
        if (typeof marked !== 'undefined') {
            preview.innerHTML = marked.parse(markdownText);

            // Apply syntax highlighting
            if (typeof hljs !== 'undefined') {
                preview.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            }
        } else {
            console.error('marked library not loaded');
        }
    } catch (err) {
        console.error('Markdown rendering failed:', err);
    }
}

// Low latency render
function scheduleRender() {
    // Immediate render request via microtask if possible, or very short timeout
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(renderMarkdown, PREVIEW_DELAY);
}

editor.addEventListener('input', () => {
    scheduleRender();
    handleInputChange();
});

// --- Auto-Save & Dirty State ---

function handleInputChange() {
    if (!isDirty) {
        isDirty = true;
        updateUI();
    }

    // Reset auto-save timer
    clearTimeout(saveTimeout);

    if (currentFilePath) {
        saveTimeout = setTimeout(() => {
            saveFile();
        }, DEBOUNCE_DELAY);
    }
}

function updateUI() {
    let fileName = currentFilePath ? currentFilePath.split(/[\\/]/).pop() : 'Untitled';
    if (isDirty) fileName += '*';
    fileStatus.textContent = fileName;
}

// --- Rename Functionality ---
fileStatus.addEventListener('dblclick', () => {
    if (!currentFilePath) return; // Can't rename unsaved file on disk

    const currentName = currentFilePath.split(/[\\/]/).pop();
    // Create input
    const input = document.createElement('input');
    input.value = currentName;
    input.spellcheck = false;

    // Replace text with input
    fileStatus.textContent = '';
    fileStatus.appendChild(input);
    input.focus();
    input.select();

    const commitRename = async () => {
        const newName = input.value.trim();
        if (newName && newName !== currentName) {
            try {
                const result = await window.electronAPI.renameFile(currentFilePath, newName);
                if (result.success) {
                    currentFilePath = result.newPath;
                    updateUI();
                } else {
                    alert('Rename failed: ' + result.error);
                    updateUI(); // Revert
                }
            } catch (err) {
                alert('Rename failed: ' + err.message);
                updateUI();
            }
        } else {
            updateUI(); // Revert if empty or same
        }
    };

    input.addEventListener('blur', commitRename);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur(); // Triggers commitRename
        } else if (e.key === 'Escape') {
            updateUI(); // Cancel
        }
    });
});

// --- File Operations ---

async function openFile() {
    try {
        const result = await window.electronAPI.openFile();
        if (result && !result.canceled) {
            editor.value = result.content;
            currentFilePath = result.filePath;
            isDirty = false;

            renderMarkdown(); // Immediate render on open
            updateUI();
        }
    } catch (error) {
        // Only alert on actual errors, not cancellation
        if (error.message) alert('Failed to open file: ' + error.message);
    }
}

async function saveFile() {
    if (!currentFilePath) {
        return saveFileAs();
    }

    try {
        const content = editor.value;
        const result = await window.electronAPI.saveFile(currentFilePath, content);

        if (result.success) {
            isDirty = false;
            updateUI();
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        alert('Failed to save file: ' + error.message);
    }
}

async function saveFileAs() {
    try {
        const content = editor.value;
        const result = await window.electronAPI.saveFileAs(content);

        if (result && !result.canceled) {
            if (result.success) {
                currentFilePath = result.filePath;
                isDirty = false;
                updateUI();
            } else {
                throw new Error(result.error || 'Unknown error');
            }
        }
    } catch (error) {
        alert('Failed to save file: ' + error.message);
    }
}

// --- Keyboard & Menu Handlers ---

// Listen for keyboard shortcuts via menu (if triggered there) or allow defaults
// Actually, menu items trigger IPC messages, which we listen to:

window.electronAPI.onMenuOpen(() => openFile());

window.electronAPI.onMenuSave(() => saveFile());

window.electronAPI.onMenuSaveAs(() => saveFileAs());

window.electronAPI.onMenuTogglePreview(() => {
    container.classList.toggle('preview-only');
});

// Also handle Ctrl+S in editor if menu didn't catch it (though main process menu usually traps it first)
editor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (e.shiftKey) {
            saveFileAs();
        } else {
            saveFile();
        }
        e.preventDefault();
    }
});


// --- Split Pane Resizing ---
let isResizing = false;

resizer.addEventListener('mousedown', (e) => {
    isResizing = true;
    resizer.classList.add('active');
    document.addEventListener('mousemove', resize);
    document.addEventListener('mouseup', stopResize);
    // Prevent text selection during drag
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
});

function resize(e) {
    if (!isResizing) return;
    const containerWidth = container.offsetWidth;
    // Calculate percentage
    let newLeftWidth = (e.clientX / containerWidth) * 100;

    // Snap to edges (Access to full 0% or 100%)
    if (newLeftWidth < 5) newLeftWidth = 0;
    if (newLeftWidth > 95) newLeftWidth = 100;

    // Apply width (No min/max constraints 10-90)
    document.querySelector('.editor-pane').style.flex = `0 0 ${newLeftWidth}%`;
}

function stopResize() {
    isResizing = false;
    resizer.classList.remove('active');
    document.removeEventListener('mousemove', resize);
    document.removeEventListener('mouseup', stopResize);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
}

// --- Scroll Syncing ---
let isScrolling = false;
let timeout = null;

const syncScroll = (source, target) => {
    if (isScrolling) return;

    isScrolling = true;

    // Calculate percentage
    const percentage = source.scrollTop / (source.scrollHeight - source.offsetHeight);

    // Apply to target
    target.scrollTop = percentage * (target.scrollHeight - target.offsetHeight);

    clearTimeout(timeout);
    timeout = setTimeout(() => {
        isScrolling = false;
    }, 50);
};

editor.parentElement.addEventListener('scroll', (e) => {
    // We need to listen on the pane wrapper, not the textarea itself if the textarea is 100% height
    // In CSS: .pane has overflow-y: overlay, textarea has height: 100%
    // So the scroll is actually on .pane (editor-pane)
    if (e.target.classList.contains('editor-pane')) {
        syncScroll(e.target, preview);
    }
});

// For textarea, it might not scroll if it fits, but if it's taller, .pane scrolls.
// Let's attach to editor-pane directly just to be safe in setup.
document.querySelector('.editor-pane').addEventListener('scroll', () => {
    syncScroll(document.querySelector('.editor-pane'), preview);
});

preview.addEventListener('scroll', () => {
    syncScroll(preview, document.querySelector('.editor-pane'));
});

// --- Cleanup ---
// Ensure timers are cleared if needed (though on close app dies)
window.addEventListener('beforeunload', () => {
    clearTimeout(saveTimeout);
    clearTimeout(renderTimeout);
    clearTimeout(timeout);
});

// Initial Render
renderMarkdown();

// --- About Modal ---
const aboutModal = document.getElementById('about-modal');
const closeAboutBtn = document.getElementById('close-about');
const yearSpan = document.getElementById('year');

if (yearSpan) yearSpan.textContent = new Date().getFullYear();

window.electronAPI.onMenuAbout(() => {
    if (aboutModal) aboutModal.classList.remove('hidden');
});

if (closeAboutBtn) {
    closeAboutBtn.addEventListener('click', () => {
        if (aboutModal) aboutModal.classList.add('hidden');
    });
}

// Close on outside click
if (aboutModal) {
    aboutModal.addEventListener('click', (e) => {
        if (e.target === aboutModal) {
            aboutModal.classList.add('hidden');
        }
    });
}

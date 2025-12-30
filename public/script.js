// API Base URL
const API_BASE = '';

// Global variables
let currentFileIdForRename = null;

// DOM Elements
const singleUploadForm = document.getElementById('singleUploadForm');
const multipleUploadForm = document.getElementById('multipleUploadForm');
const filesTableBody = document.getElementById('filesTableBody');
const refreshBtn = document.getElementById('refreshBtn');
const downloadZipBtn = document.getElementById('downloadZipBtn');
const downloadBase64Btn = document.getElementById('downloadBase64Btn');
const toast = document.getElementById('toast');
const renameModal = document.getElementById('renameModal');
const newFilenameInput = document.getElementById('newFilename');
const confirmRenameBtn = document.getElementById('confirmRename');
const cancelRenameBtn = document.getElementById('cancelRename');

// Toast Notification
function showToast(message, type = 'info') {
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

// Load all files
async function loadFiles() {
    try {
        const response = await fetch(`${API_BASE}/files`);
        const files = await response.json();

        if (files.length === 0) {
            filesTableBody.innerHTML = '<tr><td colspan="5" class="no-files">No files uploaded yet</td></tr>';
            return;
        }

        filesTableBody.innerHTML = files.map(file => `
            <tr data-file-id="${file._id}">
                <td><strong>${file.filename}</strong></td>
                <td>${formatFileSize(file.length)}</td>
                <td>${file.contentType || 'N/A'}</td>
                <td>${formatDate(file.uploadDate)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="downloadFile('${file._id}', '${file.filename}')">
                            ⬇️ Download
                        </button>
                        <button class="btn btn-warning" onclick="openRenameModal('${file._id}', '${file.filename}')">
                            ✏️ Rename
                        </button>
                        <button class="btn btn-danger" onclick="deleteFile('${file._id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Failed to load files', 'error');
    }
}

// Upload single file
singleUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const fileInput = document.getElementById('singleFile');
    const submitBtn = singleUploadForm.querySelector('button[type="submit"]');
    
    formData.append('file', fileInput.files[0]);

    // Disable button during upload
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Uploading...';

    try {
        const response = await fetch(`${API_BASE}/upload/file`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.text, 'success');
            fileInput.value = '';
            loadFiles();
        } else {
            showToast(result.error.text, 'error');
        }
    } catch (error) {
        console.error('Error uploading file:', error);
        showToast('Failed to upload file', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload File';
    }
});

// Upload multiple files
multipleUploadForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    const filesInput = document.getElementById('multipleFiles');
    const submitBtn = multipleUploadForm.querySelector('button[type="submit"]');
    
    for (let file of filesInput.files) {
        formData.append('files', file);
    }

    // Disable button during upload
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Uploading...';

    try {
        const response = await fetch(`${API_BASE}/upload/files`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.text, 'success');
            filesInput.value = '';
            loadFiles();
        } else {
            showToast(result.error.text, 'error');
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        showToast('Failed to upload files', 'error');
    } finally {
        // Re-enable button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Upload Files';
    }
});

// Download single file
async function downloadFile(fileId, filename) {
    try {
        const response = await fetch(`${API_BASE}/download/files/${fileId}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('File downloaded successfully', 'success');
    } catch (error) {
        console.error('Error downloading file:', error);
        showToast('Failed to download file', 'error');
    }
}

// Download all files as ZIP
downloadZipBtn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/download/files-zip`);
        if (!response.ok) {
            const error = await response.json();
            showToast(error.error.text, 'error');
            return;
        }
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'files.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('All files downloaded as ZIP', 'success');
    } catch (error) {
        console.error('Error downloading ZIP:', error);
        showToast('Failed to download ZIP', 'error');
    }
});

// Download all files as Base64
downloadBase64Btn.addEventListener('click', async () => {
    try {
        const response = await fetch(`${API_BASE}/download/files-base64`);
        if (!response.ok) {
            const error = await response.json();
            showToast(error.error.text, 'error');
            return;
        }
        const filesData = await response.json();
        
        // Create a JSON file with all base64 data
        const dataStr = JSON.stringify(filesData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'files-base64.json';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showToast('Base64 files downloaded successfully', 'success');
    } catch (error) {
        console.error('Error downloading base64:', error);
        showToast('Failed to download base64 files', 'error');
    }
});

// Open rename modal
function openRenameModal(fileId, currentFilename) {
    currentFileIdForRename = fileId;
    newFilenameInput.value = currentFilename;
    renameModal.classList.add('show');
    newFilenameInput.focus();
}

// Close rename modal
function closeRenameModal() {
    renameModal.classList.remove('show');
    currentFileIdForRename = null;
    newFilenameInput.value = '';
}

// Confirm rename
confirmRenameBtn.addEventListener('click', async () => {
    const newFilename = newFilenameInput.value.trim();
    if (!newFilename) {
        showToast('Please enter a filename', 'error');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/rename/file/${currentFileIdForRename}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename: newFilename })
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.text, 'success');
            closeRenameModal();
            loadFiles();
        } else {
            showToast(result.error.text, 'error');
        }
    } catch (error) {
        console.error('Error renaming file:', error);
        showToast('Failed to rename file', 'error');
    }
});

// Cancel rename
cancelRenameBtn.addEventListener('click', closeRenameModal);

// Close modal on outside click
renameModal.addEventListener('click', (e) => {
    if (e.target === renameModal) {
        closeRenameModal();
    }
});

// Delete file
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/delete/file/${fileId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (response.ok) {
            showToast(result.text, 'success');
            loadFiles();
        } else {
            showToast(result.error.text, 'error');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showToast('Failed to delete file', 'error');
    }
}

// Refresh files
refreshBtn.addEventListener('click', () => {
    loadFiles();
    showToast('Files refreshed', 'info');
});

// Load files on page load
document.addEventListener('DOMContentLoaded', loadFiles);

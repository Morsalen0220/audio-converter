document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const fileNameDisplay = document.getElementById('file-name');
    const convertForm = document.getElementById('convert-form');
    const bitrateInput = document.getElementById('bitrate');
    const bitrateDisplay = document.getElementById('bitrate-display');
    const advancedToggle = document.getElementById('advanced-toggle');
    const advancedSettings = document.getElementById('advanced-settings');
    const advancedIcon = document.getElementById('advanced-icon');
    const convertBtn = document.getElementById('convert-btn');
    const progressContainer = document.getElementById('progress-container');
    const resultContainer = document.getElementById('result-container');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const downloadBtn = document.getElementById('download-btn');
    const convertAnotherBtn = document.getElementById('convert-another-btn');

    let selectedFile = null;

    // Bitrate slider logic
    bitrateInput.addEventListener('input', (e) => {
        bitrateDisplay.textContent = `${e.target.value} kbps`;
    });

    // Advanced Settings Toggle
    advancedToggle.addEventListener('click', () => {
        advancedSettings.classList.toggle('hidden');
        if (advancedSettings.classList.contains('hidden')) {
            advancedIcon.classList.remove('rotate-180');
        } else {
            advancedIcon.classList.add('rotate-180');
        }
    });

    // File Upload Logic (Click)
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and Drop Logic
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
            fileInput.files = files; // Sync with file input
        }
    }, false);

    function handleFile(file) {
        if (file.type.startsWith('audio/')) {
            selectedFile = file;
            fileNameDisplay.textContent = `Selected: ${file.name}`;
            fileNameDisplay.classList.remove('hidden');
            errorContainer.classList.add('hidden');
        } else {
            selectedFile = null;
            fileNameDisplay.textContent = '';
            fileNameDisplay.classList.add('hidden');
            showError('Please select a valid audio file.');
        }
    }

    // Form Submission
    convertForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            showError('Please select an audio file to convert.');
            return;
        }

        const formData = new FormData(convertForm);
        formData.append('audio', selectedFile);
        const currentBitrate = formData.get('bitrate');
        formData.set('bitrate', `${currentBitrate}k`); // Format for ffmpeg (e.g. 192k)

        // UI Updates
        errorContainer.classList.add('hidden');
        convertForm.classList.add('hidden');
        progressContainer.classList.remove('hidden');

        try {
            const response = await fetch('/convert', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            progressContainer.classList.add('hidden');

            if (response.ok && data.success) {
                resultContainer.classList.remove('hidden');
                downloadBtn.href = data.downloadUrl;
                downloadBtn.download = data.downloadUrl.split('/').pop();
            } else {
                convertForm.classList.remove('hidden');
                showError(data.error || 'An error occurred during conversion.');
            }
        } catch (error) {
            console.error('Error:', error);
            progressContainer.classList.add('hidden');
            convertForm.classList.remove('hidden');
            showError('A network error occurred. Please try again.');
        }
    });

    // Convert Another
    convertAnotherBtn.addEventListener('click', () => {
        resultContainer.classList.add('hidden');
        convertForm.classList.remove('hidden');
        // Optional: clear file
        // selectedFile = null;
        // fileNameDisplay.classList.add('hidden');
        // fileInput.value = '';
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
    }
});

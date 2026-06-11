const { FFmpeg } = window.FFmpegWASM;
const { fetchFile, toBlobURL } = window.FFmpegUtil;

let ffmpeg = null;

document.addEventListener('DOMContentLoaded', async () => {
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

    const statusContainer = document.getElementById('status-container');
    const statusMessage = document.getElementById('status-message');

    let selectedFile = null;
    let objectUrl = null;

    // Initialize FFmpeg
    try {
        ffmpeg = new FFmpeg();
        ffmpeg.on('log', ({ message }) => {
            console.log('[FFmpeg]', message);
        });

        ffmpeg.on('progress', ({ progress, time }) => {
            // progress is a ratio 0 to 1
            console.log(`[FFmpeg Progress] ${Math.round(progress * 100)}% (Time: ${time})`);
        });

        const baseURL = '/ffmpeg';
        await ffmpeg.load({
            coreURL: `${baseURL}/ffmpeg-core.js`,
            wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });

        statusContainer.classList.add('hidden');
    } catch (err) {
        console.error('Error loading FFmpeg:', err);
        statusMessage.textContent = 'Failed to load FFmpeg core. Your browser may not support SharedArrayBuffer. Please ensure you are using a modern browser.';
        statusContainer.querySelector('svg').classList.add('hidden');
        statusContainer.classList.replace('bg-blue-50', 'bg-red-50');
        statusContainer.classList.replace('border-blue-500', 'border-red-500');
        statusMessage.classList.replace('text-blue-700', 'text-red-700');
        convertBtn.disabled = true;
    }

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
        if (file.type.startsWith('audio/') || file.type.startsWith('video/')) {
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

        if (!ffmpeg || !ffmpeg.loaded) {
            showError('FFmpeg is still loading. Please wait.');
            return;
        }

        const formData = new FormData(convertForm);
        const format = formData.get('format');
        const bitrate = `${formData.get('bitrate')}k`;
        const sampleRate = formData.get('sampleRate');
        const channels = formData.get('channels');

        // UI Updates
        errorContainer.classList.add('hidden');
        convertForm.classList.add('hidden');
        progressContainer.classList.remove('hidden');

        try {
            // Write input file to virtual filesystem
            const inputFileName = 'input_' + selectedFile.name;
            const outputFileName = `converted_${Date.now()}.${format}`;

            await ffmpeg.writeFile(inputFileName, await fetchFile(selectedFile));

            // Build FFmpeg arguments
            const args = ['-i', inputFileName];

            if (bitrate) {
                args.push('-b:a', bitrate);
            }
            if (sampleRate) {
                args.push('-ar', sampleRate);
            }
            if (channels) {
                args.push('-ac', channels === 'Mono' ? '1' : '2');
            }

            args.push(outputFileName);

            // Execute FFmpeg
            const code = await ffmpeg.exec(args);

            if (code !== 0) {
                throw new Error('FFmpeg conversion failed (exit code ' + code + ')');
            }

            // Read output file
            const data = await ffmpeg.readFile(outputFileName);

            // Cleanup virtual filesystem
            await ffmpeg.deleteFile(inputFileName);
            await ffmpeg.deleteFile(outputFileName);

            progressContainer.classList.add('hidden');

            // Create download URL
            const mimeType = format === 'mp3' ? 'audio/mpeg' : `audio/${format}`;
            const blob = new Blob([data.buffer], { type: mimeType });

            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
            objectUrl = URL.createObjectURL(blob);

            resultContainer.classList.remove('hidden');
            downloadBtn.href = objectUrl;
            downloadBtn.download = outputFileName;

        } catch (error) {
            console.error('Error during conversion:', error);
            progressContainer.classList.add('hidden');
            convertForm.classList.remove('hidden');
            showError(error.message || 'An error occurred during conversion.');
        }
    });

    // Convert Another
    convertAnotherBtn.addEventListener('click', () => {
        resultContainer.classList.add('hidden');
        convertForm.classList.remove('hidden');
    });

    function showError(message) {
        errorMessage.textContent = message;
        errorContainer.classList.remove('hidden');
    }
});

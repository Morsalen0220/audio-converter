const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const app = express();
const port = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Ensure converted directory exists
const convertedDir = path.join(__dirname, 'converted');
if (!fs.existsSync(convertedDir)) {
  fs.mkdirSync(convertedDir);
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

app.use(express.static('public'));
app.use('/converted', express.static('converted'));

app.post('/convert', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { format, bitrate, sampleRate, channels } = req.body;
  if (!format) {
    return res.status(400).json({ error: 'Format is required.' });
  }

  const inputPath = req.file.path;
  const outputFilename = `converted-${Date.now()}.${format}`;
  const outputPath = path.join(convertedDir, outputFilename);

  let command = ffmpeg(inputPath);

  if (bitrate) {
    command = command.audioBitrate(bitrate);
  }
  if (sampleRate) {
    command = command.audioFrequency(parseInt(sampleRate, 10));
  }
  if (channels) {
    command = command.audioChannels(channels === 'Mono' ? 1 : 2);
  }

  command
    .toFormat(format)
    .on('end', () => {
      console.log('Conversion finished');
      // Clean up uploaded file
      fs.unlink(inputPath, (err) => {
        if (err) console.error('Failed to delete uploaded file:', err);
      });
      res.json({
        success: true,
        downloadUrl: `/converted/${outputFilename}`
      });
    })
    .on('error', (err) => {
      console.error('Error during conversion:', err);
      // Clean up uploaded file
      fs.unlink(inputPath, (e) => {
        if (e) console.error('Failed to delete uploaded file:', e);
      });
      res.status(500).json({ error: err.message || 'An error occurred during conversion.' });
    })
    .save(outputPath);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Set headers required for SharedArrayBuffer (needed by ffmpeg.wasm)
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});

// Serve static files
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
  console.log('Serving frontend. Open your browser to begin in-browser conversion.');
});

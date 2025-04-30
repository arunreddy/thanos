import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import compression from 'compression';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// Enable gzip compression
app.use(compression());

// Serve static assets
app.use('/assets', express.static(resolve(__dirname, 'dist/assets')));

// For client-side routing - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(resolve(__dirname, 'dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
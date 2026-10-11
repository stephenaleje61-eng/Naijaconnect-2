import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { requireAuth } from '../auth.ts';

const router = Router();

const uploadsDir = path.resolve(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.dat';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25 MB limit
});

// Single media upload
router.post('/', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    url: fileUrl,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

// Upload base64 audio note or data
router.post('/base64', requireAuth, (req, res) => {
  try {
    const { base64Data, filename, mimeType } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: 'No data provided.' });
    }

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = '.bin';

    if (matches && matches.length === 3) {
      buffer = Buffer.from(matches[2], 'base64');
      const detectedMime = matches[1];
      if (detectedMime.includes('audio')) ext = '.webm';
      else if (detectedMime.includes('image/png')) ext = '.png';
      else if (detectedMime.includes('image/jpeg')) ext = '.jpg';
      else if (detectedMime.includes('image/webp')) ext = '.webp';
    } else {
      buffer = Buffer.from(base64Data, 'base64');
    }

    const safeFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${filename ? path.extname(filename) : ext}`;
    const filePath = path.join(uploadsDir, safeFilename);

    fs.writeFileSync(filePath, buffer);

    return res.json({
      url: `/uploads/${safeFilename}`,
      mimeType: mimeType || 'application/octet-stream'
    });
  } catch (err) {
    console.error('Base64 upload error:', err);
    return res.status(500).json({ error: 'Failed to process upload.' });
  }
});

export default router;

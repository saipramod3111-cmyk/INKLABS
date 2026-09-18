import { Router } from 'express';
import multer from 'multer';
import { storage } from '../services/storage.js';

const router = Router();

const upload = multer({
  storage: storage.multerStorage('designs'),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    cb(Object.assign(new Error('Only image files are allowed'), { status: 400 }));
  },
});

router.post('/design', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No image uploaded' });
  res.json({ url: storage.publicUrl('designs', req.file.filename) });
});

router.post('/snapshot', async (req, res) => {
  const match = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(req.body?.dataUrl || '');
  if (!match) return res.status(400).json({ error: 'Expected a PNG or JPEG data URL' });
  const url = await storage.saveBuffer(Buffer.from(match[2], 'base64'), match[1] === 'png' ? 'png' : 'jpg', 'thumbnails');
  res.json({ url });
});

export default router;

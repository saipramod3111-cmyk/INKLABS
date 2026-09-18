import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { config } from '../config.js';

// Local-disk storage adapter. To move to S3/Cloudinary, replace the three
// public methods below (multerStorage, saveBuffer, publicUrl) and keep the API.

function uniqueName(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
}

function safeExt(originalName, fallback = 'png') {
  const ext = path.extname(originalName).slice(1).toLowerCase().replace(/[^a-z0-9]/g, '');
  return ext || fallback;
}

async function ensureDir(folder) {
  const dir = path.join(config.uploadDir, folder);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export const storage = {
  publicUrl(folder, filename) {
    return `/uploads/${folder}/${filename}`;
  },

  multerStorage(folder) {
    return multer.diskStorage({
      destination: (req, file, cb) => ensureDir(folder).then((dir) => cb(null, dir)).catch(cb),
      filename: (req, file, cb) => cb(null, uniqueName(safeExt(file.originalname))),
    });
  },

  async saveBuffer(buffer, ext, folder) {
    const dir = await ensureDir(folder);
    const name = uniqueName(ext);
    await fs.writeFile(path.join(dir, name), buffer);
    return this.publicUrl(folder, name);
  },
};

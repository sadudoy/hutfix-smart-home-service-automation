const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const DIR = path.join(__dirname, '..', 'uploads', 'requests');
fs.mkdirSync(DIR, { recursive: true });
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ['image/jpeg','image/png','image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('only jpeg/png/webp allowed'), ok);
  }
});
module.exports = upload;

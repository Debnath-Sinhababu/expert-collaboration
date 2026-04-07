const multer = require('multer');
const path = require('path');

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// PDFs (resume, qualifications) and profile video share the same 20MB cap per file.
const MAX_FILE_BYTES = 20 * 1024 * 1024;

// File filter: images/PDFs for most fields; MP4/WebM/MOV for profile_video
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'profile_video') {
    const videoExts = ['.mp4', '.webm', '.mov'];
    const ext = path.extname(file.originalname).toLowerCase();
    const okExt = videoExts.includes(ext);
    const videoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'];
    const okMime = videoMimes.includes(file.mimetype);
    if (okExt && okMime) {
      return cb(null, true);
    }
    return cb(new Error('Profile video must be MP4, WebM, or MOV'), false);
  }

  const allowedTypes = /jpeg|jpg|png|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files (jpeg, jpg, png, webp) and PDF files are allowed!'), false);
};

const limits = {
  fileSize: MAX_FILE_BYTES,
};

const upload = multer({
  storage: storage,
  limits,
  fileFilter: fileFilter,
});

module.exports = upload;
module.exports.MAX_FILE_BYTES = MAX_FILE_BYTES;
module.exports.VIDEO_MAX_BYTES = MAX_FILE_BYTES;
module.exports.OTHER_MAX_BYTES = MAX_FILE_BYTES;

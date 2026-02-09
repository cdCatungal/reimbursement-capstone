// reimbursement-backend/src/middlewares/upload.js
import multer from 'multer';

// ✅ Use memory storage (files stored in req.file.buffer)
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf'
    ];
    
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, JPEG, and PDF files are allowed!'));
    }
    cb(null, true);
  },
});

// ✅ REMOVED: bufferToBase64 and base64ToBuffer functions
// No longer needed since we're using Cloudinary
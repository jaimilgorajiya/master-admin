import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directory exists
const uploadDir = path.join(__dirname, "../uploads/tasks");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Unique filename: Date + Random + Original Extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
    // Allow all standard safe types
    // Images, PDFs, Docs, Audio, Video, Archives
    const allowedTypes = /jpeg|jpg|png|webp|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|csv|mp3|wav|mp4|mov|avi|zip|rar/;
    // Check ext and mime
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/') || file.mimetype.includes('pdf') || file.mimetype.includes('word') || file.mimetype.includes('excel') || file.mimetype.includes('presentation') || file.mimetype.includes('zip') || file.mimetype.includes('compressed');

    if (extname || mimetype) {
        return cb(null, true);
    } else {
        cb(new Error("Error: File type not allowed!"));
    }
};

export const uploadTaskFiles = multer({ 
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: fileFilter
});

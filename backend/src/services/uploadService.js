const path = require("path");
const fs = require("fs");
const multer = require("multer");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
    cb(null, name);
  },
});

const uploadImages = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 6 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      const error = new Error("Only image files are allowed");
      error.statusCode = 400;
      return cb(error);
    }

    return cb(null, true);
  },
}).array("images", 6);

const publicUrlFor = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/${filename}`;

// ---------------------------------------------------------------------------
// Cloudinary (optional). Configured via either the single CLOUDINARY_URL env
// var (cloudinary://<api_key>:<api_secret>@<cloud_name>) or the trio
// CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET.
// When absent, uploads keep the existing local-disk flow (served from /uploads).
// ---------------------------------------------------------------------------

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET),
  );

let cloudinaryClient = null;

const getCloudinary = () => {
  if (!cloudinaryClient) {
    // Lazy require so dev environments without the env vars never touch the SDK.
    cloudinaryClient = require("cloudinary").v2;

    if (process.env.CLOUDINARY_URL) {
      // The SDK reads CLOUDINARY_URL automatically; just force https URLs.
      cloudinaryClient.config({ secure: true });
    } else {
      cloudinaryClient.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
    }
  }

  return cloudinaryClient;
};

const removeTempFile = (filePath) => fs.promises.unlink(filePath).catch(() => {});

// Takes the multer-parsed request and returns the public URLs for the uploaded
// images — Cloudinary secure_urls when configured, local /uploads URLs otherwise.
// Response shape consumed by the route stays { success, urls } either way.
const storeUploadedImages = async (req) => {
  const files = req.files || [];

  if (!isCloudinaryConfigured()) {
    return files.map((file) => publicUrlFor(req, file.filename));
  }

  const cloudinary = getCloudinary();

  try {
    return await Promise.all(
      files.map((file) =>
        cloudinary.uploader
          .upload(file.path, { folder: "ofash-markett", resource_type: "image" })
          .then((result) => result.secure_url),
      ),
    );
  } catch (error) {
    const reason = error?.message || error?.error?.message || "unknown error";
    const wrapped = new Error(`Image upload to Cloudinary failed: ${reason}`);
    wrapped.statusCode = 502;
    throw wrapped;
  } finally {
    // Multer wrote temp files to disk; Cloudinary has (or failed to get) the
    // bytes now, so always clean up.
    await Promise.all(files.map((file) => removeTempFile(file.path)));
  }
};

module.exports = { uploadImages, publicUrlFor, storeUploadedImages, isCloudinaryConfigured, UPLOAD_DIR };

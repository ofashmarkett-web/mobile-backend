const { Router } = require("express");
const { protect } = require("../middleware/auth");
const { uploadImages, storeUploadedImages } = require("../services/uploadService");

const router = Router();

router.post("/", protect, (req, res, next) => {
  uploadImages(req, res, async (error) => {
    if (error) {
      error.statusCode = error.statusCode || 400;
      return next(error);
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: "Attach at least one image" });
    }

    try {
      // Cloudinary secure_urls when configured, local /uploads URLs otherwise —
      // same { success, urls } shape either way.
      const urls = await storeUploadedImages(req);
      return res.status(201).json({ success: true, urls });
    } catch (uploadError) {
      return next(uploadError);
    }
  });
});

module.exports = router;

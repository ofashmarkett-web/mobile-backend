const VendorProfile = require("../models/VendorProfile");

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: `This action requires one of the following roles: ${roles.join(", ")}`,
    });
  }

  return next();
};

const isVendorVerified = (profile) =>
  profile.kycStatus === "verified" || profile.onboardingStatus === "approved";

// Attaches req.vendorProfile. Does not block unverified vendors — use for
// endpoints that must still work while verification is pending (e.g. store status).
const attachVendorProfile = async (req, res, next) => {
  try {
    const profile = await VendorProfile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(403).json({
        success: false,
        code: "VENDOR_PROFILE_MISSING",
        message: "Complete vendor onboarding to access your store",
      });
    }

    req.vendorProfile = profile;
    return next();
  } catch (error) {
    return next(error);
  }
};

// Blocks vendors whose KYC has not been verified and whose onboarding has not
// been approved. Set VENDOR_VERIFICATION_ENFORCED=false to relax during development.
const requireVerifiedVendor = async (req, res, next) =>
  attachVendorProfile(req, res, () => {
    const enforced = process.env.VENDOR_VERIFICATION_ENFORCED !== "false";

    if (enforced && !isVendorVerified(req.vendorProfile)) {
      return res.status(403).json({
        success: false,
        code: "VENDOR_NOT_VERIFIED",
        message: "Your vendor account is awaiting verification. Complete KYC to unlock your store.",
      });
    }

    return next();
  });

module.exports = { requireRole, attachVendorProfile, requireVerifiedVendor, isVendorVerified };

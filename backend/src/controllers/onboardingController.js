const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const VendorProfile = require("../models/VendorProfile");
const RiderProfile = require("../models/RiderProfile");
const kycService = require("../services/kycService");
const { encrypt, decrypt } = require("../utils/secureField");

const profileByRole = {
  buyer: BuyerProfile,
  vendor: VendorProfile,
  rider: RiderProfile,
};

const kycChecks = ["bvn", "nin", "document", "liveness"];
const statusFieldByCheck = {
  bvn: "bvnStatus",
  nin: "ninStatus",
  document: "documentStatus",
  liveness: "livenessStatus",
};
const referenceFieldByCheck = {
  bvn: "bvnReference",
  nin: "ninReference",
  document: "documentReference",
  liveness: "livenessReference",
};

const sanitizeUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isKycVerified: user.isKycVerified,
});

const getUserId = (req) => req.user?.id || req.body.userId || req.params.userId;

const upsertProfile = async (Model, userId, payload) => {
  const existing = await Model.findOne({ where: { userId } });

  if (existing) {
    await existing.update(payload);
    return existing.reload();
  }

  return Model.create({ ...payload, userId });
};

const updateUserRole = async (userId, role) => {
  const user = await User.findByPk(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== role) {
    await user.update({ role });
  }

  return user.reload();
};

const computeKycStatus = (profile) => {
  const statuses = kycChecks.map((check) => profile[statusFieldByCheck[check]]);

  if (statuses.every((status) => status === "verified")) return "verified";
  if (statuses.some((status) => status === "failed")) return "failed";
  if (statuses.some((status) => status === "manual_review")) return "manual_review";
  if (statuses.some((status) => status === "pending")) return "pending";
  if (statuses.some((status) => status === "verified")) return "pending"; // partway through the flow
  return "not_started";
};

// The three checks the vendor/rider onboarding flow actually runs. BVN is not
// part of the flow, so it never gates verification.
const coreKycChecks = ["nin", "document", "liveness"];

// Verification is decided entirely by the provider's results — there is no
// manual/admin approval step. Once NIN, document and liveness are all
// "verified", the profile's kycStatus flips to "verified", and a submitted
// application is approved automatically (works for VendorProfile and
// RiderProfile — same columns).
const refreshVendorVerification = async (profile) => {
  const allVerified = coreKycChecks.every(
    (check) => profile[statusFieldByCheck[check]] === "verified",
  );

  if (!allVerified) return profile;

  const patch = {};
  if (profile.kycStatus !== "verified") patch.kycStatus = "verified";
  if (profile.onboardingStatus === "submitted") patch.onboardingStatus = "approved";
  if (Object.keys(patch).length > 0) await profile.update(patch);

  return profile;
};

const syncAggregateKyc = async ({ profile, userId }) => {
  await profile.update({ kycStatus: computeKycStatus(profile) });
  await refreshVendorVerification(profile);
  await User.update(
    { isKycVerified: profile.kycStatus === "verified" },
    { where: { id: userId } },
  );

  return profile.reload();
};

const saveBuyerOnboarding = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await updateUserRole(userId, "buyer");
    const profile = await upsertProfile(BuyerProfile, userId, {
      fullName: req.body.fullName,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      referral: req.body.referral,
      defaultAddress: req.body.defaultAddress,
      onboardingStatus: req.body.onboardingStatus || "draft",
    });

    return res.status(200).json({ success: true, user: sanitizeUser(user), profile });
  } catch (error) {
    return next(error);
  }
};

const saveVendorOnboarding = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await updateUserRole(userId, "vendor");
    const profile = await upsertProfile(VendorProfile, userId, {
      fullName: req.body.fullName,
      businessName: req.body.businessName,
      businessEmail: req.body.businessEmail,
      description: req.body.description,
      categories: req.body.categories || [],
      cacNumber: req.body.cacNumber,
      cacCertificateUrl: req.body.cacCertificateUrl,
      storeLogoUrl: req.body.storeLogoUrl,
      storeBannerUrl: req.body.storeBannerUrl,
      address: req.body.address,
      landmark: req.body.landmark,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      openingDays: req.body.openingDays || [],
      deliveryType: req.body.deliveryType,
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      onboardingStatus: req.body.onboardingStatus || "draft",
    });

    return res.status(200).json({ success: true, user: sanitizeUser(user), profile });
  } catch (error) {
    return next(error);
  }
};

const saveRiderOnboarding = async (req, res, next) => {
  try {
    const userId = getUserId(req);
    const user = await updateUserRole(userId, "rider");
    const profile = await upsertProfile(RiderProfile, userId, {
      fullName: req.body.fullName,
      dateOfBirth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      latitude: req.body.latitude,
      longitude: req.body.longitude,
      vehicleType: req.body.vehicleType,
      plateNumber: req.body.plateNumber,
      licenseNumber: req.body.licenseNumber,
      deliveryCompany: req.body.deliveryCompany,
      coverageAreas: req.body.coverageAreas || [],
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      accountName: req.body.accountName,
      onboardingStatus: req.body.onboardingStatus || "draft",
    });

    return res.status(200).json({ success: true, user: sanitizeUser(user), profile });
  } catch (error) {
    return next(error);
  }
};

const submitOnboarding = async (req, res, next) => {
  try {
    const { role } = req.params;
    const userId = getUserId(req);
    const Model = profileByRole[role];

    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const profile = await Model.findOne({ where: { userId } });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    await profile.update({
      onboardingStatus: role === "buyer" ? "active" : "submitted",
    });

    // If every KYC check already came back verified from the provider, the
    // submission is approved on the spot — no manual step.
    if (role !== "buyer") {
      await syncAggregateKyc({ profile, userId });
    }

    return res.status(200).json({ success: true, profile });
  } catch (error) {
    return next(error);
  }
};

const getOnboardingStatus = async (req, res, next) => {
  try {
    const { role } = req.params;
    const userId = getUserId(req);
    const Model = profileByRole[role];

    if (!Model) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const profile = await Model.findOne({ where: { userId } });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    return res.status(200).json({
      success: true,
      onboardingStatus: profile.onboardingStatus,
      // Buyer profiles have no KYC columns — report null rather than dropping
      // the field so clients can rely on it being present.
      kycStatus: profile.kycStatus || null,
      checks: {
        bvn: profile.bvnStatus,
        nin: profile.ninStatus,
        document: profile.documentStatus,
        liveness: profile.livenessStatus,
      },
      profile,
    });
  } catch (error) {
    return next(error);
  }
};

const startKycCheck = async (req, res, next) => {
  try {
    const { role, check } = req.params;
    const userId = getUserId(req);
    const Model = profileByRole[role];

    if (!["vendor", "rider"].includes(role) || !Model) {
      return res.status(400).json({ success: false, message: "KYC is only required for vendor and rider" });
    }

    const profile = await Model.findOne({ where: { userId } });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    // fullName lets providers that do name matching (QoreID) verify against
    // the profile; the simulation and Dojah paths simply ignore it.
    const payload = { userId, role, fullName: profile.fullName };
    let result;

    if (check === "bvn") {
      result = await kycService.verifyBvn({ ...payload, bvn: req.body.bvn });
    } else if (check === "nin") {
      result = await kycService.verifyNin({ ...payload, nin: req.body.nin });
    } else if (check === "document") {
      // Policy: the document check calls NO provider in ANY mode (simulation or
      // live). Identity is proven by the NIN lookup plus the face-match against
      // the NIMC photo; the uploaded document photo is retained as supporting
      // evidence (documentImageUrl) and the check auto-passes. QoreID has no
      // REST endpoint for image-based document verification, and none is needed
      // for approval.
      const documentReference = `${role}:${userId}:document`;
      result = req.body.imageUrl
        ? {
            provider: "internal",
            environment: process.env.KYC_MODE === "simulation" ? "simulation" : "live",
            ok: true,
            status: "verified",
            reference: documentReference,
            data: {
              entity: {
                document_type: req.body.documentType || "ID",
                status: "verified",
                evidence: "stored",
                reference: documentReference,
              },
            },
          }
        : {
            provider: "internal",
            ok: false,
            status: "failed",
            reference: documentReference,
            data: { error: "A document image is required" },
          };
    } else if (check === "liveness") {
      // Live QoreID face-match needs the applicant's NIN, saved encrypted when
      // the NIN check verified. Simulation and legacy-Dojah paths ignore it.
      result = await kycService.startLiveness({
        ...payload,
        imageUrl: req.body.imageUrl,
        nin: decrypt(profile.ninEncrypted),
      });
    } else {
      return res.status(400).json({ success: false, message: "Invalid KYC check" });
    }

    const statusField = statusFieldByCheck[check];
    const referenceField = referenceFieldByCheck[check];
    const reference = result.data?.entity?.reference || result.reference || `${role}:${userId}:${check}`;

    // The provider decides the outcome. When the call returns a definitive
    // synchronous result (simulation always does; live Dojah when it responds
    // with entity data instead of deferring to the webhook), record it
    // immediately: success → verified, failed/not found → failed. Only truly
    // async live responses stay "pending" for the webhook to settle.
    let checkStatus;
    if (result.status === "mocked") {
      checkStatus = "manual_review"; // live mode without credentials — nothing definitive
    } else if (!result.ok) {
      checkStatus = "failed";
    } else if (result.environment === "simulation" || result.data?.entity) {
      checkStatus = "verified";
    } else {
      checkStatus = "pending";
    }

    const extraFields = {};

    // Persist the NIN (encrypted at rest) once verified — the liveness
    // face-match needs it — and keep the document image as stored evidence.
    if (check === "nin" && checkStatus === "verified") {
      extraFields.ninEncrypted = encrypt(req.body.nin);
    }
    if (check === "document" && req.body.imageUrl) {
      extraFields.documentImageUrl = req.body.imageUrl;
    }

    await profile.update({
      dojahReference: reference,
      [statusField]: checkStatus,
      [referenceField]: reference,
      ...extraFields,
    });

    const syncedProfile = await syncAggregateKyc({ profile: await profile.reload(), userId });

    return res.status(200).json({ success: true, kyc: result, profile: syncedProfile });
  } catch (error) {
    return next(error);
  }
};

// Dojah-legacy webhook. QoreID results are returned synchronously by
// startKycCheck, so QoreID never calls back here — this stays wired for the
// legacy Dojah provider's async responses only.
const handleDojahOnboardingWebhook = async (req, res, next) => {
  try {
    const payload = req.body || {};
    const reference =
      payload.reference ||
      payload.customer_reference ||
      payload.metadata?.reference ||
      payload.metadata?.customer_reference ||
      payload.data?.reference ||
      payload.data?.customer_reference ||
      payload.entity?.reference ||
      payload.entity?.customer_reference ||
      "";
    const [role, userId, check] = String(reference).split(":");
    const passed = ["success", "successful", "verified", "approved", "completed"].includes(
      String(payload.status || payload.result || payload.event || "").toLowerCase(),
    );
    const failed = ["failed", "rejected", "declined"].includes(
      String(payload.status || payload.result || payload.event || "").toLowerCase(),
    );
    const Model = profileByRole[role];

    if (Model && userId && statusFieldByCheck[check]) {
      const profile = await Model.findOne({ where: { userId } });

      if (profile) {
        const checkStatus = passed ? "verified" : failed ? "failed" : "manual_review";

        await profile.update({
          [statusFieldByCheck[check]]: checkStatus,
          [referenceFieldByCheck[check]]: reference,
          dojahReference: reference,
        });
        await syncAggregateKyc({ profile: await profile.reload(), userId });
      }
    }

    return res.status(200).json({
      success: true,
      processed: Boolean(Model && userId && statusFieldByCheck[check]),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  saveBuyerOnboarding,
  saveVendorOnboarding,
  saveRiderOnboarding,
  submitOnboarding,
  getOnboardingStatus,
  startKycCheck,
  handleDojahOnboardingWebhook,
};

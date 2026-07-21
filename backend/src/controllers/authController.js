const jwt = require("jsonwebtoken");
const { Resend } = require("resend");
const User = require("../models/User");
const BuyerProfile = require("../models/BuyerProfile");
const VendorProfile = require("../models/VendorProfile");
const { handleDojahOnboardingWebhook } = require("./onboardingController");

const resend = new Resend(process.env.RESEND_API_KEY);
const otpMemory = new Map();
const isProduction = process.env.NODE_ENV === "production";

const signSession = (user) =>
  jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email,
      phone: user.phone,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" },
  );

const sendOtpHandler = async (req, res, next) => {
  try {
    const { phone, mode } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Login must not silently turn into a signup for a mistyped email, and
    // signup must not reuse an email that already has an account.
    if (mode === "login" || mode === "register") {
      const existing = await User.findOne({ where: { email } });

      if (mode === "login" && !existing) {
        return res.status(404).json({
          success: false,
          message: "No account found with this email. Check the spelling or sign up first.",
        });
      }

      if (mode === "register" && existing) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please log in instead.",
        });
      }
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    otpMemory.set(email, {
      otp,
      phone,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== "...") {
      try {
        // The Resend SDK does not throw on API errors — it returns { error }.
        const { error: sendError } = await resend.emails.send({
          from: process.env.RESEND_FROM || "O-FASH MARKETT <onboarding@resend.dev>",
          to: email,
          subject: "Your O-FASH MARKETT verification code",
          html: `<p>Your verification code is <strong>${otp}</strong>.</p>`,
        });

        if (sendError) {
          throw new Error(sendError.message || "OTP email was rejected");
        }
      } catch (mailError) {
        if (isProduction) {
          mailError.statusCode = 502;
          mailError.message = "Unable to send OTP right now";
          throw mailError;
        }

        console.warn("OTP email skipped:", mailError.message);
        console.log(`Development OTP for ${email}: ${otp}`);
      }
    } else if (!isProduction) {
      console.log(`Development OTP for ${email}: ${otp}`);
    } else {
      return res.status(500).json({ success: false, message: "OTP provider is not configured" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const registerHandler = async (req, res, next) => {
  try {
    const { email, phone, password, otp, role = "buyer" } = req.body;
    const cachedOtp = otpMemory.get(email);

    if (!email || !phone) {
      return res.status(400).json({ success: false, message: "Email and phone are required" });
    }

    if (!["buyer", "vendor", "rider"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    if (!cachedOtp || cachedOtp.otp !== otp || cachedOtp.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, message: "Invalid or expired OTP" });
    }

    const user = await User.create({
      email,
      phone,
      role,
      passwordHash: password || `${email}:${phone}:${Date.now()}`,
      isEmailVerified: true,
    });

    otpMemory.delete(email);

    return res.status(201).json({
      success: true,
      token: signSession(user),
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isKycVerified: user.isKycVerified,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const verifyOtpHandler = async (req, res, next) => {
  try {
    const { phone, otp, role = "buyer", mode } = req.body;
    const email = (req.body.email || "").trim().toLowerCase();
    const cachedOtp = otpMemory.get(email);

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required" });
    }

    if (!cachedOtp || cachedOtp.otp !== otp || cachedOtp.expiresAt < Date.now()) {
      return res.status(401).json({ success: false, message: "Invalid or expired OTP" });
    }

    let user = await User.findOne({ where: { email } });
    const phoneToUse = phone || cachedOtp.phone;

    if (!user && mode === "login") {
      return res.status(404).json({
        success: false,
        message: "No account found with this email. Check the spelling or sign up first.",
      });
    }

    if (user && mode === "register") {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please log in instead.",
      });
    }

    if (!user && !phoneToUse) {
      return res.status(400).json({ success: false, message: "Phone number is required for new accounts" });
    }

    if (!user) {
      const phoneOwner = await User.findOne({ where: { phone: phoneToUse } });
      if (phoneOwner) {
        return res.status(409).json({
          success: false,
          message:
            "This phone number is already registered to another account. Log in with the email you used before, or sign up with a different phone number.",
        });
      }

      user = await User.create({
        email,
        phone: phoneToUse,
        role,
        passwordHash: `${email}:${phoneToUse}:${Date.now()}`,
        isEmailVerified: true,
      });
    }

    await user.update({
      // Keep the account's existing phone — changing it here could collide
      // with another account's unique phone. Never overwrite the stored role:
      // logging in through a different tab must not convert the account
      // (role switching is an explicit product flow, not a login side effect).
      phone: user.phone || phoneToUse,
      isEmailVerified: true,
    });

    otpMemory.delete(email);

    return res.status(200).json({
      success: true,
      token: signSession(user),
      user: sanitizeAuthUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

const sanitizeAuthUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isEmailVerified: user.isEmailVerified,
  isKycVerified: user.isKycVerified,
});

const handleDojahWebhook = async (req, res, next) => {
  return handleDojahOnboardingWebhook(req, res, next);
};

// Explicit buyer↔vendor profile switch. On the first switch the target profile
// is seeded from the one they already have, so the app recognises who they are
// on the other side. Buyers get an active profile straight away (no approval
// gate); a new vendor profile stays a draft — vendor onboarding/KYC still applies.
const switchRoleHandler = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = req.user;

    if (!["buyer", "vendor"].includes(role)) {
      return res.status(400).json({ success: false, message: "Role must be buyer or vendor" });
    }

    if (user.role === "rider") {
      return res.status(403).json({ success: false, message: "Rider accounts can't switch profiles." });
    }

    const emailName = user.email.split("@")[0];

    if (role === "buyer") {
      const buyerProfile = await BuyerProfile.findOne({ where: { userId: user.id } });

      if (!buyerProfile) {
        const vendorProfile = await VendorProfile.findOne({ where: { userId: user.id } });

        await BuyerProfile.create({
          userId: user.id,
          fullName: vendorProfile?.fullName || vendorProfile?.businessName || emailName,
          defaultAddress: vendorProfile?.address || null,
          onboardingStatus: "active",
        });
      }
    } else {
      const vendorProfile = await VendorProfile.findOne({ where: { userId: user.id } });

      if (!vendorProfile) {
        const buyerProfile = await BuyerProfile.findOne({ where: { userId: user.id } });

        await VendorProfile.create({
          userId: user.id,
          fullName: buyerProfile?.fullName || emailName,
          businessName: "",
          onboardingStatus: "draft",
        });
      }
    }

    // Idempotent: switching to the role you already have still succeeds.
    if (user.role !== role) {
      await user.update({ role });
    }

    // The role lives inside the JWT, so the switch needs a fresh token.
    return res.status(200).json({
      success: true,
      token: signSession(user),
      user: sanitizeAuthUser(user),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  sendOtpHandler,
  registerHandler,
  verifyOtpHandler,
  switchRoleHandler,
  handleDojahWebhook,
};

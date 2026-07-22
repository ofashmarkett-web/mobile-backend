// AES-256-GCM helpers for encrypting sensitive KYC fields at rest (currently
// the applicant's NIN, needed later for QoreID's face-match call).
//
// Key: sha256(KYC_DATA_KEY || JWT_SECRET) — set KYC_DATA_KEY to a dedicated
// random secret in production so the KYC key can rotate independently of JWTs.
// Wire format: "iv:tag:ciphertext", each part base64 (12-byte IV, 16-byte tag).
const crypto = require("crypto");

const getKey = () => {
  const secret = process.env.KYC_DATA_KEY || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("KYC_DATA_KEY or JWT_SECRET must be set to encrypt KYC data");
  }

  return crypto.createHash("sha256").update(String(secret)).digest();
};

const encrypt = (plaintext) => {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
};

// Returns the plaintext, or null when the value is missing, malformed, or has
// been tampered with (GCM auth failure) — callers treat null as "not stored".
const decrypt = (encoded) => {
  if (!encoded || typeof encoded !== "string") return null;

  const parts = encoded.split(":");

  if (parts.length !== 3) return null;

  try {
    const [iv, tag, ciphertext] = parts.map((part) => Buffer.from(part, "base64"));
    const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);

    decipher.setAuthTag(tag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
};

module.exports = { encrypt, decrypt };

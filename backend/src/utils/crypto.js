const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

const getKey = () => {
  const seed =
    process.env.TOTP_ENCRYPTION_KEY ||
    process.env.JWT_SECRET ||
    'safelayers-dev-fallback-key-change-me';

  return crypto.createHash('sha256').update(seed).digest();
};

const encryptText = (plainText) => {
  if (!plainText) return null;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [iv, tag, encrypted].map((part) => part.toString('base64url')).join('.');
};

const decryptText = (cipherText) => {
  if (!cipherText) return null;

  const [ivPart, tagPart, encryptedPart] = cipherText.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivPart, 'base64url')
  );

  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedPart, 'base64url')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
};

module.exports = {
  encryptText,
  decryptText,
};

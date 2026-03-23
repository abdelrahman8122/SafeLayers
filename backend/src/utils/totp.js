const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

const normalizeSecret = (secret) => (secret || '').replace(/\s+/g, '').toUpperCase();

const base32Encode = (buffer) => {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
};

const base32Decode = (secret) => {
  const normalized = normalizeSecret(secret);
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of normalized) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error('Invalid base32 secret');
    }

    value = (value << 5) | index;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
};

const generateBase32Secret = (byteLength = 20) => base32Encode(crypto.randomBytes(byteLength));

const formatManualEntryKey = (secret) =>
  normalizeSecret(secret)
    .match(/.{1,4}/g)
    ?.join(' ') || '';

const generateHotp = (secret, counter, digits = 6) => {
  const decodedSecret = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  let currentCounter = counter;

  for (let i = 7; i >= 0; i -= 1) {
    counterBuffer[i] = currentCounter & 0xff;
    currentCounter >>= 8;
  }

  const hmac = crypto.createHmac('sha1', decodedSecret).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;

  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % 10 ** digits).toString().padStart(digits, '0');
};

const generateTotp = (secret, options = {}) => {
  const { digits = 6, period = 30, timestamp = Date.now() } = options;
  const counter = Math.floor(timestamp / 1000 / period);
  return generateHotp(secret, counter, digits);
};

const verifyTotp = (secret, token, options = {}) => {
  const { digits = 6, period = 30, window = 1, timestamp = Date.now() } = options;
  const normalizedToken = String(token || '').replace(/\s+/g, '');

  if (!/^\d+$/.test(normalizedToken) || normalizedToken.length !== digits) {
    return false;
  }

  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = generateTotp(secret, {
      digits,
      period,
      timestamp: timestamp + offset * period * 1000,
    });

    if (candidate === normalizedToken) {
      return true;
    }
  }

  return false;
};

const buildOtpAuthUrl = ({ issuer, label, secret }) => {
  const normalizedIssuer = issuer || 'SafeLayers';
  const normalizedLabel = label || 'SafeLayers';

  return `otpauth://totp/${encodeURIComponent(
    `${normalizedIssuer}:${normalizedLabel}`
  )}?secret=${encodeURIComponent(normalizeSecret(secret))}&issuer=${encodeURIComponent(
    normalizedIssuer
  )}&algorithm=SHA1&digits=6&period=30`;
};

module.exports = {
  buildOtpAuthUrl,
  formatManualEntryKey,
  generateBase32Secret,
  generateHotp,
  generateTotp,
  normalizeSecret,
  verifyTotp,
};

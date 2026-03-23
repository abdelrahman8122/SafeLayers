const {
  buildOtpAuthUrl,
  formatManualEntryKey,
  generateBase32Secret,
  generateTotp,
  verifyTotp,
} = require('./totp');

describe('totp utils', () => {
  test('generates and verifies a valid TOTP token', () => {
    const secret = generateBase32Secret();
    const token = generateTotp(secret, { timestamp: 1710000000000 });

    expect(token).toHaveLength(6);
    expect(verifyTotp(secret, token, { timestamp: 1710000000000 })).toBe(true);
  });

  test('rejects an invalid token', () => {
    const secret = generateBase32Secret();
    expect(verifyTotp(secret, '123456', { timestamp: 1710000000000 })).toBe(false);
  });

  test('builds a provisioning url and manual key', () => {
    const secret = generateBase32Secret();

    expect(buildOtpAuthUrl({
      issuer: 'SafeLayers',
      label: 'demo@example.com',
      secret,
    })).toContain('otpauth://totp/');

    expect(formatManualEntryKey(secret)).toContain(' ');
  });
});

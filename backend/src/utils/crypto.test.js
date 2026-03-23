const { decryptText, encryptText } = require('./crypto');

describe('crypto utils', () => {
  test('encrypts and decrypts text symmetrically', () => {
    const plainText = 'JBSWY3DPEHPK3PXP';
    const encrypted = encryptText(plainText);

    expect(encrypted).not.toBe(plainText);
    expect(decryptText(encrypted)).toBe(plainText);
  });
});

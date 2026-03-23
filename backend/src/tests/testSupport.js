const jwt = require('jsonwebtoken');
const request = require('supertest');

const ensureTestEnv = () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_access_secret_1234567890';
  process.env.JWT_REFRESH_SECRET =
    process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_1234567890';
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
  process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
  process.env.JWT_PREAUTH_EXPIRES_IN = process.env.JWT_PREAUTH_EXPIRES_IN || '5m';
  process.env.TOTP_ENCRYPTION_KEY =
    process.env.TOTP_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
  process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
};

const buildQuery = (value, selectedValue = value) => {
  const promise = Promise.resolve(value);

  return {
    select: jest.fn().mockResolvedValue(selectedValue),
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
    finally: promise.finally.bind(promise),
  };
};

const buildChain = (value) => {
  const promise = Promise.resolve(value);
  const chain = {};

  ['select', 'sort', 'limit', 'skip', 'populate', 'lean'].forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  chain.then = promise.then.bind(promise);
  chain.catch = promise.catch.bind(promise);
  chain.finally = promise.finally.bind(promise);

  return chain;
};

const createMockUser = (overrides = {}) => ({
  _id: '507f1f77bcf86cd799439011',
  fullName: 'Test User',
  email: 'test@example.com',
  accountNumber: '111-222-3333',
  role: 'customer',
  address: 'Cairo',
  kycVerified: true,
  lastLogin: null,
  twoFactorEnabled: false,
  twoFactorSecret: undefined,
  twoFactorTempSecret: undefined,
  twoFactorTempSecretCreatedAt: undefined,
  twoFactorConfirmedAt: undefined,
  refreshTokens: [],
  loginAttempts: 0,
  lockUntil: undefined,
  isActive: true,
  isLocked: false,
  comparePassword: jest.fn().mockResolvedValue(true),
  comparePin: jest.fn().mockResolvedValue(true),
  incLoginAttempts: jest.fn().mockResolvedValue(undefined),
  changedPasswordAfter: jest.fn().mockReturnValue(false),
  save: jest.fn().mockResolvedValue(undefined),
  updateOne: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

const createAccessToken = (id = '507f1f77bcf86cd799439011', sessionId = 'test-session') =>
  jwt.sign({ id, sessionId, type: 'access' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const fetchCsrfContext = async (app) => {
  const response = await request(app).get('/api/auth/csrf-token');

  return {
    csrfToken: response.body.csrfToken,
    cookies: (response.headers['set-cookie'] || []).map((cookie) => cookie.split(';')[0]),
  };
};

const withAccessCookie = (cookies, token) => [...cookies, `accessToken=${token}`];

module.exports = {
  ensureTestEnv,
  buildQuery,
  buildChain,
  createMockUser,
  createAccessToken,
  fetchCsrfContext,
  withAccessCookie,
};

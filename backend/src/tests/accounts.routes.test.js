const {
  buildChain,
  createAccessToken,
  createMockUser,
  ensureTestEnv,
  fetchCsrfContext,
  withAccessCookie,
} = require('./testSupport');

ensureTestEnv();

jest.mock('../config/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));
jest.mock('../models/User');
jest.mock('../models/Account');

const request = require('supertest');
const User = require('../models/User');
const Account = require('../models/Account');
const { app } = require('../server');

describe('backend account routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('blocks account access when no session is present', async () => {
    const response = await request(app).get('/api/accounts');

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toMatch(/Not authenticated/i);
  });

  test('returns active accounts for an authenticated customer', async () => {
    const token = createAccessToken();
    const user = createMockUser();
    const accounts = [
      { accountNumber: '233-126-0001', type: 'checking', balance: 48250 },
      { accountNumber: '233-126-0001-SAV', type: 'savings', balance: 112800 },
    ];

    User.findById.mockResolvedValue(user);
    Account.find.mockReturnValue(buildChain(accounts));

    const response = await request(app)
      .get('/api/accounts')
      .set('Cookie', [`accessToken=${token}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body.accounts).toHaveLength(2);
    expect(response.body.accounts[0].type).toBe('checking');
  });

  test('toggles card freeze state for the authenticated user', async () => {
    const token = createAccessToken();
    const user = createMockUser();
    const checkingAccount = {
      isFrozen: false,
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findById.mockResolvedValue(user);
    Account.findOne.mockResolvedValue(checkingAccount);

    const { csrfToken, cookies } = await fetchCsrfContext(app);

    const response = await request(app)
      .patch('/api/accounts/freeze')
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken);

    expect(response.statusCode).toBe(200);
    expect(response.body.isFrozen).toBe(true);
    expect(response.body.message).toContain('frozen');
    expect(checkingAccount.save).toHaveBeenCalled();
  });
});

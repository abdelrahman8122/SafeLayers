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
jest.mock('../models/Transaction');

const request = require('supertest');
const User = require('../models/User');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const { app } = require('../server');

const adminUser = createMockUser({
  _id: '507f191e810c19729de860ea',
  role: 'admin',
  accountNumber: '999-000-0001',
  fullName: 'Admin User',
});

describe('admin routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects authenticated customers from admin endpoints', async () => {
    const customer = createMockUser({ role: 'customer' });
    const token = createAccessToken(customer._id);

    User.findById.mockResolvedValue(customer);

    const response = await request(app)
      .get('/api/admin/overview')
      .set('Cookie', [`accessToken=${token}`]);

    expect(response.statusCode).toBe(403);
    expect(response.body.error).toMatch(/permission/i);
  });

  test('returns overview stats and recent transactions for admins', async () => {
    const token = createAccessToken(adminUser._id);

    User.findById.mockResolvedValue(adminUser);
    User.countDocuments
      .mockResolvedValueOnce(14)
      .mockResolvedValueOnce(11)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(2);
    Account.countDocuments
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(4);
    Transaction.countDocuments
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(1);
    Transaction.find.mockReturnValue(
      buildChain([
        {
          _id: 'txn123',
          type: 'transfer',
          amount: 2500,
          status: 'completed',
          owner: {
            fullName: 'Mariam Ahmed',
            accountNumber: '233-126-0001',
            role: 'customer',
          },
        },
      ])
    );

    const response = await request(app)
      .get('/api/admin/overview')
      .set('Cookie', [`accessToken=${token}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body.stats.totalUsers).toBe(14);
    expect(response.body.stats.adminUsers).toBe(1);
    expect(response.body.recentTransactions).toHaveLength(1);
  });

  test('lists users for admins', async () => {
    const token = createAccessToken(adminUser._id);

    User.findById.mockResolvedValue(adminUser);
    User.find.mockReturnValue(
      buildChain([
        adminUser,
        createMockUser({ _id: '507f191e810c19729de860eb', fullName: 'Customer User' }),
      ])
    );

    const response = await request(app)
      .get('/api/admin/users')
      .set('Cookie', [`accessToken=${token}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body.users).toHaveLength(2);
    expect(response.body.users[0].role).toBeDefined();
  });

  test('allows admins to deactivate another user', async () => {
    const token = createAccessToken(adminUser._id);
    const targetUser = createMockUser({
      _id: '507f191e810c19729de860ff',
      fullName: 'Customer User',
      isActive: true,
    });

    User.findById.mockImplementation((id) => {
      if (String(id) === String(adminUser._id)) {
        return Promise.resolve(adminUser);
      }

      if (String(id) === String(targetUser._id)) {
        return Promise.resolve(targetUser);
      }

      return Promise.resolve(null);
    });

    const { csrfToken, cookies } = await fetchCsrfContext(app);

    const response = await request(app)
      .patch(`/api/admin/users/${targetUser._id}/status`)
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken)
      .send({ isActive: false });

    expect(response.statusCode).toBe(200);
    expect(response.body.user.isActive).toBe(false);
    expect(targetUser.save).toHaveBeenCalled();
  });

  test('allows admins to freeze any account', async () => {
    const token = createAccessToken(adminUser._id);
    const managedAccount = {
      _id: '507f1f77bcf86cd799439099',
      isFrozen: false,
      owner: {
        fullName: 'Customer User',
        accountNumber: '233-126-0001',
        role: 'customer',
      },
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findById.mockResolvedValue(adminUser);
    Account.findById.mockReturnValue(buildChain(managedAccount));

    const { csrfToken, cookies } = await fetchCsrfContext(app);

    const response = await request(app)
      .patch(`/api/admin/accounts/${managedAccount._id}/freeze`)
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken)
      .send({ isFrozen: true });

    expect(response.statusCode).toBe(200);
    expect(response.body.account.isFrozen).toBe(true);
    expect(managedAccount.save).toHaveBeenCalled();
  });
});

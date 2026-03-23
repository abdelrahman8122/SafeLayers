const {
  buildChain,
  buildQuery,
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

describe('backend transaction routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('rejects invalid transfer payloads before controller execution', async () => {
    const token = createAccessToken();
    const user = createMockUser();
    const { csrfToken, cookies } = await fetchCsrfContext(app);

    User.findById.mockImplementation(() => buildQuery(user, user));

    const response = await request(app)
      .post('/api/transactions/transfer')
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken)
      .send({
        toAccountNumber: 'invalid',
        amount: 0,
      });

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Validation failed');
  });

  test('processes a valid deposit for an authenticated customer', async () => {
    const token = createAccessToken();
    const user = createMockUser();
    const account = {
      balance: 5000,
      save: jest.fn().mockResolvedValue(undefined),
    };

    User.findById.mockImplementation(() => buildQuery(user, user));
    Account.findOne.mockResolvedValue(account);
    Transaction.create.mockResolvedValue({ reference: 'TXN-DEP-001' });

    const { csrfToken, cookies } = await fetchCsrfContext(app);

    const response = await request(app)
      .post('/api/transactions/deposit')
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken)
      .send({
        amount: 750,
        accountType: 'checking',
        method: 'Cash',
      });

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Deposit successful');
    expect(response.body.newBalance).toBe(5750);
    expect(account.save).toHaveBeenCalled();
  });

  test('rejects withdrawals when the transaction PIN is incorrect', async () => {
    const token = createAccessToken();
    const authUser = createMockUser();
    const pinUser = createMockUser({
      comparePin: jest.fn().mockResolvedValue(false),
    });

    User.findById.mockImplementation(() => buildQuery(authUser, pinUser));

    const { csrfToken, cookies } = await fetchCsrfContext(app);

    const response = await request(app)
      .post('/api/transactions/withdraw')
      .set('Cookie', withAccessCookie(cookies, token))
      .set('X-CSRF-Token', csrfToken)
      .send({
        amount: 400,
        accountType: 'checking',
        pin: '9999',
      });

    expect(response.statusCode).toBe(401);
    expect(response.body.error).toBe('Incorrect PIN.');
  });

  test('returns transaction history for an authenticated customer', async () => {
    const token = createAccessToken();
    const user = createMockUser();
    const history = [
      {
        _id: 'txn123',
        type: 'deposit',
        amount: 750,
        status: 'completed',
      },
    ];

    User.findById.mockImplementation(() => buildQuery(user, user));
    Transaction.find.mockReturnValue(buildChain(history));
    Transaction.countDocuments.mockResolvedValue(1);

    const response = await request(app)
      .get('/api/transactions/history')
      .set('Cookie', [`accessToken=${token}`]);

    expect(response.statusCode).toBe(200);
    expect(response.body.transactions).toHaveLength(1);
    expect(response.body.transactions[0].type).toBe('deposit');
    expect(response.body.pagination.total).toBe(1);
  });
});

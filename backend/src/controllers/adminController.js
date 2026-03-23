const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const logger = require('../config/logger');

const ADMIN_USER_FIELDS = [
  'fullName',
  'email',
  'accountNumber',
  'role',
  'isActive',
  'twoFactorEnabled',
  'kycVerified',
  'lastLogin',
  'loginAttempts',
  'lockUntil',
  'createdAt',
].join(' ');

const ACCOUNT_POPULATE_FIELDS = 'fullName email accountNumber role isActive';

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  accountNumber: user.accountNumber,
  role: user.role,
  isActive: user.isActive,
  twoFactorEnabled: user.twoFactorEnabled,
  kycVerified: user.kycVerified,
  lastLogin: user.lastLogin,
  loginAttempts: user.loginAttempts || 0,
  lockUntil: user.lockUntil,
  createdAt: user.createdAt,
});

exports.getOverview = async (req, res, next) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeCustomers,
      adminUsers,
      lockedUsers,
      frozenAccounts,
      activeLoans,
      transactionsToday,
      pendingTransactions,
      recentTransactions,
    ] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ role: 'customer', isActive: true }),
      User.countDocuments({ role: 'admin', isActive: true }),
      User.countDocuments({ lockUntil: { $gt: new Date() } }),
      Account.countDocuments({ isFrozen: true, isActive: true }),
      Account.countDocuments({ type: 'loan', isActive: true }),
      Transaction.countDocuments({ createdAt: { $gte: startOfDay } }),
      Transaction.countDocuments({ status: 'pending' }),
      Transaction.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('owner', 'fullName accountNumber role'),
    ]);

    res.json({
      stats: {
        totalUsers,
        activeCustomers,
        adminUsers,
        lockedUsers,
        frozenAccounts,
        activeLoans,
        transactionsToday,
        pendingTransactions,
      },
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search } = req.query;
    const query = {};

    if (role && ['customer', 'teller', 'admin'].includes(role)) {
      query.role = role;
    }

    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    }

    if (search) {
      const safeSearch = escapeRegex(search.trim());
      if (safeSearch) {
        query.$or = [
          { fullName: { $regex: safeSearch, $options: 'i' } },
          { email: { $regex: safeSearch, $options: 'i' } },
          { accountNumber: { $regex: safeSearch, $options: 'i' } },
        ];
      }
    }

    const users = await User.find(query)
      .select(ADMIN_USER_FIELDS)
      .sort({ createdAt: -1 });

    res.json({
      users: users.map(formatUser),
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const nextState = req.body.isActive;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (String(user._id) === String(req.user._id) && nextState === false) {
      return res.status(400).json({ error: 'Administrators cannot deactivate their own account.' });
    }

    user.isActive = typeof nextState === 'boolean' ? nextState : !user.isActive;
    await user.save({ validateBeforeSave: false });

    logger.warn(
      `ADMIN USER STATUS: Admin ${req.user._id} set user ${user._id} active=${user.isActive}`
    );

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully.`,
      user: formatUser(user),
    });
  } catch (error) {
    next(error);
  }
};

exports.getAccounts = async (req, res, next) => {
  try {
    const { type, frozen } = req.query;
    const query = {};

    if (type && ['checking', 'savings', 'loan'].includes(type)) {
      query.type = type;
    }

    if (frozen === 'true') {
      query.isFrozen = true;
    } else if (frozen === 'false') {
      query.isFrozen = false;
    }

    const accounts = await Account.find(query)
      .sort({ updatedAt: -1 })
      .populate('owner', ACCOUNT_POPULATE_FIELDS);

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

exports.toggleAccountFreeze = async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const requestedState = req.body.isFrozen;
    const account = await Account.findById(accountId).populate('owner', ACCOUNT_POPULATE_FIELDS);

    if (!account) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    account.isFrozen = typeof requestedState === 'boolean' ? requestedState : !account.isFrozen;
    await account.save();

    logger.warn(
      `ADMIN ACCOUNT FREEZE: Admin ${req.user._id} set account ${account._id} frozen=${account.isFrozen}`
    );

    res.json({
      message: `Account ${account.isFrozen ? 'frozen' : 'unfrozen'} successfully.`,
      account,
    });
  } catch (error) {
    next(error);
  }
};

exports.getLoans = async (req, res, next) => {
  try {
    const loans = await Account.find({ type: 'loan' })
      .sort({ createdAt: -1 })
      .populate('owner', ACCOUNT_POPULATE_FIELDS);

    res.json({ loans });
  } catch (error) {
    next(error);
  }
};

exports.getTransactions = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

    const transactions = await Transaction.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('owner', 'fullName accountNumber role');

    res.json({ transactions });
  } catch (error) {
    next(error);
  }
};

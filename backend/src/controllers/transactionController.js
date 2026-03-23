const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const logger = require('../config/logger');

// ─── TRANSFER ─────────────────────────────────────────
exports.transfer = async (req, res, next) => {
  // Use MongoDB session for ACID transaction
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { toAccountNumber, amount, description, pin, fromAccountType } = req.body;
    const userId = req.user._id;

    // Validate fromAccountType — default to checking if not provided
    const accountType = ['checking', 'savings'].includes(fromAccountType) ? fromAccountType : 'checking';

    // Verify PIN
    const User = require('../models/User');
    const user = await User.findById(userId).select('+pin');
    if (!user || !(await user.comparePin(pin))) {
      await session.abortTransaction();
      return res.status(401).json({ error: 'Incorrect PIN.' });
    }

    // Get sender's selected account (checking or savings)
    const fromAccount = await Account.findOne({
      owner: userId,
      type: accountType,
      isActive: true,
      isFrozen: false,
    }).session(session);

    if (!fromAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Account not found or frozen.' });
    }

    // Check daily limit
    fromAccount.resetDailyLimitIfNeeded();
    if (fromAccount.dailyUsed + amount > fromAccount.dailyLimit) {
      await session.abortTransaction();
      return res.status(400).json({
        error: `Daily transfer limit exceeded. Remaining: EGP ${fromAccount.dailyLimit - fromAccount.dailyUsed}`,
      });
    }

    // Check balance
    if (fromAccount.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    // Find recipient account
    const toAccount = await Account.findOne({
      accountNumber: toAccountNumber,
      isActive: true,
    }).session(session);

    if (!toAccount) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Recipient account not found.' });
    }

    if (toAccount._id.equals(fromAccount._id)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Cannot transfer to same account.' });
    }

    // Debit sender (atomic)
    fromAccount.balance -= amount;
    fromAccount.dailyUsed += amount;
    await fromAccount.save({ session });

    // Credit recipient (atomic)
    toAccount.balance += amount;
    await toAccount.save({ session });

    // Create transaction record (audit trail)
    const transaction = await Transaction.create([{
      fromAccount: fromAccount._id,
      toAccount: toAccount._id,
      owner: userId,
      type: 'transfer',
      amount,
      description: description || 'Transfer',
      status: 'completed',
      completedAt: new Date(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      sessionId: req.sessionId,
    }], { session });

    await session.commitTransaction();

    logger.info(`TRANSFER: ${userId} → ${toAccountNumber} — EGP ${amount} — REF: ${transaction[0].reference}`);

    res.json({
      message: 'Transfer successful',
      reference: transaction[0].reference,
      amount,
      newBalance: fromAccount.balance,
    });

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

// ─── DEPOSIT ──────────────────────────────────────────
exports.deposit = async (req, res, next) => {
  try {
    const { amount, accountType, method } = req.body;
    const userId = req.user._id;

    const account = await Account.findOne({
      owner: userId,
      type: accountType,
      isActive: true,
    });

    if (!account) return res.status(404).json({ error: 'Account not found.' });

    account.balance += amount;
    await account.save();

    const transaction = await Transaction.create({
      toAccount: account._id,
      owner: userId,
      type: 'deposit',
      amount,
      description: `Deposit via ${method || 'Bank Transfer'}`,
      status: 'completed',
      completedAt: new Date(),
      ipAddress: req.ip,
      sessionId: req.sessionId,
    });

    logger.info(`DEPOSIT: User ${userId} — EGP ${amount} → ${accountType} — REF: ${transaction.reference}`);

    res.json({
      message: 'Deposit successful',
      reference: transaction.reference,
      newBalance: account.balance,
    });

  } catch (error) {
    next(error);
  }
};

// ─── WITHDRAW ─────────────────────────────────────────
exports.withdraw = async (req, res, next) => {
  try {
    const { amount, accountType, pin } = req.body;
    const userId = req.user._id;

    // Verify PIN
    const User = require('../models/User');
    const user = await User.findById(userId).select('+pin');
    if (!user || !(await user.comparePin(pin))) {
      return res.status(401).json({ error: 'Incorrect PIN.' });
    }

    const account = await Account.findOne({
      owner: userId,
      type: accountType,
      isActive: true,
      isFrozen: false,
    });

    if (!account) return res.status(404).json({ error: 'Account not found or frozen.' });

    // Check daily limit
    account.resetDailyLimitIfNeeded();
    if (account.dailyUsed + amount > account.dailyLimit) {
      return res.status(400).json({
        error: `Daily withdrawal limit exceeded. Remaining: EGP ${account.dailyLimit - account.dailyUsed}`,
      });
    }

    if (account.balance < amount) {
      return res.status(400).json({ error: 'Insufficient funds.' });
    }

    account.balance -= amount;
    account.dailyUsed += amount;
    await account.save();

    const transaction = await Transaction.create({
      fromAccount: account._id,
      owner: userId,
      type: 'withdrawal',
      amount,
      description: 'Cash Withdrawal',
      status: 'completed',
      completedAt: new Date(),
      ipAddress: req.ip,
      sessionId: req.sessionId,
    });

    logger.info(`WITHDRAWAL: User ${userId} — EGP ${amount} from ${accountType} — REF: ${transaction.reference}`);

    res.json({
      message: 'Withdrawal successful',
      reference: transaction.reference,
      newBalance: account.balance,
    });

  } catch (error) {
    next(error);
  }
};

// ─── GET TRANSACTION HISTORY ──────────────────────────
exports.getHistory = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;

    const filter = { owner: req.user._id };
    if (type && type !== 'all') {
      const typeMap = {
        credit: { type: { $in: ['deposit'] } },
        debit: { type: { $in: ['transfer', 'withdrawal', 'loan_payment'] } },
      };
      Object.assign(filter, typeMap[type] || {});
    }

    const transactions = await Transaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .populate('fromAccount', 'type accountNumber')
      .populate('toAccount', 'type accountNumber');

    const total = await Transaction.countDocuments(filter);

    res.json({
      transactions,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });

  } catch (error) {
    next(error);
  }
};

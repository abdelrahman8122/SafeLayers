const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const logger = require('../config/logger');

const LOAN_TYPES = {
  personal: { name: 'Personal Loan', rate: 8.5, maxAmount: 200000, minMonths: 12, maxMonths: 60 },
  home: { name: 'Home Mortgage', rate: 6.2, maxAmount: 3000000, minMonths: 60, maxMonths: 300 },
  car: { name: 'Car Loan', rate: 9.0, maxAmount: 500000, minMonths: 12, maxMonths: 72 },
  business: { name: 'Business Loan', rate: 11.5, maxAmount: 1000000, minMonths: 6, maxMonths: 48 },
};

// ─── Calculate monthly payment (standard formula) ─────
const calcMonthly = (principal, annualRate, months) => {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal / months;
  return principal * (r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

// ─── APPLY FOR LOAN ───────────────────────────────────
exports.applyLoan = async (req, res, next) => {
  try {
    const { loanType, amount, termMonths } = req.body;
    const userId = req.user._id;

    const loanConfig = LOAN_TYPES[loanType];
    if (!loanConfig) return res.status(400).json({ error: 'Invalid loan type.' });

    if (amount < 1000 || amount > loanConfig.maxAmount) {
      return res.status(400).json({ error: `Amount must be between 1,000 and ${loanConfig.maxAmount.toLocaleString()} EGP.` });
    }

    if (termMonths < loanConfig.minMonths || termMonths > loanConfig.maxMonths) {
      return res.status(400).json({ error: 'Invalid loan term for this product.' });
    }

    // Check for existing active loan
    const existingLoan = await Account.findOne({ owner: userId, type: 'loan', isActive: true });
    if (existingLoan) {
      return res.status(400).json({ error: 'You already have an active loan.' });
    }

    const monthly = calcMonthly(amount, loanConfig.rate, termMonths);
    const nextPayment = new Date();
    nextPayment.setMonth(nextPayment.getMonth() + 1);

    await Account.create({
      owner: userId,
      accountNumber: `LOAN-${userId.toString().slice(-6)}-${Date.now()}`,
      type: 'loan',
      balance: amount,
      loanAmount: amount,
      loanRate: loanConfig.rate,
      loanTermMonths: termMonths,
      monthlyPayment: Math.round(monthly * 100) / 100,
      nextPaymentDate: nextPayment,
      paymentsRemaining: termMonths,
    });

    logger.info(`LOAN APPLIED: User ${userId} — ${loanConfig.name} EGP ${amount} / ${termMonths}mo`);

    res.status(201).json({
      message: 'Loan application approved',
      loanType: loanConfig.name,
      amount,
      termMonths,
      monthlyPayment: Math.round(monthly * 100) / 100,
      annualRate: loanConfig.rate,
      totalRepayment: Math.round(monthly * termMonths * 100) / 100,
    });

  } catch (error) {
    next(error);
  }
};

// ─── GET LOAN DETAILS ─────────────────────────────────
exports.getLoan = async (req, res, next) => {
  try {
    const loan = await Account.findOne({ owner: req.user._id, type: 'loan', isActive: true });
    if (!loan) return res.status(404).json({ error: 'No active loan found.' });
    res.json({ loan });
  } catch (error) {
    next(error);
  }
};

// ─── CALCULATE (no auth needed) ───────────────────────
exports.calculate = (req, res) => {
  const { amount, loanType, termMonths } = req.query;
  const loanConfig = LOAN_TYPES[loanType] || LOAN_TYPES.personal;
  const a = parseFloat(amount) || 0;
  const t = parseInt(termMonths) || 36;

  if (a < 1) return res.status(400).json({ error: 'Invalid amount.' });

  const monthly = calcMonthly(a, loanConfig.rate, t);
  const total = monthly * t;

  res.json({
    monthlyPayment: Math.round(monthly * 100) / 100,
    totalInterest: Math.round((total - a) * 100) / 100,
    totalRepayment: Math.round(total * 100) / 100,
    annualRate: loanConfig.rate,
  });
};

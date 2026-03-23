const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  accountNumber: {
    type: String,
    unique: true,
    required: true,
  },
  type: {
    type: String,
    enum: ['checking', 'savings', 'loan'],
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    default: 0,
    min: [0, 'Balance cannot be negative'],
  },
  currency: {
    type: String,
    default: 'EGP',
  },
  // Savings-specific
  interestRate: { type: Number, default: 0 },
  autoSave: { type: Boolean, default: false },
  // Loan-specific
  loanAmount: { type: Number, default: 0 },
  loanRate: { type: Number, default: 0 },
  loanTermMonths: { type: Number, default: 0 },
  monthlyPayment: { type: Number, default: 0 },
  nextPaymentDate: { type: Date },
  paymentsRemaining: { type: Number, default: 0 },
  // Status
  isActive: { type: Boolean, default: true },
  isFrozen: { type: Boolean, default: false },
  dailyLimit: { type: Number, default: 20000 },
  dailyUsed: { type: Number, default: 0 },
  dailyLimitResetAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
});

// ─── Reset daily limit ─────────────────────────────────
accountSchema.methods.resetDailyLimitIfNeeded = function () {
  const now = new Date();
  const lastReset = new Date(this.dailyLimitResetAt);
  if (now.toDateString() !== lastReset.toDateString()) {
    this.dailyUsed = 0;
    this.dailyLimitResetAt = now;
  }
};

module.exports = mongoose.model('Account', accountSchema);

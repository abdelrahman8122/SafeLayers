const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const transactionSchema = new mongoose.Schema({
  // Unique reference number (like a real bank)
  reference: {
    type: String,
    unique: true,
    default: () => `TXN-${Date.now()}-${uuidv4().slice(0, 8).toUpperCase()}`,
  },
  // Parties
  fromAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  toAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // Transaction details
  type: {
    type: String,
    enum: ['transfer', 'deposit', 'withdrawal', 'loan_payment', 'interest', 'fee'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: [0.01, 'Amount must be positive'],
  },
  currency: { type: String, default: 'EGP' },
  description: { type: String, maxlength: 200 },
  // Status
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'pending',
  },
  // Security audit fields
  ipAddress: String,
  userAgent: String,
  sessionId: String,
  // Timestamps
  completedAt: Date,
}, {
  timestamps: true,
});

transactionSchema.index({ owner: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);

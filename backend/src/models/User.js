const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // ─── Identity ───────────────────────────────────────
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  nationalId: {
    type: String,
    required: true,
    unique: true,
    select: false, // Never returned in queries by default
  },
  phone: {
    type: String,
    required: true,
    select: false,
  },
  dateOfBirth: {
    type: Date,
    required: true,
    select: false,
  },
  address: {
    type: String,
    default: 'Cairo, Egypt',
    trim: true,
    maxlength: [160, 'Address cannot exceed 160 characters'],
  },

  // ─── Auth ────────────────────────────────────────────
  accountNumber: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false, // Never returned in queries
  },
  pin: {
    type: String,
    select: false,
  },
  role: {
    type: String,
    enum: ['customer', 'teller', 'admin'],
    default: 'customer',
  },

  // ─── Authenticator App 2FA ──────────────────────────
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, select: false },
  twoFactorTempSecret: { type: String, select: false },
  twoFactorTempSecretCreatedAt: { type: Date, select: false },
  twoFactorConfirmedAt: { type: Date },

  // ─── Security Tracking ───────────────────────────────
  passwordChangedAt: Date,
  passwordResetToken: { type: String, select: false },
  passwordResetExpiry: { type: Date, select: false },
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  lastLogin: { type: Date },
  lastLoginIp: { type: String },
  refreshTokens: {
    type: [String],
    default: [],
    select: false,
  },

  // ─── KYC ─────────────────────────────────────────────
  kycVerified: { type: Boolean, default: false },
  kycVerifiedAt: { type: Date },

  // ─── Account Status ───────────────────────────────────
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// ─── Indexes ──────────────────────────────────────────

// ─── Virtual: Account locked? ─────────────────────────
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// ─── Pre-save: Hash password ──────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// ─── Pre-save: Hash PIN ────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('pin') || !this.pin) return next();
  this.pin = await bcrypt.hash(this.pin, 10);
  next();
});

// ─── Method: Compare password ─────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Method: Compare PIN ──────────────────────────────
userSchema.methods.comparePin = async function (candidatePin) {
  return bcrypt.compare(candidatePin, this.pin);
};

// ─── Method: Increment login attempts (lockout) ───────
userSchema.methods.incLoginAttempts = async function () {
  // Reset if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({ $set: { loginAttempts: 1 }, $unset: { lockUntil: 1 } });
  }
  const updates = { $inc: { loginAttempts: 1 } };
  // Lock after 5 failed attempts for 30 minutes
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 30 * 60 * 1000 };
  }
  return this.updateOne(updates);
};

// ─── Method: Password changed after JWT issued ────────
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);

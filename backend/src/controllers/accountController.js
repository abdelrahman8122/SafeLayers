const Account = require('../models/Account');

// ─── GET ALL ACCOUNTS ─────────────────────────────────
exports.getAccounts = async (req, res, next) => {
  try {
    const accounts = await Account.find({
      owner: req.user._id,
      isActive: true,
    }).select('-__v');

    res.json({ accounts });
  } catch (error) {
    next(error);
  }
};

// ─── FREEZE / UNFREEZE CARD ───────────────────────────
exports.toggleFreeze = async (req, res, next) => {
  try {
    const account = await Account.findOne({
      owner: req.user._id,
      type: 'checking',
    });

    if (!account) return res.status(404).json({ error: 'Account not found.' });

    account.isFrozen = !account.isFrozen;
    await account.save();

    res.json({
      message: `Card ${account.isFrozen ? 'frozen' : 'unfrozen'} successfully`,
      isFrozen: account.isFrozen,
    });
  } catch (error) {
    next(error);
  }
};

require('dotenv').config();

const mongoose = require('mongoose');

const connectDB = require('../config/database');
const User = require('../models/User');

const promoteUser = async () => {
  const identifier = process.argv[2];

  if (!identifier) {
    throw new Error('Provide an account number or email. Example: npm run promote:admin -- 233-126-0001');
  }

  await connectDB();

  const query = identifier.includes('@')
    ? { email: identifier.toLowerCase() }
    : { accountNumber: identifier };

  const user = await User.findOne(query);

  if (!user) {
    throw new Error('User not found for the supplied identifier.');
  }

  user.role = 'admin';
  user.kycVerified = true;
  await user.save({ validateBeforeSave: false });

  console.log(`Promoted ${user.fullName} (${user.accountNumber}) to admin.`);
};

promoteUser()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  });

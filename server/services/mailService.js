const nodemailer = require('nodemailer');

const isDevEmailMode = () => {
  return process.env.EMAIL_DEV_MODE === 'true';
};

const hasSmtpConfig = () => {
  return Boolean(
    process.env.EMAIL_HOST &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    !process.env.EMAIL_HOST.includes('example.com') &&
    !process.env.EMAIL_USER.includes('example.com')
  );
};

const createTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 5000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: String(process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
  },
});

async function sendMail(message, fallbackLog) {
  if (isDevEmailMode() || !hasSmtpConfig()) {
    fallbackLog();
    return;
  }

  try {
    await createTransporter().sendMail(message);
  } catch (error) {
    console.error('Email delivery failed:', error.message);
    throw new Error('Unable to send OTP email. Check SMTP settings.');
  }
}

exports.sendOtpEmail = async (email, name, otp) => {
  await sendMail({
    from: `Student Portal <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Your Student Portal OTP Code',
    text: `Hello ${name},\n\nYour one-time verification code is: ${otp}. It expires in 5 minutes.\n\nIf you did not request this, ignore this message.`,
  }, () => {
    console.log(`DEV OTP for ${email}: ${otp}`);
  });
};

exports.sendResetEmail = async (email, name, token) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset.html?token=${token}`;
  await sendMail({
    from: `Student Portal <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Student Portal Password',
    text: `Hello ${name},\n\nUse the following link to reset your password:\n${resetUrl}\n\nThis link expires in 15 minutes.`,
  }, () => {
    console.log(`DEV password reset link for ${email}: ${resetUrl}`);
  });
};

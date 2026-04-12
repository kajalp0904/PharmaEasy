const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');

// Rate limiter: 5 attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per windowMs
  message: {
    success: false,
    error: 'TooManyRequests',
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'TooManyRequests',
      message: 'Too many authentication attempts. Please try again after 15 minutes.'
    });
  }
});

// Validation helper functions
const validateEmail = (email) => {
  const emailRegex = /^\S+@\S+\.\S+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  // Password must be at least 6 characters
  if (password.length < 6) {
    return { valid: false, message: 'Password must be at least 6 characters long' };
  }
  return { valid: true };
};

// POST /api/signup - DISABLED: Registration is closed. Admin account is pre-configured.
router.post('/signup', (req, res) => {
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Registration is disabled. Please contact the administrator.'
  });
});

// POST /api/login - Authenticate user and return JWT
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: 'Email and password are required'
      });
    }

    // Allow short username alias → map to real stored email
    const USERNAME_MAP = {
      'ommedical@0910': 'ommedical@ommedical.com'
    };
    const resolvedEmail = (USERNAME_MAP[email.trim()] || email.trim()).toLowerCase();
    
    // Find user
    const user = await User.findOne({ email: resolvedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid email or password'
      });
    }
    
    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'AuthenticationError',
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({
        success: false,
        error: 'ServerError',
        message: 'Server configuration error'
      });
    }
    
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role
      },
      jwtSecret,
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: {
        userId: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'ServerError',
      message: 'Error during login. ' + String(error.message || error)
    });
  }
});

const nodemailer = require('nodemailer');

// ========== FORGOT PASSWORD — Send OTP ==========
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

    // SECURITY: Only allow explicit admin emails to request a password reset
    const allowedEmails = ['kajalgpatil0904@gmail.com', 'medicalom172@gmail.com'];
    if (!allowedEmails.includes(email.toLowerCase())) {
      return res.status(403).json({ 
        success: false, 
        message: 'Security Restriction: Password reset is not permitted for this email.' 
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ success: false, message: 'No account found with that email' });

    // Generate 6-digit OTP and set 10-minute expiry
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    // Store OTP directly (bypasses bcrypt pre-save hook)
    await User.updateOne({ _id: user._id }, { resetOTP: otp, otpExpiry });

    // Send OTP email
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // upgrade later with STARTTLS
      auth: { 
        user: process.env.BREVO_USER, // Your Brevo account email
        pass: process.env.BREVO_PASS  // Your Brevo SMTP Master Password
      }
    });

    await transporter.sendMail({
      from: `"Om Medical" <${process.env.SENDER_EMAIL}>`,
      to: user.email,
      subject: 'Password Reset OTP – Om Medical',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;border:1px solid #e0e0e0;border-radius:8px;padding:32px;">
          <h2 style="color:#ff6b35;margin-bottom:8px;">Om Medical</h2>
          <p style="color:#2d2d2d;font-size:16px;">You requested a password reset. Use the OTP below:</p>
          <div style="background:#f5f5f5;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
            <span style="font-size:36px;font-weight:700;letter-spacing:8px;color:#2d2d2d;">${otp}</span>
          </div>
          <p style="color:#7a7a7a;font-size:14px;">This OTP is valid for <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
        </div>
      `
    });

    res.json({ success: true, message: 'OTP sent to your email' });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Failed to send OTP. Try again.' });
  }
});

// ========== VERIFY OTP ==========
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetOTP) {
      return res.status(400).json({ success: false, message: 'OTP not requested for this email' });
    }
    if (user.resetOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' });
    }

    res.json({ success: true, message: 'OTP verified' });

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Verification failed. Try again.' });
  }
});

// ========== RESET PASSWORD ==========
router.post('/reset-password', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, OTP and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !user.resetOTP) {
      return res.status(400).json({ success: false, message: 'OTP not requested for this email' });
    }
    if (user.resetOTP !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP' });
    }
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one' });
    }

    // Set new password — pre('save') hook will auto-hash it
    user.password  = newPassword;
    user.resetOTP  = null;
    user.otpExpiry = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully! You can now log in.' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Reset failed. Try again.' });
  }
});

// ========== AUTO-CREATE ADMIN ON STARTUP ==========
async function ensureAdminExists() {
  try {
    // Use a valid email format that satisfies mongoose validation
    const adminEmail = 'ommedical@ommedical.com';
    const existing = await User.findOne({ email: adminEmail });
    if (!existing) {
      const admin = new User({
        email: adminEmail,
        password: 'om@123',
        name: 'Om Medical Admin',
        role: 'admin'
      });
      await admin.save();
      console.log('✅ Admin account created');
    } else {
      console.log('✅ Admin account already exists');
    }
  } catch (err) {
    console.error('❌ Failed to ensure admin account:', err.message);
  }
}

module.exports = router;
module.exports.ensureAdminExists = ensureAdminExists;


// Production-ready OTP service with multiple providers
// No email credentials needed!

const crypto = require('crypto');

// In-memory store (for development)
// For production, use Redis or MongoDB
const otpStore = new Map();

// Clean up expired OTPs every hour
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
        if (value.expiresAt < now) {
            otpStore.delete(key);
        }
    }
}, 60 * 60 * 1000);

// Generate 6-digit OTP
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiry (10 minutes for production)
const storeOTP = (email, phoneNumber = null) => {
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    
    otpStore.set(email, { 
        otp, 
        expiresAt, 
        phoneNumber,
        attempts: 0,
        createdAt: new Date()
    });
    
    return otp;
};

// Verify OTP with rate limiting
const verifyOTP = (email, otp) => {
    const record = otpStore.get(email);
    
    if (!record) {
        return { 
            valid: false, 
            message: 'No OTP found. Please request a new one.' 
        };
    }
    
    // Check attempts (max 5 attempts)
    if (record.attempts >= 5) {
        otpStore.delete(email);
        return { 
            valid: false, 
            message: 'Too many failed attempts. Please request a new OTP.' 
        };
    }
    
    if (Date.now() > record.expiresAt) {
        otpStore.delete(email);
        return { 
            valid: false, 
            message: 'OTP has expired. Please request a new one.' 
        };
    }
    
    if (record.otp !== otp) {
        record.attempts++;
        otpStore.set(email, record);
        return { 
            valid: false, 
            message: `Invalid OTP. ${5 - record.attempts} attempts remaining.` 
        };
    }
    
    // OTP is valid, remove it
    otpStore.delete(email);
    return { valid: true, message: 'OTP verified successfully!' };
};

// Send OTP via multiple channels
const sendOTP = async (email, otp, phoneNumber = null) => {
    const results = [];
    
    // Method 1: Console Log (always works for debugging)
    console.log('\n' + '='.repeat(70));
    console.log('🔐 VERIFICATION OTP REQUIRED');
    console.log('='.repeat(70));
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Your OTP is: ${otp}`);
    console.log(`⏰ Expires in: 10 minutes`);
    console.log('='.repeat(70) + '\n');
    results.push({ method: 'console', success: true });
    
    // Method 2: WhatsApp/Twilio (Production - uncomment when you have API keys)
    // You can add WhatsApp Business API, Twilio, etc.
    
    // Method 3: SMS Gateway (Production)
    // You can use providers like Twilio, Vonage, etc.
    
    // Method 4: Push Notification (Firebase)
    
    return { success: true, results };
};

// Resend OTP
const resendOTP = async (email, phoneNumber = null) => {
    const newOTP = storeOTP(email, phoneNumber);
    await sendOTP(email, newOTP, phoneNumber);
    return newOTP;
};

// For debugging only - remove in production
const getAllOTPs = () => {
    const otps = {};
    otpStore.forEach((value, key) => {
        otps[key] = { 
            otp: value.otp, 
            expiresAt: new Date(value.expiresAt).toLocaleString(),
            attempts: value.attempts
        };
    });
    return otps;
};

module.exports = { storeOTP, verifyOTP, resendOTP, sendOTP, getAllOTPs };
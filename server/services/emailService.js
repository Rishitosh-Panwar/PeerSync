const nodemailer = require('nodemailer');

// Configure email transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // App password
    }
});

const sendVerificationEmail = async (email, verificationToken) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
        from: `"PeerSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Verify Your Email - PeerSync',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Welcome to PeerSync! 🚀</h2>
                <p>Please verify your email address to start collaborating:</p>
                <a href="${verificationUrl}" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">Verify Email</a>
                <p>Or copy this link: ${verificationUrl}</p>
                <p>This link expires in 24 hours.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">If you didn't create an account, please ignore this email.</p>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

const sendPasswordResetEmail = async (email, resetToken) => {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"PeerSync" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - PeerSync',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>Password Reset Request</h2>
                <p>Click the link below to reset your password:</p>
                <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
                <p>Or copy this link: ${resetUrl}</p>
                <p>This link expires in 1 hour.</p>
                <hr>
                <p style="color: #666; font-size: 12px;">If you didn't request this, please ignore this email.</p>
            </div>
        `
    };
    
    await transporter.sendMail(mailOptions);
};

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
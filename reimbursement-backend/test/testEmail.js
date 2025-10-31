// reimbursement-backend/test/testEmail.js

import dotenv from 'dotenv';
import { sendEmail, verifyEmailConfig } from '../src/utils/sendEmail.js';

dotenv.config();

async function testEmailSetup() {
  console.log('🧪 Testing Email Configuration for ERNIt Back\n');
  console.log('================================================\n');
  
  // Check environment variables
  console.log('📋 Checking environment variables:');
  console.log(`   EMAIL_SERVICE: ${process.env.EMAIL_SERVICE || '❌ Not set (will default to gmail)'}`);
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER || '❌ Not set'}`);
  console.log(`   EMAIL_PASSWORD: ${process.env.EMAIL_PASSWORD ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  
  // Check if required variables are set
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.error('❌ Missing required email configuration!\n');
    console.log('Please update your .env file with:');
    console.log('   EMAIL_SERVICE=gmail  (or outlook)');
    console.log('   EMAIL_USER=your-email@gmail.com');
    console.log('   EMAIL_PASSWORD=your-app-password-here');
    console.log('\n💡 See the Email Setup Guide for instructions on getting an App Password');
    process.exit(1);
  }
  
  // Verify email configuration
  console.log('🔍 Verifying email server connection...');
  const isValid = await verifyEmailConfig();
  
  if (!isValid) {
    console.error('\n❌ Email configuration is invalid!');
    console.log('\nTroubleshooting:');
    console.log('1. Make sure you\'re using an App Password, not your regular password');
    console.log('2. Check that 2FA is enabled on your account');
    console.log('3. Verify EMAIL_SERVICE is set to "gmail" or "outlook"');
    console.log('4. Try regenerating your App Password');
    process.exit(1);
  }
  
  // Get test email from command line or use sender email
  const testEmail = process.argv[2] || process.env.EMAIL_USER;
  
  console.log(`\n📧 Sending test email to: ${testEmail}`);
  console.log('⏳ Please wait...\n');
  
  // Create test email content
  const subject = '✅ ERNIt Back Email Test - Success!';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 30px;
          border-radius: 10px;
          text-align: center;
        }
        .content {
          background-color: #f9f9f9;
          padding: 30px;
          border-radius: 10px;
          margin-top: 20px;
        }
        .success-box {
          background-color: #d4edda;
          border-left: 4px solid #28a745;
          padding: 15px;
          margin: 20px 0;
          border-radius: 5px;
        }
        .info-table {
          width: 100%;
          margin: 20px 0;
          border-collapse: collapse;
        }
        .info-table td {
          padding: 10px;
          border-bottom: 1px solid #ddd;
        }
        .info-table td:first-child {
          font-weight: bold;
          width: 40%;
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 2px solid #ddd;
          color: #666;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Email System Test</h1>
        <p>ERNIt Back Notification System</p>
      </div>
      
      <div class="content">
        <div class="success-box">
          <strong>✅ Success!</strong> Your email notification system is working correctly.
        </div>
        
        <p>This is a test email from your <strong>ERNIt Back</strong> reimbursement system.</p>
        
        <table class="info-table">
          <tr>
            <td>Email Service</td>
            <td>${process.env.EMAIL_SERVICE || 'gmail'}</td>
          </tr>
          <tr>
            <td>Sender</td>
            <td>${process.env.EMAIL_USER}</td>
          </tr>
          <tr>
            <td>Recipient</td>
            <td>${testEmail}</td>
          </tr>
          <tr>
            <td>Test Time</td>
            <td>${new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
          </tr>
        </table>
        
        <p><strong>What's Next?</strong></p>
        <ul>
          <li>✅ Email configuration is verified</li>
          <li>✅ Ready to send approval notifications</li>
          <li>✅ Ready to send rejection notifications</li>
          <li>✅ System is production-ready</li>
        </ul>
        
        <p>Your reimbursement approval notifications will now be automatically sent to employees when their requests are approved or rejected.</p>
      </div>
      
      <div class="footer">
        <p><strong>ERNIt Back</strong> - OCR-Powered Reimbursement System</p>
        <p>ERNI Philippines</p>
      </div>
    </body>
    </html>
  `;
  
  try {
    await sendEmail(testEmail, subject, html);
    
    console.log('✅ TEST SUCCESSFUL!\n');
    console.log('================================================');
    console.log('📬 Email sent successfully to:', testEmail);
    console.log('📧 Please check your inbox (and spam folder)');
    console.log('================================================\n');
    console.log('🎉 Your email notification system is ready!\n');
    console.log('Next steps:');
    console.log('1. Start your server: npm start');
    console.log('2. Test with a real reimbursement approval');
    console.log('3. Check that notifications are sent correctly\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ TEST FAILED!\n');
    console.error('Error:', error.message);
    console.log('\n📝 Common solutions:');
    console.log('• Regenerate your App Password and update .env');
    console.log('• Check that 2FA is enabled on your email account');
    console.log('• Verify EMAIL_SERVICE matches your email provider');
    console.log('• Make sure no spaces in EMAIL_PASSWORD in .env file\n');
    process.exit(1);
  }
}

testEmailSetup();
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendPasswordResetEmail(toEmail, resetUrl) {
  if (!process.env.RESEND_API_KEY) {
    console.log('\n📧 Password reset email (no RESEND_API_KEY configured):');
    console.log(`   To: ${toEmail}`);
    console.log(`   Link: ${resetUrl}\n`);
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Urban Explorer <onboarding@resend.dev>',
    to: toEmail,
    subject: 'Reset your Urban Explorer password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0a0a0a; color: #fff; border-radius: 12px; overflow: hidden;">
        <div style="background: #111; padding: 32px 36px; border-bottom: 1px solid #1e1e1e;">
          <h1 style="margin: 0; font-size: 1.4rem; color: #22c55e;">Urban Explorer</h1>
        </div>
        <div style="padding: 36px;">
          <h2 style="margin: 0 0 12px; font-size: 1.2rem;">Reset your password</h2>
          <p style="color: #9ca3af; margin: 0 0 28px; line-height: 1.6;">
            We received a request to reset the password for your account.
            Click the button below to choose a new password. This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #22c55e; color: #000; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-size: 0.95rem;">
            Reset Password
          </a>
          <p style="color: #4b5563; margin: 28px 0 0; font-size: 0.82rem; line-height: 1.5;">
            If you didn't request this, you can safely ignore this email — your password won't change.<br/>
            Or copy this link: <span style="color: #6b7280;">${resetUrl}</span>
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = { sendPasswordResetEmail };

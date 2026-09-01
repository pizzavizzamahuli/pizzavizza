import { env } from '@/src/config/env';

export async function sendPasswordResetEmail(to: string, name: string, code: string) {
  const subject = 'Pizza Vizza password reset code';
  const text = `Hi ${name},\n\nUse the code below to reset your Pizza Vizza password. It will expire in 15 minutes.\n\n${code}\n\nIf you did not request this change, please ignore this message.`;
  const html = `<p>Hi ${name},</p><p>Use the code below to reset your Pizza Vizza password. It will expire in 15 minutes.</p><p><strong>${code}</strong></p><p>If you did not request this change, please ignore this message.</p>`;

  if (env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_APP_PASSWORD) {
    try {
      const nodemailer = await import('nodemailer');
      const transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_APP_PASSWORD,
        },
      });

      await transporter.sendMail({
        from: env.SMTP_FROM || env.SMTP_USER,
        to,
        subject,
        text,
        html,
      });
      return;
    } catch (error) {
      console.warn('Password reset email failed to send:', error);
    }
  }

  console.info('SMTP configuration not available. Password reset code would be sent with:', {
    to,
    subject,
    text,
  });
}

import dotenv from 'dotenv';
dotenv.config();
import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: process.env.MAIL_SECURE === 'true',
  auth: { user: process.env.MAIL_USER, pass: process.env.MAIL_PASS },
});

transporter.sendMail({
  from: process.env.MAIL_FROM || `CodeSphere <${process.env.MAIL_USER}>`,
  to: process.env.MAIL_USER,
  subject: 'CodeSphere SMTP delivery test',
  html: '<p>SMTP delivery test from CodeSphere backend.</p>',
}, (err, info) => {
  if (err) {
    console.error('Send failed:', err.message);
    console.error(err);
    process.exit(1);
  }
  console.log('Send success', info);
  process.exit(0);
});

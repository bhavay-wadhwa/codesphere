import nodemailer from "nodemailer";

export const isMailConfigured = () => Boolean(
  process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS,
);

const mailSender = async (email, title, body) => {
  if (!isMailConfigured()) {
    throw new Error("Email delivery is not configured");
  }

  const port = Number(process.env.MAIL_PORT || 587);
  const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port,
    secure: process.env.MAIL_SECURE === "true",
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || `CodeSphere <${process.env.MAIL_USER}>`,
    to: email,
    subject: title,
    html: body,
  });

  if (info.rejected?.length) {
    throw new Error("The email provider rejected the message");
  }

  return info;
};

export default mailSender;

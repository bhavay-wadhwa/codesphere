import nodemailer from "nodemailer";
import sgMail from "@sendgrid/mail";

export const isMailConfigured = () => Boolean(
  process.env.SENDGRID_API_KEY || (process.env.MAIL_HOST && process.env.MAIL_USER && process.env.MAIL_PASS),
);

const getDefaultSender = () => {
  if (process.env.MAIL_FROM) {
    return process.env.MAIL_FROM;
  }

  if (process.env.MAIL_USER) {
    return `CodeSphere <${process.env.MAIL_USER}>`;
  }

  return "CodeSphere <no-reply@codesphere.app>";
};

const sendViaSendGrid = async (email, title, body) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("SendGrid API key is not configured");
  }

  sgMail.setApiKey(process.env.SENDGRID_API_KEY);

  const message = {
    to: email,
    from: getDefaultSender(),
    subject: title,
    html: body,
  };

  const [response] = await sgMail.send(message);
  if (response?.statusCode >= 400) {
    throw new Error(`SendGrid returned status ${response.statusCode}`);
  }

  return response;
};

const sendViaSmtp = async (email, title, body) => {
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
    from: getDefaultSender(),
    to: email,
    subject: title,
    html: body,
  });

  if (info.rejected?.length) {
    throw new Error("The email provider rejected the message");
  }

  return info;
};

const mailSender = async (email, title, body) => {
  if (!isMailConfigured()) {
    throw new Error("Email delivery is not configured");
  }

  if (process.env.SENDGRID_API_KEY) {
    return sendViaSendGrid(email, title, body);
  }

  return sendViaSmtp(email, title, body);
};

export default mailSender;

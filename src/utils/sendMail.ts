import nodemailer from "nodemailer";
import { getTemplate } from "./getMailTemplates";

export type Options = {
  email: string;
  subject: string;
  message: string;
  username?: string;
  dashboardLink?: string;
  tag?: string;
  description?: string;
  attachments?: Array<{   
    filename: string;
    path: string;
    contentType?: string;
  }>;
};
export const sendMail = async (options: Options) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: 465,
      secure: true,
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: options.email,
      subject: options.subject,
      html: getTemplate(options),
      attachments: options.attachments || [] 
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.log(error);
  }
};

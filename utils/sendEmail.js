import nodemailer from "nodemailer";

export const sendResetEmail = async (toEmail, resetLink) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail", // or use another SMTP provider
      auth: {
        user: process.env.EMAIL_USER, // your Gmail address
        pass: process.env.EMAIL_PASS, // app password (not your Gmail password)
      },
    });

    const mailOptions = {
      from: `"BITO-SUPPORT" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: "Reset Your Password - Waffle",
      html: `
        <h3>Password Reset Requested</h3>
        <p>Click the link below to reset your password:</p>
        <a href="${resetLink}" target="_blank">${resetLink}</a>
        <p>This link will expire in 15 minutes.</p>
        <p>If you didn't request this, you can safely ignore it.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Reset email sent to:", toEmail);
  } catch (error) {
    console.error("Failed to send email:", error);
    throw new Error("Could not send reset email.");
  }
};

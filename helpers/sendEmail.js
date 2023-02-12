const nodemailer = require("nodemailer");
require("dotenv").config();

const { META_EMAIL, META_PASSWORD } = process.env;

const nodemailerConfig = {
  host: "smtp.meta.ua",
  port: 465,
  secure: true,
  auth: {
    user: "krav_ol@meta.ua",
    pass: "Ckj;ysqgfhjkm",
  },
};

const transporter = nodemailer.createTransport(nodemailerConfig);

const sendEmail = async (data) => {
  try {
    const email = {
      ...data,
      from: "krav_ol@meta.ua",
    };
    await transporter.sendMail(email);
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = sendEmail;

const { User } = require("../models/UsersModel");
const path = require("path");
const fs = require("fs/promises");
const { isValidObjectId } = require("mongoose");
const { Conflict, Unauthorized, BadRequest, NotFound } = require("http-errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { token } = require("morgan");
const Jimp = require("jimp");
const sendEmail = "../helpers/sendEmail.js";
const { JWT_SECRET } = process.env;

class UsersController {
  async register(req, res, next) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (user) {
      throw new Conflict(`User with this email: ${email} already registered`);
    }

    const hashedPassword = await bcrypt.hash(password, await bcrypt.genSalt());

    const newUser = await User.create({
      email,
      password: hashedPassword,
    });
    res.status(201).json({
      user: {
        email: newUser.email,
        subscription: newUser.subscription,
      },
    });
  }

  async login(req, res, next) {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !bcrypt.compare(password, user.password)) {
      throw new Unauthorized("Email is wrong");
    }

    const payload = { id: user._id };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "10h" });
    await User.findByIdAndUpdate(user._id, { token });

    res.json({ data: token, user: { email, subscription: user.subscription } });
  }

  async logout(req, res, next) {
    const { _id } = req.user;

    const user = await User.findByIdAndUpdate(_id, { token: null });

    if (!user) {
      throw new Unauthorized(`User with this ${_id} does not found`);
    }

    res.status(204).json({ status: "No content" });
  }

  async getCurrentUser(req, res, next) {
    const { _id } = req.user;

    const user = await User.findById(_id);

    if (!user) {
      throw new Unauthorized("Not authorized");
    }

    const { email, subscription } = user;
    res.status(200).json({ email: email, subscription: subscription });
  }

  async updateAvatar(req, res, next) {
    const avatarDir = path.join(__dirname, "..", "public", "avatar");
    const { path: tempLoad, originalname } = req.file;
    const { _id } = req.user;
    const imageName = `${_id}_${originalname}`;
    try {
      const resultUpload = path.join(avatarDir, imageName);
      await Jimp.read(resultUpload)
        .then((avatar) => {
          return avatar.resize(250, 250).write(resultUpload);
        })
        .catch((err) => {
          console.log(err);
        });
      await User.findByIdAndUpdate(
        _id,
        {
          avatarURL: `${req.protocol + "://" + req.get("host")}/avatars/${
            _id + ".jpeg"
          }`,
        },
        { new: true }
      );
      res.json({
        avatarURL: `${req.protocol + "://" + req.get("host")}/avatars/${
          _id + ".jpeg"
        }`,
      });
    } catch (error) {
      await fs.unlink(tempLoad);
      throw error;
    }
  }

  async verify(req, res, next) {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      throw new NotFound(`User not found`);
    }

    const { verificationToken, verify } = user;

    if (verify) {
      throw new BadRequest("Verification has already been passed");
    }
    const mail = {
      to: email,
      subject:
        "The Second International Intergalactic Conference in New Vasyuki on the Problems of the Military Space Forces of russia in black holes",
      html: `<a target="_blank" href="https://localhost:3001/api/users/verify/${verificationToken}">Press to confirm email</a>`,
    };

    await sendEmail(mail);

    res.json({
      message: "Verification email sent",
    });
  }

  async getVerificationUser(req, res, next) {
    const { verificationToken } = req.params;
    const user = await User.findOne({ verificationToken });

    if (!user) {
      throw new NotFound("User not found");
    }

    await User.findByIdAndUpdate(user._id, {
      verify: true,
      verificationToken: null,
    });

    res.json({
      message: "Verification successful",
    });
  }
}

module.exports = new UsersController();

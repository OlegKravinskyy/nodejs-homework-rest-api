const { User } = require("../models/UsersModel");
const path = require("path");
const fs = require("fs/promises");
const { isValidObjectId } = require("mongoose");
const { Conflict, Unauthorized } = require("http-errors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { token } = require("morgan");
const Jimp = require("jimp");
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

  //   const { originalname, path: tmpDir } = req.file;
  // const { _id } = req.user;

  // try {
  //   const [extension] = originalname.split(".").reverse();
  //   const newImgName = `userAvatar_${_id}.${extension}`;
  //   const originalImg = await Jimp.read(tmpDir);
  //   const resizedImg = await originalImg.cover(250, 250);
  //   await resizedImg.write(`${uploadDir}/avatars/${newImgName}`);
  //   fs.unlink(tmpDir);
  //   const avatar = path.join(avatarURLpath, newImgName);
  //   const result = await auth.updateAvatar(avatar, _id);
  //   const { avatarURL } = result;
  //   res.status(200).json({ avatarURL });
  // } catch (error) {
  //   fs.unlink(tmpDir);
  //   res.json({ error });
  // }
}

module.exports = new UsersController();

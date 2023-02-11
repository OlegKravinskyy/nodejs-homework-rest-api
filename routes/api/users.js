const express = require("express");
const UsersController = require("../../controllers/UsersController");
const { schemas } = require("../../models/UsersModel");
const { tryCatchWrapper } = require("../../helpers/index");
const { auth } = require("../../middlewares/auth");
const { upload } = require("../../middlewares/updateAvatar");
const validation = require("../../helpers/validation");

const router = express.Router();

router.post(
  "/users/register",
  validation(schemas.register),
  tryCatchWrapper(UsersController.register)
);

router.post(
  "/users/login",
  validation(schemas.login),
  tryCatchWrapper(UsersController.login)
);

router.post(
  "/users/logout",
  tryCatchWrapper(auth),
  tryCatchWrapper(UsersController.logout)
);

router.get(
  "/users/current",
  tryCatchWrapper(auth),
  tryCatchWrapper(UsersController.getCurrentUser)
);

router.patch(
  "/users/avatars",
  tryCatchWrapper(auth),
  upload.single("avatar"),
  tryCatchWrapper(UsersController.updateAvatar)
);

module.exports = router;

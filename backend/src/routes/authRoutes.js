import express from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";

import { authLimiter } from "../middleware/rateLimiter.js";
import { protect } from "../middleware/authMiddleware.js";
import { body } from "express-validator";
import validate from "../middleware/validationMiddleware.js";

const registrationValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required.")
    .isLength({ max: 100 })
    .withMessage("Name must be 100 characters or fewer."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address."),
  body("password")
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be equal or greater than 6 characters."),
  validate,
];

const loginValidation = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address."),
  body("password").notEmpty().withMessage("Password is required."),
  validate,
];

const profileValidation = [
  body("name")
    .optional({ values: "undefined" })
    .trim()
    .notEmpty()
    .withMessage("Name cannot be empty.")
    .isLength({ max: 100 })
    .withMessage("Name must be 100 characters or fewer."),
  body("password")
    .optional({ values: "undefined" })
    .isLength({ min: 6, max: 128 })
    .withMessage("Password must be equal or greater than 6 characters."),
  validate,
];

const router = express.Router();

router.post("/register", authLimiter, registrationValidation, registerUser);

router.post("/login", authLimiter, loginValidation, loginUser);

router.post("/logout", protect, logoutUser);

router.get(
  "/profile",
  protect,
  (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  },
  getProfile,
);
router.put("/profile", protect, profileValidation, updateProfile);

export default router;

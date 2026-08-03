import express from "express";
import { body } from "express-validator";

import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
} from "../controllers/authController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Validation Rules
|--------------------------------------------------------------------------
*/
const registerValidation = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email."),
  body("password")
    .notEmpty()
    .withMessage("Password is required.")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters."),
];

const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required.")
    .isEmail()
    .withMessage("Please provide a valid email."),
  body("password").notEmpty().withMessage("Password is required."),
];

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
router.post("/register", registerValidation, registerUser);
router.post("/login", loginValidation, loginUser);
router.post("/logout", protect, logoutUser);
router.get("/profile", protect, getProfile);

export default router;

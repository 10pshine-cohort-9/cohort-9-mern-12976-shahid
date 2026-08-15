import express from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";

import {authLimiter} from "../middleware/rateLimiter.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", authLimiter, registerUser);

router.post("/login", authLimiter, loginUser);

router.post("/logout", protect, logoutUser);

router.get("/profile", protect, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
}, getProfile);
router.put("/profile", protect, updateProfile);

export default router;

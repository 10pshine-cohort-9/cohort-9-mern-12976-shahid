import express from "express";

import {
  registerUser,
  loginUser,
  logoutUser,
  getProfile,
} from "../controllers/authController.js";

import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.post("/logout", protect, logoutUser);

router.get("/profile", protect, (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
}, getProfile);

export default router;

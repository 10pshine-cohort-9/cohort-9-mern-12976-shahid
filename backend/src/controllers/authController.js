import User from "../models/User.js";
import generateToken from "../utils/generateToken.js";
import logger from "../config/logger.js";
import { serializeUser } from "../utils/serializeUser.js";

const registerUser = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400);
      throw new Error("All fields are required.");
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      logger.warn({
        event: "REGISTER_FAILED",
        email,
        reason: "Email already exists",
      });

      res.status(409);
      throw new Error("Email already exists.");
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    logger.info({
      event: "REGISTER_SUCCESS",
      userId: user._id,
      email: user.email,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token: generateToken(user._id),
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error({
      event: "REGISTER_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400);
      throw new Error("Email and password are required.");
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      logger.warn({
        event: "LOGIN_FAILED",
        email,
        reason: "User not found",
      });

      res.status(401);
      throw new Error("Invalid email or password.");
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.warn({
        event: "LOGIN_FAILED",
        email,
        reason: "Incorrect password",
      });

      res.status(401);
      throw new Error("Invalid email or password.");
    }

    logger.info({
      event: "LOGIN_SUCCESS",
      userId: user._id,
      email: user.email,
    });

    res.status(200).json({
      success: true,
      message: "Login successful.",

      token: generateToken(user._id),
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error({
      event: "LOGIN_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

const logoutUser = async (req, res) => {
  logger.info({
    event: "LOGOUT_SUCCESS",
    userId: req.user._id,
    email: req.user.email,
  });

  res.status(200).json({
    success: true,
    message: "Logout successful.",
  });
};

const getProfile = async (req, res) => {
  logger.info({
    event: "GET_PROFILE",
    userId: req.user._id,
  });

  res.status(200).json({
    success: true,
    user: serializeUser(req.user),
  });
};

const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      res.status(404);
      throw new Error("User not found.");
    }

    const { name, password } = req.body;

    if (typeof name === "string" && name.trim()) {
      user.name = name.trim();
    }

    if (typeof password === "string" && password.trim()) {
      user.password = password.trim();
    }

    await user.save();

    logger.info({
      event: "UPDATE_PROFILE_SUCCESS",
      userId: user._id,
    });

    res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: serializeUser(user),
    });
  } catch (error) {
    logger.error({
      event: "UPDATE_PROFILE_ERROR",
      message: error.message,
      stack: error.stack,
    });

    next(error);
  }
};

export { registerUser, loginUser, logoutUser, getProfile, updateProfile };

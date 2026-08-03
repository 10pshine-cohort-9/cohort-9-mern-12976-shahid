import jwt from "jsonwebtoken";

import User from "../models/User.js";
import logger from "../config/logger.js";

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      logger.warn({
        event: "AUTH_FAILED",
        reason: "No token provided",
        ip: req.ip,
      });

      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      logger.warn({
        event: "AUTH_FAILED",
        reason: "User not found",
        userId: decoded.id,
      });

      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = user;

    logger.info({
      event: "AUTH_SUCCESS",
      userId: user._id,
      email: user.email,
    });

    next();
  } catch (error) {
    logger.error({
      event: "AUTH_ERROR",
      message: error.message,
      stack: error.stack,
    });

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export { protect };

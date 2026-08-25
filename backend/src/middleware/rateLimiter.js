import rateLimit from "express-rate-limit";

// In test mode we skip all rate limiting so test suites never hit 429
const noopMiddleware = (_req, _res, next) => next();

export const overallLimiter =
  process.env.NODE_ENV === "test"
    ? noopMiddleware
    : rateLimit({
        windowMs: 5 * 60 * 1000,
        max: 500,
        message: {
          status: 429,
          message: "Too many requests, please try again after 5 minutes",
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

export const authLimiter =
  process.env.NODE_ENV === "test"
    ? noopMiddleware
    : rateLimit({
        windowMs: 1 * 60 * 1000,
        max: 5,
        message: {
          status: 429,
          message:
            "Too many authentication attempts, please try again after 1 minute",
        },
        standardHeaders: true,
        legacyHeaders: false,
      });

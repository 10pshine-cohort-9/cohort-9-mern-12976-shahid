import logger from "../config/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.error({
    event: "APPLICATION_ERROR",
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",

    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

export default errorHandler;

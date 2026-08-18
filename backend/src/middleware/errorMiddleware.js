import logger from "../config/logger.js";

const errorHandler = (err, req, res, next) => {
  if (err.type === "entity.too.large") {
    return res.status(413).json({
      success: false,
      message:
        "Request payload is too large. Please use a smaller image or fewer embedded images in the note.",
    });
  }

  if (err.name === "MulterError") {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        success: false,
        message: "Image files must be 5MB or smaller.",
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message || "The uploaded file could not be processed.",
    });
  }

  logger.error({
    event: "APPLICATION_ERROR",
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
  });

  const statusCode =
    err.statusCode ??
    err.status ??
    (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",

    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
};

export default errorHandler;

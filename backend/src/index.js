import "dotenv/config";
import app from "./app.js";
import connectDB from "./config/db.js";
import logger from "./config/logger.js";

await connectDB();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(
    {
      event: "SERVER_START",
      port: PORT,
    },
    `Server running on http://localhost:${PORT}`,
  );
});

process.on("unhandledRejection", (error) => {
  logger.fatal({
    event: "UNHANDLED_REJECTION",
    message: error.message,
    stack: error.stack,
  });

  server.close(() => {
    process.exit(1);
  });
});

process.on("uncaughtException", (error) => {
  logger.fatal({
    event: "UNCAUGHT_EXCEPTION",
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

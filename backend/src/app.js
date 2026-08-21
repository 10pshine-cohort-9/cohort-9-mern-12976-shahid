import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import notFound from "./middleware/notFoundMiddleware.js";
import errorHandler from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { overallLimiter } from "./middleware/rateLimiter.js";
const app = express();
const BODY_SIZE_LIMIT = "10mb";
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length
      ? allowedOrigins
      : process.env.NODE_ENV === "production"
        ? false
        : true,
  }),
);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: BODY_SIZE_LIMIT }));
app.use(
  express.urlencoded({
    extended: true,
    limit: BODY_SIZE_LIMIT,
  }),
);

app.use(
  pinoHttp({
    logger,
  }),
);
app.use(overallLimiter);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Notes API is running successfully on the server",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/upload", uploadRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

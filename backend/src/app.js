import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import notFound from "./middleware/notFoundMiddleware.js";
import errorHandler from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import {overallLimiter}  from "./middleware/rateLimiter.js";
const app = express();
const BODY_SIZE_LIMIT = "10mb";

app.use(cors());
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

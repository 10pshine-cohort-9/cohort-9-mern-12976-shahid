/**
 * Minimal Express application used exclusively in tests.
 *
 * Rate limiting is disabled automatically when NODE_ENV=test
 * (rateLimiter.js checks process.env.NODE_ENV at module evaluation time,
 * and env.setup.cjs sets it before any module is loaded).
 */

import express from "express";
import authRoutes from "../../routes/authRoutes.js";
import notesRoutes from "../../routes/notesRoutes.js";
import notFound from "../../middleware/notFoundMiddleware.js";
import errorHandler from "../../middleware/errorMiddleware.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.get("/", (_req, res) => {
  res.status(200).json({ success: true, message: "Notes API is running successfully" });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

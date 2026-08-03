import express from "express";
import cors from "cors";

import authRoutes from "../../routes/authRoutes.js";
import noteRoutes from "../../routes/noteRoutes.js";
import notFound from "../../middleware/notFoundMiddleware.js";
import errorHandler from "../../middleware/errorMiddleware.js";

// Minimal Express app used only in tests — no DB connection, no logger setup
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.status(200).json({ success: true, message: "Notes API is running successfully" });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

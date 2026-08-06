import express from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import logger from "./config/logger.js";
import notFound from "./middleware/notFoundMiddleware.js";
import errorHandler from "./middleware/errorMiddleware.js";
import authRoutes from "./routes/authRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
const app = express();

app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  }),
);

app.use(
  pinoHttp({
    logger,
  }),
);

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Notes API is running successfully on the server",
  });
});
app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

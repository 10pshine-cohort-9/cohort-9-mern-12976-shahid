import mongoose from "mongoose";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    logger.info(
      {
        event: "DATABASE_CONNECTED",
        host: conn.connection.host,
        database: conn.connection.name,
      },
      "MongoDB Connected Successfully",
    );
  } catch (error) {
    logger.fatal({
      event: "DATABASE_CONNECTION_ERROR",
      message: error.message,
      stack: error.stack,
    });

    process.exit(1);
  }
};

export default connectDB;


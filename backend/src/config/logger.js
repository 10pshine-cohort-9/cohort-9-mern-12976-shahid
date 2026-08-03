import pino from "pino";

const isTest = process.env.NODE_ENV === "test";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  // pino-pretty is not compatible with Jest's VM module environment,
  // so we skip the transport during tests
  ...(isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard",
            ignore: "pid,hostname",
            singleLine: true,
          },
        },
      }),
});

export default logger;

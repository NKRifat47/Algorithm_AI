import app from "./app.js";
import { envVars } from "./app/config/env.js";
import { connectRedis, disconnectRedis } from "./app/config/redis.config.js";
import prisma from "./app/prisma/client.js";
import { startDailyCreditsRefreshCron } from "./app/jobs/dailyCreditsRefresh.js";

let server;
let creditsCron;

const PORT = envVars.PORT || 8001;

const startServer = async () => {
  try {
    console.log(`Environment: ${envVars.NODE_ENV}`);

    // Connect Redis
    await connectRedis();
    console.log("Redis Connected Successfully");

    // Daily credits refresh (12:00 AM US time)
    creditsCron = startDailyCreditsRefreshCron({
      credits: 300,
      tz: envVars.CREDITS_TIMEZONE || "America/New_York",
    });

    // Start server
    server = app.listen(PORT, () => {
      console.log(`Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start server
startServer();

/**
 * 🔴 Unhandled Promise Rejection
 */
process.on("unhandledRejection", async (err) => {
  console.error("Unhandled Rejection Detected... server shutting down...", err);

  if (server) {
    server.close(async () => {
      creditsCron?.stop?.();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(1);
    });
  } else {
    creditsCron?.stop?.();
    await prisma.$disconnect();
    await disconnectRedis();
    process.exit(1);
  }
});

/**
 * 🔴 Uncaught Exception
 */
process.on("uncaughtException", async (err) => {
  console.error("Uncaught Exception Detected... server shutting down...", err);

  if (server) {
    server.close(async () => {
      creditsCron?.stop?.();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(1);
    });
  } else {
    creditsCron?.stop?.();
    await prisma.$disconnect();
    await disconnectRedis();
    process.exit(1);
  }
});

/**
 * 🟡 SIGTERM (Docker / Kubernetes)
 */
process.on("SIGTERM", async () => {
  console.log("SIGTERM signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      creditsCron?.stop?.();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(0);
    });
  }
});

/**
 * 🟡 SIGINT (Ctrl + C)
 */
process.on("SIGINT", async () => {
  console.log("SIGINT signal received... shutting down gracefully");

  if (server) {
    server.close(async () => {
      creditsCron?.stop?.();
      await prisma.$disconnect();
      await disconnectRedis();
      process.exit(0);
    });
  }
});

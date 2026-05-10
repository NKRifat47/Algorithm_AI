import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { notFound } from "./app/middleware/notFound.js";
import { globalErrorHandler } from "./app/middleware/globalErrorHandeler.js";
import { router } from "./app/router/index.js";
import passport from "passport";
import "./app/config/passport.config.js";

dotenv.config();

const app = express();

// Global middlewares
app.use(
  cors({
    origin: [
      "https://kenneth-mckean-frontend.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With", 
    ],
    exposedHeaders: ["Content-Disposition"],
  }),
);
app.use(cookieParser());
app.use(
  express.json({
    limit: "50mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(passport.initialize());

// Collapse accidental double slashes (e.g. /api//user/...) so routes still match
app.use((req, res, next) => {
  if (typeof req.url === "string" && req.url.includes("//")) {
    const q = req.url.indexOf("?");
    const pathPart = q === -1 ? req.url : req.url.slice(0, q);
    const query = q === -1 ? "" : req.url.slice(q);
    if (pathPart.includes("//")) {
      req.url = pathPart.replace(/\/+/g, "/") + query;
    }
  }
  next();
});

// Routes
app.use("/api", router);
app.use("/uploads", express.static("uploads"));

// Health check
app.get("/", (req, res) => {
  res.send("Algorithm AI Server is running");
});

// 404 handler (must be after routes)
app.use(notFound);

// Global error handler (always last)
app.use(globalErrorHandler);

export default app;

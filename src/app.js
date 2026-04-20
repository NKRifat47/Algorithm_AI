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
const allowedOrigins = new Set(
  [
    "https://kenneth-mckean-frontend.vercel.app",
    "http://localhost:5173",
    process.env.FRONT_END_URL,
  ]
    .flatMap((v) => (typeof v === "string" ? v.split(",") : []))
    .map((v) => v.trim())
    .filter(Boolean),
);

const corsOptions = {
  origin: (origin, cb) => {
    // allow non-browser tools (no Origin header)
    if (!origin) return cb(null, true);
    if (allowedOrigins.has(origin)) return cb(null, true);
    return cb(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "X-Requested-With"],
  exposedHeaders: ["Content-Disposition"],
};

app.use(cors(corsOptions));
// Explicitly handle preflight requests (important for multipart/form-data)
app.options("*", cors(corsOptions));
app.use(cookieParser());
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(passport.initialize());

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

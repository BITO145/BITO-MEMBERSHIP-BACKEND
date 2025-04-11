import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import connectDB from "./db/db.js";
import rateLimit from "express-rate-limit";
import { createClient } from "redis";

dotenv.config();

connectDB();

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// token blacklisting
const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on("error", (err) => console.error("Redis error", err));
await redisClient.connect();

// Rate limiting – 95 request per 15 minutes we will modify when sent to production once
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 95,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use("/api/", apiLimiter);
app.use("/auth", apiLimiter, authRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

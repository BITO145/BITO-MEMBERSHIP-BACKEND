import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoute.js";
import enrollRoutes from "./routes/enrollmentRoute.js";
import connectDB from "./db/db.js";
import rateLimit from "express-rate-limit";
import { createClient } from "redis";
import webhookRoutes from "./routes/webhookRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import planRoutes from "./routes/planRoute.js";
import adminAnalyticsRoutes from "./routes/adminAnalyticsRoute.js";
import paymentRoutes from "./routes/payments.js";
import connectToCloudinary from "./config/cloudinary.js";

dotenv.config();

connectDB();
connectToCloudinary();

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5000",
      "http://localhost:5174",
      "https://bito-membership-frontend.vercel.app",
    ],
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
  max: 395,
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use("/api/", apiLimiter);
app.use("/auth", apiLimiter, authRoutes);
app.use("/member", apiLimiter, enrollRoutes);
app.use("/webhook", webhookRoutes);
app.use("/receive", userRoutes);
app.use("/plans", planRoutes);
app.use("/payment", paymentRoutes);
app.use("/admin", adminAnalyticsRoutes);

// Start the server
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("API is running 🟢");
});

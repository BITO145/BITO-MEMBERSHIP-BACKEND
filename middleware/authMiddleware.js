import jwt from "jsonwebtoken";
import { redisClient } from "../services/redisClient.js";

// console.log(process.env.JWT_SECRET);

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    //  check token against Redis blacklist:
    const blacklisted = await redisClient.get(`bl_${token}`);
    if (blacklisted) {
      return res.status(401).json({ message: "Token has been revoked" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ message: "Not authorized" });
  }
};

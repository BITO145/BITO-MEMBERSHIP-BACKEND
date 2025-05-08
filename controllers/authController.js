import axios from "axios";
import jwt from "jsonwebtoken";
import { oauth2Client } from "../utils/googleClient.js";
import { getGoogleAuthUrl } from "../utils/googleAuthUrl.js";
import Member from "../models/memberModel.js";
import { redisClient } from "../services/redisClient.js";
import bcrypt from "bcrypt";

const generateToken = (member) => {
  return jwt.sign(
    { _id: member._id, email: member.email },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_TIMEOUT,
    }
  );
};

const frontend = process.env.FRONTEND_URL;

// Google Authentication API.
export const googleAuth = async (req, res, next) => {
  const code = req.query.code;

  try {
    const googleRes = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(googleRes.tokens);

    const userRes = await axios.get(
      `https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=${googleRes.tokens.access_token}`
    );

    const { email, name, picture } = userRes.data;
    let user = await Member.findOne({ email });

    if (!user) {
      user = await Member.create({
        name,
        email,
        image: picture,
        membershipLevel: "basic",
      });
    }

    const { _id } = user;
    const token = jwt.sign({ _id, email }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_TIMEOUT,
    });

    // token in an HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      secure: true,
      maxAge: 3600000, // e.g., 1 hour
    });

    //  you can also pass the token in the URL if needed waise not recommoneded but its fine for now
    res.redirect(`${frontend}/signup?token=${token}`);
  } catch (err) {
    console.error("Google Auth Error:", err?.message);
    console.error("Full Error:", err?.response?.data || err);
    res.status(500).json({
      message: "Internal Server Error",
    });
  }
};

export const googleAuthUrl = async (req, res, next) => {
  try {
    const url = getGoogleAuthUrl();
    res.status(200).json({ url });
  } catch (error) {
    console.error("Error generating Google Auth URL:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

// Signup Controller
export const signup = async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;
    // Basic validation
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }
    // Check if user exists
    const existingUser = await Member.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" });
    }
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    // Create user
    const member = await Member.create({
      name,
      email,
      password: hashedPassword,
      membershipLevel: "basic",
    });
    // Generate token
    const token = generateToken(member);
    // Set token in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // only over HTTPS in production
      sameSite: "none",
      secure: true,
      maxAge: 3600000, // e.g., 1 hour in milliseconds
    });
    return res.status(201).json({ message: "Signup successful", user: member });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Login Controller
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    // Basic validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }
    // Find user by email
    const member = await Member.findOne({ email });
    if (!member) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Compare password
    const isMatch = bcrypt.compare(password, member.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    // Generate token
    const token = generateToken(member);
    // Set token in cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      secure: true,
      maxAge: 3600000,
    });
    return res.status(200).json({ message: "Login successful", user: member });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// Logout Controller ( using Redis token blacklisting)
export const logout = async (req, res) => {
  try {
    const token = req.cookies.token;
    console.log("Token:", token, "Type:", typeof token);

    if (token) {
      const redisKey = "bl_" + String(token);
      console.log("Blacklisting token with key:", redisKey);

      const keyStr = String(redisKey);
      const tokenStr = String(token);

      await redisClient.set(keyStr, tokenStr, { EX: 3600 });
    }

    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

//For cookie rehydration check it checks for token and the auth status
export const checkAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    if (!token) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await Member.findById(decoded._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({
      token,
      user,
      message: "Authentication verified",
    });
  } catch (error) {
    console.error("Auth verification error:", error);
    return res.status(401).json({ message: "Not authenticated" });
  }
};

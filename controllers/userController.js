import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import Member from "../models/memberModel.js";
import { redisClient } from "../services/redisClient.js";
import cloudinary from "cloudinary";
import fs from "fs";
import mongoose from "mongoose";
import OppModel from "../models/OppModel.js";
import Transaction from "../models/Transaction.js";

// controllers/eventController.js
export const getEvents = async (req, res, next) => {
  try {
    const cached = await redisClient.get("events");
    if (cached) {
      return res.status(200).json({ events: JSON.parse(cached) });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize date

    const events = await Event.find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .populate({
        path: "chapter",
        select: "chapterName", // ✅ Only bring the name
      });

    if (!events || events.length === 0) {
      return res.status(200).json({ message: "No upcoming events" });
    }

    await redisClient.setEx("events", 10, JSON.stringify(events));
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Server error fetching events." });
  }
};

export const getPastEvents = async (req, res) => {
  try {
    const cached = await redisClient.get("pastEvents");
    if (cached) {
      return res.status(200).json({ pastEvents: JSON.parse(cached) });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize date
    const pastEvents = await Event.find({ eventDate: { $lt: today } })
      .sort({ eventDate: -1 })
      .populate({
        path: "chapter",
        select: "chapterName", // ✅ Only bring the name
      });

    if (!pastEvents || pastEvents.length === 0) {
      return res.status(200).json({ message: "No past events" });
    }

    await redisClient.setEx("pastEvents", 10, JSON.stringify(pastEvents));
    res.status(200).json({ pastEvents });
  } catch (err) {
    console.error("Error fetching past events:", err);
    res.status(500).json({ error: "Server error fetching past events." });
  }
};

export const getChapters = async (req, res) => {
  try {
    const userId = req.user._id; // 👈 Get current logged-in user ID

    const cachedChapters = await redisClient.get("chapters");
    if (cachedChapters) {
      const chapters = JSON.parse(cachedChapters);

      // ✅ Enrich with isMember dynamically
      const enrichedChapters = chapters.map((chapter) => {
        const isMember = chapter.members.some(
          (member) => member.memberId.toString() === userId.toString()
        );
        return { ...chapter, isMember };
      });

      return res.status(200).json({ chapters: enrichedChapters });
    }

    const chapters = await Chapter.find({})
      .populate("events") // 👈 Add populate here
      .sort({ createdAt: -1 });
    await redisClient.setEx("chapters", 30, JSON.stringify(chapters));

    // ✅ Enrich with isMember dynamically
    const enrichedChapters = chapters.map((chapter) => {
      const isMember = chapter.members.some(
        (member) => member.memberId.toString() === userId.toString()
      );
      return { ...chapter.toObject(), isMember }; // Ensure it's a plain object
    });

    res.status(200).json({ chapters: enrichedChapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({ error: "Server error fetching chapters." });
  }
};

export const getOpportunities = async (req, res) => {
  try {
    const userId = req.user._id; // Get current logged-in user ID

    const cachedOpportunities = await redisClient.get("opportunities");
    if (cachedOpportunities) {
      const opportunities = JSON.parse(cachedOpportunities);

      // Enrich with isMember dynamically
      const enrichedOpportunities = opportunities.map((opportunity) => {
        const isMember = opportunity.interestedMembers?.some(
          // Added optional chaining
          (member) =>
            member.memberId && member.memberId.toString() === userId.toString() // Added member.memberId check
        );
        return { ...opportunity, isMember };
      });

      return res.status(200).json({ opportunities: enrichedOpportunities });
    }

    const opportunities = await OppModel.find({})
      .populate("interestedMembers.memberId")
      .sort({ createdAt: -1 });
    await redisClient.setEx("opportunities", 30, JSON.stringify(opportunities));

    // Enrich with isMember dynamically
    const enrichedOpportunities = opportunities.map((opportunity) => {
      const isMember = opportunity.interestedMembers?.some(
        // Optional chaining already present, ensure memberId check
        (member) =>
          member.memberId && member.memberId.toString() === userId.toString() // Added member.memberId check
      );
      return { ...opportunity.toObject(), isMember }; // Ensure it's a plain object
    });

    res.status(200).json({ opportunities: enrichedOpportunities });
  } catch (error) {
    console.error("Error fetching opportunities:", error);
    res.status(500).json({ error: "Server error fetching opportunities." });
  }
};

export const getMembersCount = async (req, res) => {
  try {
    const count = await Member.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching member count:", err);
    res.status(500).json({ message: "Unable to retrieve member count" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone, about, nationality, country, businessSector } = req.body;

    let profileImageUrl = null;

    if (req.file) {
      // Upload to cloudinary manually
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "user-profiles",
      });
      profileImageUrl = result.secure_url;

      // Clean up local file
      fs.unlinkSync(req.file.path);
    }

    const updatedData = {
      ...(phone && { phone }),
      ...(about && { about }),
      ...(nationality && { nationality }),
      ...(country && { country }),
      ...(businessSector && { businessSector }),
      ...(profileImageUrl && { image: profileImageUrl }),
    };

    const updatedUser = await Member.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
      }
    });
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

export const getMemberEnrolledEvents = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId).populate({
      path: "eventsEnrolled",
      select: "eventName eventDate location",
      options: { sort: { eventDate: -1 } }, // 🆕 Sort by eventDate DESCENDING (latest first)
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

  //08-08-2025 res.status(200).json({ events: member.eventsEnrolled });

  res.status(200).json({ eventsEnrolled: member.eventsEnrolled || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getMemberEnrolledChapters = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Validate memberId
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid Member ID" });
    }

    // Find the member
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Get all chapters from the database
    const allChapters = await Chapter.find();

    // Extract the Chapter _ids (as strings) from the member's memberships
    // This is crucial: chapterId in member.chapterMemberships is an ObjectId
    const enrolledChapterObjectIds = member.chapterMemberships.map(
      (membership) => membership.chapterId.toString()
    );

    // Filter all chapters to find the ones the member is enrolled in using their _id
    const enrolledChaptersWithDetails = allChapters
      .filter((chapter) => {
        // Check if the chapter's _id (converted to string) is in the enrolledChapterObjectIds list
        return enrolledChapterObjectIds.includes(
          chapter.hmrsChapterId.toString()
        );
      })
      .map((chapter) => {
        // Split members by role
        const members = chapter.members.filter((m) => m.role === "member");
        const committees = chapter.members.filter(
          (m) => m.role === "committee"
        );

        return {
          _id: chapter._id,
          hmrsChapterId: chapter.hmrsChapterId,
          chapterName: chapter.chapterName,
          zone: chapter.zone,
          description: chapter.description,
          chapterLeadName: chapter.chapterLeadName,
          chapterLeadImage: chapter.image,
          members,
          committees,
        };
      });

    // If no chapters are enrolled
    if (
      !enrolledChaptersWithDetails ||
      enrolledChaptersWithDetails.length === 0
    ) {
      return res.status(200).json({
        chapters: [],
        message: "No enrolled chapters found for this member.",
      });
    }

    res.status(200).json({ chapters: enrolledChaptersWithDetails });
  } catch (err) {
    console.error("Error in getMemberEnrolledChapters:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

export const getUserTransactions = async (req, res) => {
  const userId = req.user._id;

  // parse & clamp pagination params
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  try {
    // fetch both the paginated docs and total count in parallel
    const [transactions, totalCount] = await Promise.all([
      Transaction.find({ user: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select([
          "orderId",
          "paymentId",
          "amount",
          "status",
          "failureReason",
          "paidAt",
          "cancelledAt",
          "createdAt",
        ])
        .populate(
          "plan",
          "name price durationDays" // ensure this matches your membershipPlan schema
        )
        .lean()
        .exec(),
      Transaction.countDocuments({ user: userId }),
    ]);

    return res.status(200).json({
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
      transactions,
    });
  } catch (err) {
    console.error("Error fetching user transactions:", err);
    return res.status(500).json({
      error: "Server error fetching your transactions.",
    });
  }
};

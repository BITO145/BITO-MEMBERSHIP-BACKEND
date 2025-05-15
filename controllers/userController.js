import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import Member from "../models/memberModel.js";
import { redisClient } from "../services/redisClient.js";

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

export const getChapters = async (req, res) => {
  try {
    const userId = req.user._id; // 👈 Get current logged-in user ID

    const cachedChapters = await redisClient.get("chapters");
    if (cachedChapters) {
      console.log("Cache hit for chapters.");
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

    console.log("Cache miss for chapters. Querying the database.");
    const chapters = await Chapter.find({})
      .populate("events") // 👈 Add populate here
      .sort({ createdAt: -1 });
    await redisClient.setEx("chapters", 30, JSON.stringify(chapters));
    console.log("Chapters cached in Redis.");

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
    console.log("this is user id", userId);
    const { phone, about, nationality, country, businessSector } = req.body;

    const updatedUser = await Member.findByIdAndUpdate(
      userId,
      {
        phone,
        about,
        nationality,
        country,
        businessSector,
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return res.status(500).json({
      error: "An error occurred while updating the profile",
    });
  }
};

import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import { redisClient } from "../services/redisClient.js";

// controllers/eventController.js
export const getEvents = async (req, res, next) => {
  try {
    const cached = await redisClient.get("events");
    if (cached) {
      return res.status(200).json({ events: JSON.parse(cached) });
    }

    const today = new Date();

    // We tell Mongoose:
    //  • path: "chapter"        ← the field on Event
    //  • model: "Chapter"       ← which collection to pull from
    //  • localField: "chapter"  ← Event.chapter holds the HMRS ID
    //  • foreignField: "hmrsChapterId" ← Chapter.hmrsChapterId is the same HMRS ID
    //  • justOne: true          ← we expect a single sub‑doc, not an array
    //  • select: "chapterName"  ← only bring in the name
    const events = await Event.find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .populate({
        path: "chapter",
        model: "Chapter",
        localField: "chapter",
        foreignField: "hmrsChapterId",
        justOne: true,
        select: "chapterName",
      });

    if (events.length === 0) {
      return res.status(200).json({ message: "No upcoming events" });
    }

    await redisClient.setEx("events", 60, JSON.stringify(events));
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Server error fetching events." });
  }
};

export const getChapters = async (req, res) => {
  try {
    const cachedChapters = await redisClient.get("chapters");
    if (cachedChapters) {
      console.log("Cache hit for chapters.");
      return res.status(200).json({ chapters: JSON.parse(cachedChapters) });
    }

    console.log("Cache miss for chapters. Querying the database.");
    const chapters = await Chapter.find({}).sort({ createdAt: -1 });

    await redisClient.setEx("chapters", 60, JSON.stringify(chapters));
    console.log("Chapters cached in Redis.");

    res.status(200).json({ chapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({ error: "Server error fetching chapters." });
  }
};

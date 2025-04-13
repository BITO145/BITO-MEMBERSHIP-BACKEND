import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import { redisClient } from "../services/redisClient.js";

export const getEvents = async (req, res) => {
  try {
    const cachedEvents = await redisClient.get("events");
    if (cachedEvents) {
      console.log("Cache hit for events.");
      return res.status(200).json({ events: JSON.parse(cachedEvents) });
    }

    console.log("Cache miss for events. Querying the database.");
    const events = await Event.find({}).sort({ eventDate: 1 });

    await redisClient.setEx("events", 60, JSON.stringify(events));
    console.log("Events cached in Redis.");

    res.status(200).json({ events });
  } catch (error) {
    console.error("Error fetching events:", error);
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

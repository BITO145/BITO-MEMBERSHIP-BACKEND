import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import { redisClient } from "../services/redisClient.js";

export const receiveEventWebhook = async (req, res) => {
  try {
    const {
      eventName,
      eventStartTime,
      eventEndTime,
      eventDate,
      location,
      description,
      membershipRequired,
      chapter, // HMRS chapter ID
      createdBy,
    } = req.body;

    // Validate required fields
    if (
      !eventName ||
      !eventStartTime ||
      !eventEndTime ||
      !eventDate ||
      !location ||
      !chapter
    ) {
      return res.status(400).json({
        error:
          "Please provide eventName, eventStartTime, eventEndTime, eventDate, location, and chapter.",
      });
    }

    // Create the event document in the Membership portal
    const newEvent = await Event.create({
      eventName,
      eventStartTime,
      eventEndTime,
      eventDate,
      location,
      description,
      membershipRequired,
      chapter,
      createdBy,
    });

    // Update the Chapter document in the Membership portal.
    // We expect the membership portal's Chapter has a unique field 'hmrsChapterId'
    const updatedChapter = await Chapter.findOneAndUpdate(
      { hmrsChapterId: chapter },
      { $addToSet: { events: newEvent._id } }, // add event ID if not already present
      { new: true }
    );

    // Update caches:
    // Cache the new event record, using key "event:<eventId>"
    await redisClient.set(
      `event:${newEvent._id}`,
      JSON.stringify(newEvent),
      { EX: 3600 } // expires in 1 hour
    );
    // Cache the updated chapter record, using key "chapter:<hmrsChapterId>"
    if (updatedChapter) {
      await redisClient.set(
        `chapter:${updatedChapter.hmrsChapterId}`,
        JSON.stringify(updatedChapter),
        { EX: 3600 }
      );
    }

    console.log("Received event webhook. New event created:", newEvent);
    console.log("Updated chapter with new event:", updatedChapter);

    res.status(201).json({
      message: "Event successfully received and stored. Chapter updated.",
      event: newEvent,
      chapter: updatedChapter,
    });
  } catch (error) {
    console.error("Error receiving event webhook:", error);
    res.status(500).json({
      error: "Server error while processing the event.",
    });
  }
};

//receive chapter hook
export const receiveChapterWebhook = async (req, res) => {
  try {
    const {
      hmrsChapterId,
      chapterName,
      zone,
      description,
      chapterLeadName,
      events,
    } = req.body;

    // Validate required fields
    if (!hmrsChapterId || !chapterName || !zone || !chapterLeadName) {
      return res.status(400).json({
        error:
          "hmrsChapterId, chapterName, zone, and chapterLeadName are required.",
      });
    }

    // Upsert chapter: if a chapter with the given hmrsChapterId exists, update it; otherwise, insert new
    const chapter = await Chapter.findOneAndUpdate(
      { hmrsChapterId },
      {
        $set: {
          chapterName,
          zone,
          description,
          chapterLeadName,
          events: events, // This will be set from the payload
        },
      },
      { new: true, upsert: true }
    );

    // Cache the updated/created chapter in Redis
    await redisClient.set(`chapter:${hmrsChapterId}`, JSON.stringify(chapter), {
      EX: 3600,
    });

    console.log("Received chapter webhook and processed:", chapter);
    res.status(201).json({
      message: "Chapter successfully received and stored.",
      chapter,
    });
  } catch (error) {
    console.error("Error processing chapter webhook:", error);
    res.status(500).json({ error: "Server error while processing chapter." });
  }
};

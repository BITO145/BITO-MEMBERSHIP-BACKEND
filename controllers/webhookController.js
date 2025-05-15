import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import Member from "../models/memberModel.js";
import { redisClient } from "../services/redisClient.js";

// receive event webhook
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

//receive memberole hook
export const updateMemberRole = async (req, res) => {
  try {
    const { memberId, chapterId, newRole } = req.body;
    if (!memberId || !chapterId || !newRole) {
      return res
        .status(400)
        .json({ error: "memberId, chapterId and newRole are required" });
    }

    // 1) Update the user’s chapterMemberships entry:
    const updatedUser = await Member.findOneAndUpdate(
      { _id: memberId, "chapterMemberships.chapterId": chapterId },
      { $set: { "chapterMemberships.$.role": newRole } },
      { new: true }
    );
    if (!updatedUser) {
      return res
        .status(404)
        .json({ error: "User or chapter membership not found" });
    }

    // 2) Update the Chapter’s local members array:
    const updatedChapter = await Chapter.updateOne(
      { hmrsChapterId: chapterId, "members.memberId": memberId },
      { $set: { "members.$.role": newRole } }
    );
    if (!updatedChapter.modifiedCount) {
      return res.status(404).json({ error: "Chapter membership not found" });
    }

    return res.status(200).json({
      message: "Role updated for that user–chapter pair",
      user: updatedUser,
      chapterUpdate: updatedChapter,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ error: error.message || "Server error during role update" });
  }
};

//receive delete chapter
export const deleteChapter = async (req, res) => {
  const { hmrsChapterId } = req.body;

  if (!hmrsChapterId) {
    return res.status(400).json({ error: "hmrsChapterId is required." });
  }

  try {
    // Step 1: Find the Chapter with this hmrsChapterId
    const chapter = await Chapter.findOne({ hmrsChapterId });

    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found." });
    }

    console.log(
      "🟢 Deleting chapter with hmrsChapterId (used in members):",
      chapter.hmrsChapterId
    );

    // Step 2: Delete the chapter itself
    await Chapter.deleteOne({ _id: chapter._id });
    console.log("✅ Chapter deleted from Chapter collection.");

    res.status(200).json({
      message: `Chapter with hmrsChapterId ${hmrsChapterId} deleted successfully.`,
    });
  } catch (err) {
    console.error("❌ Error deleting chapter:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

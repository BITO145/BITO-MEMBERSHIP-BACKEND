import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import Member from "../models/memberModel.js";
import { Types } from "mongoose";
import { redisClient } from "../services/redisClient.js";
import OppModel from "../models/OppModel.js";

// receive event webhook
export const receiveEventWebhook = async (req, res) => {
  try {
    const {
      hmrsEventId, // ✅ admin's event ID
      eventName,
      slots,
      link,
      eventStartTime,
      eventEndTime,
      eventDate,
      location,
      description,
      membershipRequired,
      chapter, // ✅ admin's chapter ID = hmrsChapterId
      createdBy,
      image,
    } = req.body;

    // Validate required fields
    if (
      !hmrsEventId ||
      !eventName ||
      !eventStartTime ||
      !eventEndTime ||
      !eventDate ||
      !location ||
      !chapter ||
      !image
    ) {
      return res.status(400).json({
        error:
          "Please provide hmrsEventId, eventName, eventStartTime, eventEndTime, eventDate, location, chapter, and image.",
      });
    }

    if (membershipRequired === true || membershipRequired === "true") {
      if (!slots || slots <= 0) {
        return res.status(400).json({
          error: "Membership-required events must have slots greater than 0.",
        });
      }
    }

    // ✅ Step 1: Find the membership portal's chapter by hmrsChapterId
    if (!chapter || !chapter.chapterId || !chapter.chapterName) {
      return res.status(400).json({
        error: "Chapter object must include chapterId and chapterName.",
      });
    }

    const chapterDoc = await Chapter.findOne({
      hmrsChapterId: chapter.chapterId,
    });
    if (!chapterDoc) {
      return res
        .status(404)
        .json({ error: "Chapter not found in membership portal." });
    }

    // ✅ Step 2: Upsert the event using hmrsEventId
    const newEvent = await Event.findOneAndUpdate(
      { hmrsEventId }, // match using admin ID
      {
        $set: {
          eventName,
          slots,
          link,
          eventStartTime,
          eventEndTime,
          eventDate,
          location,
          image,
          description,
          membershipRequired,
          chapter: {
            chapterId: chapter.chapterId,
            chapterName: chapter.chapterName,
          },
          createdBy,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // ✅ Step 3: Ensure event is in chapter's events[] array
    await Chapter.findByIdAndUpdate(chapterDoc._id, {
      $addToSet: { events: newEvent._id },
    });

    // ✅ Step 4: Cache event and chapter
    await redisClient.set(`event:${newEvent._id}`, JSON.stringify(newEvent), {
      EX: 3600,
    });
    await redisClient.set(
      `chapter:${chapterDoc.hmrsChapterId}`,
      JSON.stringify(chapterDoc),
      {
        EX: 3600,
      }
    );


    res.status(201).json({
      message: "Event successfully received and stored.",
      event: newEvent,
    });
  } catch (error) {
    console.error("❌ Error receiving event webhook:", error);
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
      image,
    } = req.body;

    // Validate required fields
    if (!hmrsChapterId || !chapterName || !zone || !chapterLeadName || !image) {
      return res.status(400).json({
        error:
          "hmrsChapterId, chapterName, zone, chapterLeadName, and image are required.",
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
          events: events || [], // This will be set from the payload
          image: image || "",
        },
      },
      { new: true, upsert: true }
    );

    // Cache the updated/created chapter in Redis
    await redisClient.set(`chapter:${hmrsChapterId}`, JSON.stringify(chapter), {
      EX: 3600,
    });

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

//receive opportunity
export const receiveOpp = async (req, res) => {
  try {
    const {
      hrmsOppId,
      oppName,
      startDate,
      endDate,
      location,
      image,
      description,
      membershipRequired,
    } = req.body;

    const newOpp = new OppModel({
      hrmsOppId,
      oppName,
      startDate,
      endDate,
      location,
      image,
      description,
      membershipRequired,
    });

    await newOpp.save();

    res
      .status(201)
      .json({ message: "Opportunity synced to membership portal." });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ error: err.message });
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

    // Step 2: Delete the chapter itself
    await Chapter.deleteOne({ _id: chapter._id });

    res.status(200).json({
      message: `Chapter with hmrsChapterId ${hmrsChapterId} deleted successfully.`,
    });
  } catch (err) {
    console.error("❌ Error deleting chapter:", err);
    res.status(500).json({ error: "Internal server error." });
  }
};

//receive delete event
export const deleteEvent = async (req, res) => {
  const { eventId, chapterId } = req.body; // admin's event _id and chapter _id

  if (!eventId || !chapterId) {
    return res
      .status(400)
      .json({ error: "eventId and chapterId are required." });
  }

  try {
    // Convert string to ObjectId
    const eventObjectId = Types.ObjectId.createFromHexString(eventId);

    // ✅ Step 1: Find the event using admin's hmrsEventId
    const deletedEvent = await Event.findOneAndDelete({
      hmrsEventId: eventObjectId,
    });

    if (!deletedEvent) {
      return res
        .status(404)
        .json({ error: "Event not found in membership portal." });
    }

    // ✅ Step 2: Remove it from chapter.events[] using hmrsChapterId
    const updatedChapter = await Chapter.findOneAndUpdate(
      { hmrsChapterId: chapterId },
      { $pull: { events: deletedEvent._id } },
      { new: true }
    );

    if (!updatedChapter) {
      return res
        .status(404)
        .json({ error: "Chapter not found using hmrsChapterId." });
    }

    res.status(200).json({
      message: "Event deleted successfully from membership portal.",
      deletedEventId: deletedEvent._id,
    });
  } catch (err) {
    console.error("❌ Error deleting event in membership portal:", err.message);
    res
      .status(500)
      .json({ error: "Internal server error in membership portal." });
  }
};

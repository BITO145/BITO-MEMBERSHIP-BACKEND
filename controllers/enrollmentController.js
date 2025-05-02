import Member from "../models/memberModel.js";
import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import axios from "axios";

const hmrsUrl = process.env.HMRS_URL;

export const enrollMemberInChapter = async (req, res) => {
  try {
    const memberId = req.user._id;
    const { chapterId } = req.body;

    // Step 1: Fetch Member
    const member = await Member.findById(memberId).lean();
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Step 2: Check Membership Level
    if (!member.membershipLevel || member.membershipLevel === "free") {
      return res.status(403).json({
        error: "Your membership level does not allow enrollment in chapters.",
      });
    }

    // Step 3: Update Member's chapterMemberships array
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        $addToSet: {
          chapterMemberships: {
            chapterId,
            role: "member", // default at enrollment
            dateOfJoining: new Date(),
          },
        },
      },
      { new: true }
    );

    // Step 4: Prepare the payload (with explicit role!)
    const payload = {
      memberId: updatedMember._id,
      name: updatedMember.name,
      email: updatedMember.email,
      role: "member",
    };

    // Step 5: Add to Chapter.members sub-document
    await Chapter.findOneAndUpdate(
      { hmrsChapterId: chapterId },
      { $addToSet: { members: payload } }
    );

    // Step 6: Notify HMRS portal (unchanged sensitive functionality)
    await axios.post(
      `${hmrsUrl}/sa/chapters/${chapterId}/enrollMember`,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );

    // Step 7: Send success response
    res.status(200).json({
      message: "Enrollment in chapter successful.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

export const enrollMemberInEvent = async (req, res) => {
  try {
    const memberId = req.user._id;
    const { eventId } = req.body;

    // Fetch member
    const member = await Member.findById(memberId).lean();
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Check membership level
    const allowedLevels = ["gold", "diamond", "platinum"];
    if (!allowedLevels.includes(member.membershipLevel)) {
      return res.status(403).json({
        error: "Your membership level does not permit enrolling in events.",
      });
    }

    // Validate eventId
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    // Fetch event and its chapter
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }
    const chapterDoc = await Chapter.findOne({
      hmrsChapterId: event.chapter,
    }).lean();
    if (!chapterDoc) {
      return res.status(404).json({
        error: "The event's corresponding chapter does not exist.",
      });
    }

    // ——— NEW: check membership via chapterMemberships ———
    const enrolledChapterIds = (member.chapterMemberships || []).map((cm) =>
      cm.chapterId.toString()
    );
    if (!enrolledChapterIds.includes(chapterDoc.hmrsChapterId.toString())) {
      return res.status(400).json({
        error:
          "You are not registered in the corresponding chapter. Please register for the chapter before enrolling in an event.",
      });
    }

    // Prevent double-enrollment
    const enrolledEvents = (member.eventsEnrolled || []).map((ev) =>
      ev.toString()
    );
    if (enrolledEvents.includes(eventId.toString())) {
      return res
        .status(409)
        .json({ error: "User is already registered for this event." });
    }

    // Enroll in event
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        $addToSet: { eventsEnrolled: eventId },
        $inc: { noOfEventsAttended: 1 },
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Enrollment in event successful.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Enrollment in event error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

import Member from "../models/memberModel.js";
import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import OppModel from "../models/OppModel.js";
import axios from "axios";
import { redisClient } from "../services/redisClient.js";

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
    if (!member.membershipLevel || member.membershipLevel === "basic") {
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

    try {
      await redisClient.del("chapters");
    } catch (err) {
      console.warn("⚠️ Failed to invalidate Redis cache:", err.message);
    }

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

    const hmrsEventId = event.hmrsEventId;

    const chapterDoc = await Chapter.findOne({
      hmrsChapterId: event.chapter.chapterId,
    }).lean();

    if (!chapterDoc) {
      return res.status(404).json({
        error: "The event's corresponding chapter does not exist.",
      });
    }

    // Check if member is part of the chapter
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

    // If membership is required, check slots
    if (
      event.membershipRequired === true ||
      event.membershipRequired === "true"
    ) {
      if (typeof event.slots !== "number" || event.slots <= 0) {
        return res.status(400).json({
          error: "No available slots for this event.",
        });
      }
    }

    // Enroll the member
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        $addToSet: { eventsEnrolled: eventId },
        $inc: { noOfEventsAttended: 1 },
      },
      { new: true }
    );

    // Build update payload for Event
    const eventUpdatePayload = {
      $addToSet: {
        members: {
          memberId: updatedMember._id,
          name: updatedMember.name,
          email: updatedMember.email,
          phone: updatedMember.phone,
        },
      },
    };

    // If membershipRequired, decrement slot count
    if (
      event.membershipRequired === true ||
      event.membershipRequired === "true"
    ) {
      eventUpdatePayload.$inc = { slots: -1 };
    }

    await Event.findByIdAndUpdate(eventId, eventUpdatePayload, { new: true });

    // Notify HMRS portal
    await axios.post(
      `${hmrsUrl}/sa/events/${hmrsEventId}/enrollMember`,
      {
        memberId: updatedMember._id,
        name: updatedMember.name,
        email: updatedMember.email,
        phone: updatedMember.phone,
      },
      {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Enrollment in event successful.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Enrollment in event error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

// controllers/enrollmentController.js
export const enrollMemberInOpp = async (req, res) => {
  try {
    const memberId = req.user._id; // from auth middleware
    const { hrmsOppId } = req.body;

    if (!hrmsOppId) {
      return res.status(400).json({ error: "Opportunity ID is required." });
    }

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({ error: "Member not found." });
    }

    const opportunity = await OppModel.findOne({ hrmsOppId });
    if (!opportunity) {
      return res.status(404).json({ error: "Opportunity not found." });
    }

    // Check if already enrolled: Using .some() with toString() for comparison
    if (
      opportunity.interestedMembers.some(
        (id) => id.toString() === memberId.toString()
      )
    ) {
      return res
        .status(409)
        .json({ error: "Already enrolled in this opportunity." });
    }

    // 1️⃣ Add member's ObjectId directly to opportunity's interestedMembers array
    opportunity.interestedMembers.push(memberId);
    await opportunity.save();

    // 2️⃣ Add opportunity to member's opportunitiesEnrolled array
    member.opportunitiesEnrolled = member.opportunitiesEnrolled || [];
    // Prevent duplicate entries for member.opportunitiesEnrolled
    if (!member.opportunitiesEnrolled.includes(opportunity._id)) {
      member.opportunitiesEnrolled.push(opportunity._id);
    }
    await member.save();

    // 3️⃣ Webhook to Admin Portal
    await axios.post(`${hmrsUrl}/sa/webhook/opportunity-enroll`, {
      hrmsOppId: opportunity.hrmsOppId,
      memberId: member._id.toString(),
      name: member.name,
      email: member.email,
      phone: member.phone,
      membershipLevel: member.membershipLevel || "basic",
    });

    return res
      .status(200)
      .json({ message: "Successfully enrolled in the opportunity." });
  } catch (error) {
    console.error("❌ Enrollment Error:", error);
    return res.status(500).json({ error: "Server error during enrollment." });
  }
};

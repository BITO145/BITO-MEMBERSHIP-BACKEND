import Member from "../models/memberModel.js";
import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import axios from "axios";

const hmrsUrl = process.env.HMRS_URL;
console.log(hmrsUrl);
export const enrollMemberInChapter = async (req, res) => {
  try {
    const memberId = req.user._id;
    const memberFull = await Member.findById(memberId);
    console.log(memberFull);
    if (!memberFull) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (!memberFull.membershipLevel || memberFull.membershipLevel === "free") {
      return res.status(403).json({
        error: "Your membership level does not allow enrollment in chapters.",
      });
    }

    const { chapterId } = req.body;

    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      { $addToSet: { chaptersEnrolled: chapterId } },
      { new: true }
    );

    const payload = {
      memberId: memberFull._id.toString(),
      name: memberFull.name,
      email: memberFull.email,
    };

    await Chapter.findOneAndUpdate(
      { hmrsChapterId: chapterId },
      { $addToSet: { members: payload } },
      { new: true }
    );
    // Call HMRS portal to update chapter's member list
    const hmrsApiUrl = `${hmrsUrl}/sa/chapters/${chapterId}/enrollMember`;
    await axios.post(hmrsApiUrl, payload, {
      withCredentials: true, // if HMRS needs your auth cookie
      headers: { "Content-Type": "application/json" },
    });
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
    // Get the authenticated member's ID from req.user (set by auth middleware)
    const memberId = req.user._id;

    // Retrieve the full member document.
    const member = await Member.findById(memberId).lean();
    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Check if the member's membership level allows event enrollment.
    const allowedLevels = ["gold", "diamond", "platinum"];
    if (!allowedLevels.includes(member.membershipLevel)) {
      return res.status(403).json({
        error: "Your membership level does not permit enrolling in events.",
      });
    }

    // Get eventId from request body.
    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ error: "eventId is required" });
    }

    // Check that the event exists.
    const event = await Event.findById(eventId).lean();
    if (!event) {
      return res.status(404).json({ error: "Event not found" });
    }

    // Ensure the event is associated with a valid chapter.
    // Here, event.chapter should hold the HMRS Chapter ID.
    const chapterDoc = await Chapter.findOne({
      hmrsChapterId: event.chapter,
    }).lean();
    if (!chapterDoc) {
      return res.status(404).json({
        error: "The event's corresponding chapter does not exist.",
      });
    }

    // *** Additional Check: Verify the member is already registered in the event's chapter ***
    // We assume that member.chaptersEnrolled contains the HMRS chapter IDs that the member is registered in.
    // Convert both values to strings to ensure proper comparison.
    const enrolledChapters = (member.chaptersEnrolled || []).map((ch) =>
      ch.toString()
    );
    if (!enrolledChapters.includes(chapterDoc.hmrsChapterId.toString())) {
      return res.status(400).json({
        error:
          "You are not registered in the corresponding chapter. Please register for the chapter before enrolling in an event.",
      });
    }

    // Check if the member is already registered for this event.
    const enrolledEvents = (member.eventsEnrolled || []).map((ev) =>
      ev.toString()
    );
    if (enrolledEvents.includes(eventId.toString())) {
      return res
        .status(409)
        .json({ error: "User is already registered for this event." });
    }

    // Update the member document:
    // - Add the eventId to eventsEnrolled using $addToSet (to avoid duplicates)
    // - Increment the noOfEventsAttended counter by 1.
    const updatedMember = await Member.findByIdAndUpdate(
      memberId,
      {
        $addToSet: { eventsEnrolled: eventId },
        $inc: { noOfEventsAttended: 1 },
      },
      { new: true }
    );

    res.status(200).json({
      message: "Enrollment in event successful.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Enrollment in event error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

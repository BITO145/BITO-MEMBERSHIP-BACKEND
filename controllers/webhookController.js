import Event from "../models/eventModel.js";

// Receive and process the event data from the admin-side webhook
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
      chapter, // still stored in event for reference
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

    // Save the event directly
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

    res.status(201).json({
      message: "Event successfully received and added.",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error receiving event webhook:", error);
    res.status(500).json({ error: "Server error while processing the event." });
  }
};

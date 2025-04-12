import eventModel from "../models/eventModel.js";  // Assuming you have an Event model
import chapterModel from "../models/chapterModel.js";  // Assuming you have a Chapter model

// Receive and process the event data from the admin-side webhook
export const receiveEventWebhook = async (req, res) => {
  try {
    // Extract event data from the request body
    const {
      eventName,
      eventStartTime,
      eventEndTime,
      eventDate,
      location,
      description,
      membershipRequired,
      chapter,  // chapter ID from the request body
    } = req.body;

    // Validate required fields
    if (!eventName || !eventStartTime || !eventEndTime || !eventDate || !location || !chapter) {
      return res.status(400).json({
        error: "Please provide eventName, eventStartTime, eventEndTime, eventDate, location, and chapter.",
      });
    }

    // Check if the chapter exists
    const chapterDoc = await chapterModel.findById(chapter);
    if (!chapterDoc) {
      return res.status(404).json({ error: "Chapter not found." });
    }

    // Create the event in the database (user-side)
    const newEvent = await eventModel.create({
      eventName,
      eventStartTime,
      eventEndTime,
      eventDate,
      location,
      description,
      membershipRequired,
      chapter,
    });

    // Update the Chapter document to include the new event's ID
    await chapterModel.findByIdAndUpdate(
      chapter,
      { $push: { events: newEvent._id } },
      { new: true }
    );

    // Respond with success
    res.status(201).json({
      message: "Event successfully received and added.",
      event: newEvent,
    });
  } catch (error) {
    console.error("Error receiving event webhook:", error);
    res.status(500).json({ error: "Server error while processing the event." });
  }
};

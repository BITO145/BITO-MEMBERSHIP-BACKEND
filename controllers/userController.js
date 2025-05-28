import Event from "../models/eventModel.js";
import Chapter from "../models/chapterModel.js";
import Member from "../models/memberModel.js";
import { redisClient } from "../services/redisClient.js";
import cloudinary from "cloudinary";
import fs from "fs";
import mongoose from "mongoose";

// controllers/eventController.js
export const getEvents = async (req, res, next) => {
  try {
    const cached = await redisClient.get("events");
    if (cached) {
      return res.status(200).json({ events: JSON.parse(cached) });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // normalize date

    const events = await Event.find({ eventDate: { $gte: today } })
      .sort({ eventDate: 1 })
      .populate({
        path: "chapter",
        select: "chapterName", // ✅ Only bring the name
      });

    if (!events || events.length === 0) {
      return res.status(200).json({ message: "No upcoming events" });
    }

    await redisClient.setEx("events", 10, JSON.stringify(events));
    res.status(200).json({ events });
  } catch (err) {
    console.error("Error fetching events:", err);
    res.status(500).json({ error: "Server error fetching events." });
  }
};

export const getChapters = async (req, res) => {
  try {
    const userId = req.user._id; // 👈 Get current logged-in user ID

    const cachedChapters = await redisClient.get("chapters");
    if (cachedChapters) {
      console.log("Cache hit for chapters.");
      const chapters = JSON.parse(cachedChapters);

      // ✅ Enrich with isMember dynamically
      const enrichedChapters = chapters.map((chapter) => {
        const isMember = chapter.members.some(
          (member) => member.memberId.toString() === userId.toString()
        );
        return { ...chapter, isMember };
      });

      return res.status(200).json({ chapters: enrichedChapters });
    }

    console.log("Cache miss for chapters. Querying the database.");
    const chapters = await Chapter.find({})
      .populate("events") // 👈 Add populate here
      .sort({ createdAt: -1 });
    await redisClient.setEx("chapters", 30, JSON.stringify(chapters));
    console.log("Chapters cached in Redis.");

    // ✅ Enrich with isMember dynamically
    const enrichedChapters = chapters.map((chapter) => {
      const isMember = chapter.members.some(
        (member) => member.memberId.toString() === userId.toString()
      );
      return { ...chapter.toObject(), isMember }; // Ensure it's a plain object
    });

    res.status(200).json({ chapters: enrichedChapters });
  } catch (error) {
    console.error("Error fetching chapters:", error);
    res.status(500).json({ error: "Server error fetching chapters." });
  }
};

export const getMembersCount = async (req, res) => {
  try {
    const count = await Member.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error("Error fetching member count:", err);
    res.status(500).json({ message: "Unable to retrieve member count" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { phone, about, nationality, country, businessSector } = req.body;

    let profileImageUrl = null;

    if (req.file) {
      // Upload to cloudinary manually
      const result = await cloudinary.v2.uploader.upload(req.file.path, {
        folder: "user-profiles",
      });
      profileImageUrl = result.secure_url;

      // Clean up local file
      fs.unlinkSync(req.file.path);
    }

    const updatedData = {
      ...(phone && { phone }),
      ...(about && { about }),
      ...(nationality && { nationality }),
      ...(country && { country }),
      ...(businessSector && { businessSector }),
      ...(profileImageUrl && { image: profileImageUrl }),
    };

    const updatedUser = await Member.findByIdAndUpdate(userId, updatedData, {
      new: true,
    });

    if (!updatedUser) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    fs.unlink(req.file.path, (err) => {
      if (err) {
        console.error("Error deleting file:", err);
      }
    });
    return res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};




export const getMemberEnrolledEvents = async (req, res) => {
  try {
    const { memberId } = req.params;

    // // In a real scenario, you would fetch data from the database here
    // // The following lines are commented out for dummy data purposes.
    // const member = await Member.findById(memberId).populate({
    //   path: "eventsEnrolled",
    //   select: "eventName eventDate location",
    //   options: { sort: { eventDate: -1 } }, // Sort by eventDate DESCENDING (latest first)
    // });

    // if (!member) {
    //   return res.status(404).json({ error: "Member not found" });
    // }

    // --- DUMMY DATA FOR FRONTEND TESTING ---
    const today = new Date();
    const dummyEvents = [
      // Upcoming Events (future dates)
      { _id: new mongoose.Types.ObjectId(), eventName: 'Future Tech Summit', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 1, 10, 10, 0).toISOString(), location: 'Virtual Conference Hall' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'AI & Machine Learning Workshop', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 2, 5, 9, 30).toISOString(), location: 'City Auditorium' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Blockchain Innovations Meetup', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 3, 1, 14, 0).toISOString(), location: 'Innovation Hub Co-working Space' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Web Development Bootcamp', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 1, 25, 9, 0).toISOString(), location: 'Online Platform' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Data Science Conference', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 2, 18, 9, 0).toISOString(), location: 'Convention Center' },

      // Past Events (previous dates)
      { _id: new mongoose.Types.ObjectId(), eventName: 'Spring Networking Gala', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 1, 20, 19, 0).toISOString(), location: 'Grand Hotel Ballroom' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Annual General Meeting 2024', eventDate: new Date(today.getFullYear() - 1, 11, 1, 11, 0).toISOString(), location: 'Headquarters Boardroom' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Digital Marketing Summit', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 2, 12, 9, 0).toISOString(), location: 'Online Webinar Platform' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Product Management Masterclass', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 3, 5, 10, 0).toISOString(), location: 'Training Institute' },
      { _id: new mongoose.Types.ObjectId(), eventName: 'Cybersecurity Workshop', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 4, 1, 13, 0).toISOString(), location: 'Tech Hub' },
    ];

    // Simulate network delay to better mimic real API calls
    await new Promise(resolve => setTimeout(resolve, 500));
    // -----------------------------------------------------

    res.status(200).json({ events: dummyEvents });
  } catch (err) {
    console.error("Error in getMemberEnrolledEvents (Dummy):", err); // Log the error to the console
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};

// export const getMemberEnrolledEvents = async (req, res) => {
//   try {
//     const { memberId } = req.params;

//     const member = await Member.findById(memberId).populate({
//       path: "eventsEnrolled",
//       select: "eventName eventDate location",
//       options: { sort: { eventDate: -1 } }, // 🆕 Sort by eventDate DESCENDING (latest first)
//     });

//     if (!member) {
//       return res.status(404).json({ error: "Member not found" });
//     }

//     res.status(200).json({ events: member.eventsEnrolled });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

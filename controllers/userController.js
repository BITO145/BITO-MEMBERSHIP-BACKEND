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



// dummy getMemberEnrolledEvents  data controller
// export const getMemberEnrolledEvents = async (req, res) => {
//   try {
//     const { memberId } = req.params;

//     // // In a real scenario, you would fetch data from the database here
//     // // The following lines are commented out for dummy data purposes.
//     // const member = await Member.findById(memberId).populate({
//     //   path: "eventsEnrolled",
//     //   select: "eventName eventDate location",
//     //   options: { sort: { eventDate: -1 } }, // Sort by eventDate DESCENDING (latest first)
//     // });

//     // if (!member) {
//     //   return res.status(404).json({ error: "Member not found" });
//     // }

//     // --- DUMMY DATA FOR FRONTEND TESTING ---
//     const today = new Date();
//     const dummyEvents = [
//       // Upcoming Events (future dates)
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Future Tech Summit', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 1, 10, 10, 0).toISOString(), location: 'Virtual Conference Hall' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'AI & Machine Learning Workshop', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 2, 5, 9, 30).toISOString(), location: 'City Auditorium' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Blockchain Innovations Meetup', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 3, 1, 14, 0).toISOString(), location: 'Innovation Hub Co-working Space' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Web Development Bootcamp', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 1, 25, 9, 0).toISOString(), location: 'Online Platform' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Data Science Conference', eventDate: new Date(today.getFullYear() + 0, today.getMonth() + 2, 18, 9, 0).toISOString(), location: 'Convention Center' },

//       // Past Events (previous dates)
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Spring Networking Gala', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 1, 20, 19, 0).toISOString(), location: 'Grand Hotel Ballroom' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Annual General Meeting 2024', eventDate: new Date(today.getFullYear() - 1, 11, 1, 11, 0).toISOString(), location: 'Headquarters Boardroom' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Digital Marketing Summit', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 2, 12, 9, 0).toISOString(), location: 'Online Webinar Platform' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Product Management Masterclass', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 3, 5, 10, 0).toISOString(), location: 'Training Institute' },
//       { _id: new mongoose.Types.ObjectId(), eventName: 'Cybersecurity Workshop', eventDate: new Date(today.getFullYear() + 0, today.getMonth() - 4, 1, 13, 0).toISOString(), location: 'Tech Hub' },
//     ];

//     // Simulate network delay to better mimic real API calls
//     await new Promise(resolve => setTimeout(resolve, 500));
//     // -----------------------------------------------------

//     res.status(200).json({ events: dummyEvents });
//   } catch (err) {
//     console.error("Error in getMemberEnrolledEvents (Dummy):", err); // Log the error to the console
//     res.status(500).json({ error: err.message || "Internal Server Error" });
//   }
// };

export const getMemberEnrolledEvents = async (req, res) => {
  try {
    const { memberId } = req.params;

    const member = await Member.findById(memberId).populate({
      path: "eventsEnrolled",
      select: "eventName eventDate location",
      options: { sort: { eventDate: -1 } }, // 🆕 Sort by eventDate DESCENDING (latest first)
    });

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    res.status(200).json({ events: member.eventsEnrolled });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// // dummy getMemberEnrolledChapters data controller
// export const getMemberEnrolledChapters = async (req, res) => {
//   try {
//     const { memberId } = req.params;

//     // Simulate finding a member (optional, but good for consistent structure)
//     // In a real scenario, you'd fetch the member by ID and populate chapters.
//     // const member = await Member.findById(memberId);
//     // if (!member) {
//     //   return res.status(404).json({ error: "Member not found" });
//     // }

//     // --- DUMMY DATA FOR ENROLLED CHAPTERS ---
//     const dummyEnrolledChapters = [
//       {
//         hmrsChapterId: new mongoose.Types.ObjectId(), // Use ObjectId for realistic IDs
//         chapterName: "Innovators Hub - North Zone",
//         zone: "North Zone",
//         description: "A dynamic chapter focused on fostering innovation and technological advancements.",
//         chapterLeadName: "Alice Wonderland",
//         chapterLeadImage: "https://via.placeholder.com/150/FF5733/FFFFFF?text=AL", // Placeholder image
//         members: [
//           { role: "member" }, { role: "member" }, { role: "committee" },
//           { role: "member" }, { role: "member" }, { role: "member" },
//           { role: "committee" }, { role: "member" }, { role: "member" },
//           { role: "member" }, { role: "member" }, { role: "member" },
//         ], // More members for realistic counts
//         events: [{}, {}, {}], // Dummy events for count
//       },
//       {
//         hmrsChapterId: new mongoose.Types.ObjectId(),
//         chapterName: "Leadership Nexus - South Zone",
//         zone: "South Zone",
//         description: "Dedicated to developing leadership skills and strategic thinking among members.",
//         chapterLeadName: "Bob The Builder",
//         chapterLeadImage: "https://via.placeholder.com/150/33FF57/FFFFFF?text=BB", // Placeholder image
//         members: [
//           { role: "member" }, { role: "committee" }, { role: "member" },
//           { role: "member" }, { role: "member" },
//         ],
//         events: [{}, {}, {}, {}], // Dummy events for count
//       },
//       {
//         hmrsChapterId: new mongoose.Types.ObjectId(),
//         chapterName: "Creative Minds - East Zone",
//         zone: "East Zone",
//         description: "Exploring new ideas and fostering creativity in various domains.",
//         chapterLeadName: "Charlie Chaplin",
//         chapterLeadImage: null, // No image for this one to test fallback
//         members: [
//           { role: "member" }, { role: "committee" }, { role: "member" },
//           { role: "committee" },
//         ],
//         events: [{}, {}],
//       },
//     ];

//     await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
//     // --- END DUMMY DATA ---

//     res.status(200).json({ chapters: dummyEnrolledChapters });
//   } catch (err) {
//     console.error("Error in getMemberEnrolledChapters (Dummy):", err);
//     res.status(500).json({ error: err.message || "Internal Server Error" });
//   }
// };

// export const getMemberEnrolledChapters = async (req, res) => {
//   try {
//     const { memberId } = req.params;

//     // Validate memberId
//     if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
//       return res.status(400).json({ error: "Invalid Member ID" });
//     }

//     // Find the member and populate their chapter memberships
//     const member = await Member.findById(memberId);
//     const chapter = await Chapter.find();
// console.log(member)
//     if (!member) {
//       return res.status(404).json({ error: "Member not found" });
//     }

//     // Extract the populated chapter objects
//     const enrolledChapters = member.chapterMemberships.map(membership => membership.chapterId);
// console.log(enrolledChapters)
// console.log(chapter)
//     // If no chapters are enrolled or populated
//     if (!enrolledChapters || enrolledChapters.length === 0) {
//       return res.status(200).json({ chapters: [], message: "No enrolled chapters found for this member." });
//     }

//     res.status(200).json({ chapters: enrolledChapters });
//   } catch (err) {
//     console.error("Error in getMemberEnrolledChapters:", err);
//     res.status(500).json({ error: err.message || "Internal Server Error" });
//   }
// };

export const getMemberEnrolledChapters = async (req, res) => {
  try {
    const { memberId } = req.params;

    // Validate memberId
    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      return res.status(400).json({ error: "Invalid Member ID" });
    }

    // Find the member
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({ error: "Member not found" });
    }

    // Get all chapters from the database
    const allChapters = await Chapter.find();
    console.log("All Chapters:", allChapters); // Debugging: Remove in production

    // Extract the Chapter _ids (as strings) from the member's memberships
    // This is crucial: chapterId in member.chapterMemberships is an ObjectId
    const enrolledChapterObjectIds = member.chapterMemberships.map(membership => membership.chapterId.toString());
    console.log("Enrolled Chapter Object IDs (from member):", enrolledChapterObjectIds); // Debugging: Remove in production

    // Filter all chapters to find the ones the member is enrolled in using their _id
    const enrolledChaptersWithDetails = allChapters.filter(chapter => {
      // Check if the chapter's _id (converted to string) is in the enrolledChapterObjectIds list
      return enrolledChapterObjectIds.includes(chapter.hmrsChapterId.toString());
    }).map(chapter => ({ // Format the chapter details as per frontend expectation
        _id: chapter._id,
        hmrsChapterId: chapter.hmrsChapterId,
        chapterName: chapter.chapterName,
        zone: chapter.zone,
        description: chapter.description,
        chapterLeadName: chapter.chapterLeadName,
        chapterLeadImage: chapter.image, // Assuming 'image' from Chapter model is 'chapterLeadImage' on frontend
        // Add any other fields your frontend expects for a chapter
    }));

    console.log("Enrolled Chapters with Details:", enrolledChaptersWithDetails); // Debugging: Remove in production

    // If no chapters are enrolled
    if (!enrolledChaptersWithDetails || enrolledChaptersWithDetails.length === 0) {
      return res.status(200).json({ chapters: [], message: "No enrolled chapters found for this member." });
    }

    res.status(200).json({ chapters: enrolledChaptersWithDetails });

  } catch (err) {
    console.error("Error in getMemberEnrolledChapters:", err);
    res.status(500).json({ error: err.message || "Internal Server Error" });
  }
};
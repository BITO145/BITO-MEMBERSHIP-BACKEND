import Member from "../models/memberModel.js";
import axios from "axios";

export const enrollMemberInChapter = async (req, res) => {
  try {
    const memberId = req.user._id;
    const memberFull = await Member.findById(memberId);
    console.log(memberFull);
    if (!memberFull) {
      return res.status(404).json({ error: "Member not found" });
    }

    if (memberFull.membershipLevel === "free") {
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
    // Call HMRS portal to update chapter's member list
    const hmrsApiUrl = `http://localhost:8000/api/chapters/${chapterId}/enrollMember`;
    await axios.post(hmrsApiUrl, { memberId });

    res.status(200).json({
      message: "Enrollment in chapter successful.",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Enrollment error:", error);
    res.status(500).json({ error: "Server error" });
  }
};

import Transaction from "../models/Transaction.js";
// import membershipPlan from "../models/membershipPlan.js";
import Member from "../models/memberModel.js";
// import mongoose from "mongoose";

/**
 * GET /api/admin/membership-stats
 *   { byPlan: [ { planName, count, revenue } ], totalCount, totalRevenue }
 */
export const membershipStats = async (req, res) => {
  // Only paid txns
  const stats = await Transaction.aggregate([
    { $match: { status: "paid" } },
    {
      $group: {
        _id: "$plan",
        count: { $sum: 1 },
        revenue: { $sum: "$amount" },
      },
    },
    {
      $lookup: {
        from: "membershipplans",
        localField: "_id",
        foreignField: "_id",
        as: "plan",
      },
    },
    { $unwind: "$plan" },
    {
      $project: {
        planName: "$plan.name",
        count: 1,
        revenue: 1,
      },
    },
  ]);

  const totalCount = stats.reduce((s, p) => s + p.count, 0);
  const totalRevenue = stats.reduce((s, p) => s + p.revenue, 0);

  res.json({ byPlan: stats, totalCount, totalRevenue });
};

/**
 * GET /api/admin/membership-transactions
 *   [ { planName, user:{name,email,phone}, paidAt, amount } ]
 */
export const membershipTransactions = async (req, res) => {
  const txns = await Transaction.find({ status: "paid" })
    .sort({ createdAt: -1 })
    .populate("plan", "name")
    .populate("user", "name email phone")
    .lean();

  const data = txns.map((tx) => ({
    planName: tx.plan.name,
    user: {
      name: tx.user.name,
      email: tx.user.email,
      phone: tx.user.phone,
    },
    paidAt: tx.createdAt,
    amount: tx.amount,
  }));

  res.json(data);
};

export const getMembers = async (req, res) => {
  try {
    const members = await Member.find({})
      .select("-password -verificationToken") // remove sensitive fields
      .lean(); // optional: returns plain JS objects

    res.status(200).json({ members });
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
};

export const memberProfile = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id).lean();
    if (!member) return res.status(404).json({ error: "Not found" });
    res.status(200).json({ member });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch member" });
  }
};

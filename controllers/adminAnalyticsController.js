import Transaction from "../models/Transaction.js";
// import membershipPlan from "../models/membershipPlan.js";
// import Member from "../models/memberModel.js";
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

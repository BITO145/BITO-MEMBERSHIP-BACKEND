import membershipPlan from "../models/membershipPlan.js";

export const addPlan = async (req, res) => {
  try {
    const { name, price, durationDays, benefits } = req.body;

    const plan = await membershipPlan.create({
      name,
      price,
      durationDays,
      benefits,
    });

    res.status(201).json(plan);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const listPlans = async (req, res) => {
  const plans = await membershipPlan.find().sort({ price: 1 });
  res.json(plans);
};

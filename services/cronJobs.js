import cron from "node-cron";
import Member from "../models/memberModel.js";

//this is cron jobs
export const setupMembershipExpiryCron = () => {
  cron.schedule("0 0 * * *", async () => {
    console.log("Running daily membership expiry check...");
    const currentDateTime = new Date();

    try {
      const expiredMembers = await Member.find({
        membershipExpiryDate: { $lt: currentDateTime },
        membershipLevel: { $ne: "basic" },
      });

      console.log(expiredMembers);

      if (expiredMembers.length > 0) {
        console.log(`Found ${expiredMembers.length} expired memberships.`);
        for (const member of expiredMembers) {
          member.membershipLevel = "basic";
          member.paymentStatus = "failed";
          await member.save();
          console.log(`Downgraded ${member.email} to basic membership.`);
        }
      } else {
        console.log("No expired memberships found to downgrade.");
      }
    } catch (error) {
      console.error("Error in daily membership expiry cron job:", error);
    }
  });

  console.log("Membership expiry cron job scheduled at 00:00 every day");
};

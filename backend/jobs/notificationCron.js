const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const { sendNotificationEmail } = require("../services/emailService");

/* =========================================================
   Automated Notifications Cron Job
   Runs periodically to check for upcoming events
========================================================= */

const initCronJobs = () => {
  // Run once per day at 08:00 server-time. Sending hourly (the previous
  // schedule) would email each patient up to 24 times for a single
  // appointment because the lookup window is 0–24h.
  cron.schedule("0 8 * * *", async () => {
    console.log("⏰ Running Cron Job: Checking for upcoming appointments and active meds...");

    try {
      const now = new Date();
      // Confirmed appointments within the next 24h that haven't been reminded yet.
      const upcomingApts = await Appointment.find({
        status: "Confirmed",
        reminderSent: { $ne: true },
        date: {
          $gt: now,
          $lt: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      }).populate("patientId doctorId");

      for (let apt of upcomingApts) {
        if (!apt.patientId || !apt.patientId.email) continue;

        const html = `
          <div dir="rtl" style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>تذكير بموعد طبي 📅</h2>
            <p>أهلاً ${apt.patientId.fullName}،</p>
            <p>نذكرك بأن لديك موعد طبي غداً مع الدكتور/ة ${apt.doctorId?.fullName}.</p>
            <p>الوقت: <strong>${apt.time}</strong></p>
            <br>
            <p>مع تحيات نظام MedCore.</p>
          </div>
        `;

        try {
          await sendNotificationEmail(apt.patientId.email, "تذكير بموعد طبي يهمك", html);
          // Mark as reminded so we don't email the same patient again tomorrow.
          await Appointment.updateOne({ _id: apt._id }, { $set: { reminderSent: true } });
        } catch (mailErr) {
          console.error(`Cron Job: failed to send reminder for appointment ${apt._id}:`, mailErr);
        }
      }

      // We could also do medication reminders here if we added 'nextDoseTime' to prescriptions.

    } catch (err) {
      console.error("Cron Job Error:", err);
    }
  });

  console.log("✅ Smart Notifications Cron Job registered.");
};

module.exports = initCronJobs;

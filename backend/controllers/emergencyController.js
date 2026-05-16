const User = require("../models/User");
const { isValidObjectId } = require("../utils/safeObjectId");

/* =========================================================
   GET /api/emergency/:id — Public Emergency Access
   Returns ONLY life-critical data (paramedic-actionable):
   blood type, allergies, chronic diseases, emergency contact.

   NO authentication. To prevent the endpoint from becoming a
   medical-history harvesting tool against an enumerable nationalId
   space, we deliberately do NOT return diagnoses (medical records)
   or full prescription history here — those require an OTP session
   via /api/records/request-access. Diabetes/hypertension are
   already exposed via `chronicDiseases`, which is enough for
   first-response decisions without leaking visit notes.
========================================================= */

exports.getEmergencyData = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Support both ObjectId and nationalId lookups (paramedics see the
    // nationalId on a national health card, not the internal ObjectId).
    let patient;
    const projection = "fullName nationalId gender dateOfBirth bloodType allergies chronicDiseases emergencyContact";
    if (isValidObjectId(id)) {
      patient = await User.findOne({ _id: id, role: "patient" })
        .select(projection)
        .lean();
    } else {
      patient = await User.findOne({ nationalId: id, role: "patient" })
        .select(projection)
        .lean();
    }

    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "لم يتم العثور على المريض",
      });
    }

    let age = null;
    if (patient.dateOfBirth) {
      const diff = Date.now() - new Date(patient.dateOfBirth).getTime();
      age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
    }

    res.json({
      success: true,
      data: {
        fullName: patient.fullName,
        nationalId: patient.nationalId,
        gender: patient.gender === "male" ? "ذكر" : "أنثى",
        age,
        bloodType: patient.bloodType || "غير محدد",
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || [],
        emergencyContact: patient.emergencyContact || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

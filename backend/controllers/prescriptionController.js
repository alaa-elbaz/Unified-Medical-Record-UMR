const Prescription = require("../models/Prescription");
const { isValidObjectId } = require("../utils/safeObjectId");

/* =========================================================
   POST /api/prescriptions — Create prescription or self-report
========================================================= */

exports.createPrescription = async (req, res, next) => {
  try {
    const role = req.user.role;
    let { patientId, medication, dose, duration, isChronic } = req.body;

    if (role === "patient") {
      patientId = req.user.userId || req.user._id;
    } else {
      if (!isValidObjectId(patientId)) {
        return res.status(400).json({ success: false, message: "Invalid patientId" });
      }
    }

    let endDate = undefined;
    if (!isChronic && duration) {
      const match = duration.match(/(\d+)/);
      let days = match ? parseInt(match[1]) : 0;
      if (duration.includes('شهر') || duration.includes('شهور') || duration.includes('أشهر')) days = (days || 1) * 30;
      else if (duration.includes('اسبوع') || duration.includes('أسبوع') || duration.includes('أسابيع')) days = (days || 1) * 7;
      else if (duration.includes('يوم') || duration.includes('ايام') || duration.includes('أيام')) days = days || 1;
      
      if (days > 0) {
        endDate = new Date();
        endDate.setDate(endDate.getDate() + days);
      }
    }

    const isPharmacy = role === "pharmacy";

    const prescription = new Prescription({
      patientId,
      doctorId: role === "doctor" ? (req.user.userId || req.user._id) : undefined,
      medication,
      dose,
      duration,
      isChronic: !!isChronic,
      endDate,
      source: role === "patient" ? 'Patient' : 'Doctor',
      status: isPharmacy ? 'dispensed' : 'pending',
      dispensedBy: isPharmacy ? (req.user.orgId || req.user.userId) : undefined
    });

    await prescription.save();

    // Notify patient when pharmacy directly dispenses (Bug 1 fix)
    if (isPharmacy) {
      try {
        const Notification = require("../models/Notification");
        await Notification.create({
          userId: patientId,
          title: "تم صرف دوائك ✓",
          message: `تم صرف "${medication}" من الصيدلية. يمكنك استلامه الآن.`,
          type: "pharmacy",
        });
      } catch (notifErr) {
        console.warn("Failed to create manual dispense notification:", notifErr.message);
      }

      try {
        const User = require("../models/User");
        const patient = await User.findById(patientId).select("email fullName");
        if (patient?.email) {
          const emailService = require("../services/emailService");
          await emailService.sendNotificationEmail(
            patient.email,
            "تم صرف دوائك — MedCore",
            `<div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
              <h2>مرحباً ${patient.fullName || ""},</h2>
              <p>تم صرف الدواء التالي من الصيدلية بنجاح:</p>
              <div style="background: #dcfce7; padding: 14px 20px; border-radius: 10px; margin: 12px 0;">
                <h3 style="color: #166534; margin: 0;">✓ ${medication}</h3>
                <p style="color: #15803d; margin: 4px 0 0;">الجرعة: ${dose} — المدة: ${duration}</p>
              </div>
              <p>يمكنك استلام الدواء من الصيدلية الآن.</p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">— نظام MedCore للسجل الطبي الموحد</p>
            </div>`
          );
        }
      } catch (emailErr) {
        console.warn("Failed to send manual dispense email:", emailErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: role === "patient" ? "تم إضافة الدواء بنجاح" : "Prescription created successfully",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/prescriptions/bulk — Create bulk prescriptions
========================================================= */

exports.createBulkPrescriptions = async (req, res, next) => {
  try {
    const role = req.user.role;
    const { medications } = req.body;

    if (!Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({ success: false, message: "medications array required" });
    }

    const doctorId = role === "doctor" ? (req.user.userId || req.user._id) : undefined;

    // First pass: validate every entry up front so we don't end up with a
    // partially-saved batch.
    const docs = [];
    for (const med of medications) {
      const targetPatientId = med.patientId || req.body.patientId;
      if (!isValidObjectId(targetPatientId)) {
        return res.status(400).json({ success: false, message: "Invalid patientId in bulk request" });
      }

      let endDate = undefined;
      if (!med.isChronic && med.duration) {
        const match = med.duration.match(/(\d+)/);
        let days = match ? parseInt(match[1]) : 0;
        if (med.duration.includes('شهر') || med.duration.includes('شهور') || med.duration.includes('أشهر')) days = (days || 1) * 30;
        else if (med.duration.includes('اسبوع') || med.duration.includes('أسبوع') || med.duration.includes('أسابيع')) days = (days || 1) * 7;
        else if (med.duration.includes('يوم') || med.duration.includes('ايام') || med.duration.includes('أيام')) days = days || 1;

        if (days > 0) {
          endDate = new Date();
          endDate.setDate(endDate.getDate() + days);
        }
      }

      docs.push({
        patientId: targetPatientId,
        doctorId,
        medication: med.medication,
        dose: med.dose,
        duration: med.duration,
        isChronic: !!med.isChronic,
        endDate,
        source: role === "patient" ? 'Patient' : 'Doctor'
      });
    }

    // Single round-trip insert instead of N sequential `.save()`s.
    const createdPrescriptions = await Prescription.insertMany(docs, {
      ordered: true,
      runValidators: true,
    });

    res.status(201).json({
      success: true,
      message: `${createdPrescriptions.length} prescriptions created successfully`,
      data: createdPrescriptions,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions — Get all prescriptions (Doctor/Admin)
========================================================= */

exports.getAllPrescriptions = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.user.role === "doctor") {
      query.doctorId = req.user.userId;
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("patientId", "fullName nationalId")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: prescriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions/:patientId — Get prescriptions (paginated)
========================================================= */

exports.getPrescriptionsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patientId" });
    }

    const role = req.user.role;
    const requesterId = (req.user.userId || req.user._id || req.user.id || '').toString();
    const isAdmin = ['super_admin', 'sub_admin'].includes(role);
    const isSelf = role === 'patient' && requesterId === String(patientId);

    // Doctors must have a real treatment relationship with the patient — an
    // appointment record. Previously `requirePatientSelf` short-circuited
    // for any doctor, letting any doctor pull any patient's prescriptions
    // without OTP. Now we require either:
    //   - admin
    //   - the patient themselves
    //   - a doctor who has at least one appointment with the patient
    //   - the original prescribing doctor (covers cross-clinic refills)
    //   - hospital/lab staff with an appointment record for that patient
    //   - pharmacy: still allowed (their workflow needs to read prescriptions
    //     to dispense — backend dispense flow already audits)
    if (!isAdmin && !isSelf) {
      if (role === 'pharmacy') {
        // pharmacy is allowed (read-then-dispense workflow)
      } else if (role === 'doctor') {
        const Appointment = require('../models/Appointment');
        const hasAppt = await Appointment.exists({ patientId, doctorId: requesterId });
        const hasPrescribed = await Prescription.exists({ patientId, doctorId: requesterId });
        if (!hasAppt && !hasPrescribed) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: no treatment relationship with this patient",
          });
        }
      } else if (role === 'hospital' || role === 'lab') {
        const Appointment = require('../models/Appointment');
        const orgId = req.user.orgId || requesterId;
        const hasAppt = await Appointment.exists({ patientId, organizationId: orgId });
        if (!hasAppt) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: no treatment relationship with this patient",
          });
        }
      } else {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = { patientId };

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("doctorId", "fullName specialty")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: prescriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/prescriptions/:id/dispense — Dispense (Admin only)
========================================================= */

exports.dispensePrescription = async (req, res, next) => {
  try {
    const prescriptionId = req.params.id;

    if (!isValidObjectId(prescriptionId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid prescription ID" });
    }

    // Double-dispense guard: only dispense if status is still 'pending'
    const prescription = await Prescription.findOneAndUpdate(
      { _id: prescriptionId, status: "pending" },
      {
        status: "dispensed",
        dispensedBy: req.user.orgId || req.user.userId || req.user._id,
        dispensedAt: new Date(),
      },
      { new: true, runValidators: true }
    ).populate("patientId", "fullName email allergies");

    if (!prescription) {
      // Check if exists but already dispensed
      const exists = await Prescription.findById(prescriptionId);
      if (exists && exists.status === "dispensed") {
        return res
          .status(409)
          .json({ success: false, message: "تم صرف هذه الوصفة مسبقاً" });
      }
      return res
        .status(404)
        .json({ success: false, message: "الوصفة غير موجودة" });
    }

    // Send in-app notification to patient (Bug 2 fix)
    const Notification = require("../models/Notification");
    const patientUserId = prescription.patientId?._id || prescription.patientId;
    try {
      await Notification.create({
        userId: patientUserId,
        title: "تم صرف دوائك ✓",
        message: `تم صرف "${prescription.medication}" من الصيدلية. يمكنك استلامه الآن.`,
        type: "pharmacy",
      });
    } catch (notifErr) {
      console.warn("Failed to create dispense notification:", notifErr.message);
    }

    // Send email notification to patient
    const patientEmail = prescription.patientId?.email;
    if (patientEmail) {
      try {
        const emailService = require("../services/emailService");
        await emailService.sendNotificationEmail(
          patientEmail,
          "تم صرف دوائك — MedCore",
          `<div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
            <h2>مرحباً ${prescription.patientId.fullName || ""}،</h2>
            <p>تم صرف الدواء التالي من الصيدلية بنجاح:</p>
            <div style="background: #dcfce7; padding: 14px 20px; border-radius: 10px; margin: 12px 0;">
              <h3 style="color: #166534; margin: 0;">✓ ${prescription.medication}</h3>
              <p style="color: #15803d; margin: 4px 0 0;">الجرعة: ${prescription.dose} — المدة: ${prescription.duration}</p>
            </div>
            <p>يمكنك استلام الدواء من الصيدلية الآن.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 20px;">— نظام MedCore للسجل الطبي الموحد</p>
          </div>`
        );
      } catch (emailErr) {
        console.warn("Failed to send dispense email:", emailErr.message);
      }
    }

    res.json({
      success: true,
      message: "تم صرف الوصفة بنجاح",
      data: prescription,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/prescriptions/:id — Delete prescription
========================================================= */

exports.deletePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid prescription ID" });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    // Role checks
    const userId = (req.user.userId || req.user._id).toString();
    const isOwnerDoctor = prescription.doctorId && prescription.doctorId.toString() === userId && prescription.source === 'Doctor';
    const isSelfReport = prescription.patientId.toString() === userId && prescription.source === 'Patient';
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);

    if (!isOwnerDoctor && !isSelfReport && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this prescription" });
    }

    await Prescription.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Prescription deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/prescriptions/:id — Update prescription
========================================================= */

exports.updatePrescription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { medication, dose, duration, isChronic } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid prescription ID" });
    }

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ success: false, message: "Prescription not found" });
    }

    // Role checks
    const userId = (req.user.userId || req.user.orgId || req.user._id).toString();
    const isOwnerDoctor = prescription.doctorId && prescription.doctorId.toString() === userId && prescription.source === 'Doctor';
    const isSelfReport = prescription.patientId.toString() === userId && prescription.source === 'Patient';
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isPharmacy = req.user.role === 'pharmacy' && prescription.requestedPharmacy && prescription.requestedPharmacy.toString() === (req.user.orgId || '').toString();

    if (!isOwnerDoctor && !isSelfReport && !isAdmin && !isPharmacy) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this prescription" });
    }

    let changed = false;
    if (medication !== undefined) { prescription.medication = medication; changed = true; }
    if (dose !== undefined) { prescription.dose = dose; changed = true; }
    if (isChronic !== undefined) { prescription.isChronic = !!isChronic; changed = true; }
    
    if (duration !== undefined) {
      prescription.duration = duration;
      changed = true;
      if (!prescription.isChronic) {
        const match = duration.match(/(\d+)/);
        let days = match ? parseInt(match[1]) : 0;
        if (duration.includes('شهر') || duration.includes('شهور') || duration.includes('أشهر')) days = (days || 1) * 30;
        else if (duration.includes('اسبوع') || duration.includes('أسبوع') || duration.includes('أسابيع')) days = (days || 1) * 7;
        else if (duration.includes('يوم') || duration.includes('ايام') || duration.includes('أيام')) days = days || 1;
        
        if (days > 0) {
          const endDate = new Date(prescription.createdAt);
          endDate.setDate(endDate.getDate() + days);
          prescription.endDate = endDate;
        } else {
          prescription.endDate = undefined;
        }
      } else {
        prescription.endDate = undefined;
      }
    }

    if (prescription.isChronic && changed) {
       prescription.endDate = undefined;
    }

    await prescription.save();

    res.json({
      success: true,
      message: "تم تحديث الدواء بنجاح",
      data: prescription
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions/pharmacy/stats — Get pharmacy stats
========================================================= */

exports.getPharmacyStats = async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(403).json({ success: false, message: "Unauthorized: pharmacy orgId not found" });
    }

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    weekAgo.setHours(0, 0, 0, 0);

    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const dispensedFilter = { dispensedBy: orgId, status: "dispensed" };

    const [totalDispensed, todayDispensed, weeklyDispensed, monthlyDispensed, pendingRequests] = await Promise.all([
      Prescription.countDocuments(dispensedFilter),
      Prescription.countDocuments({ ...dispensedFilter, updatedAt: { $gte: today } }),
      Prescription.countDocuments({ ...dispensedFilter, updatedAt: { $gte: weekAgo } }),
      Prescription.countDocuments({ ...dispensedFilter, updatedAt: { $gte: monthAgo } }),
      Prescription.countDocuments({ requestedPharmacy: orgId, status: "pending" }),
    ]);

    res.json({
      success: true,
      data: {
        total: totalDispensed + pendingRequests,
        totalPrescriptions: totalDispensed + pendingRequests,
        pending: pendingRequests,
        pendingPrescriptions: pendingRequests,
        dispensed: totalDispensed,
        dispensedPrescriptions: totalDispensed,
        totalDispensed,
        todayDispensed,
        weeklyDispensed,
        monthlyDispensed,
      }
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions/pharmacy/history — Get pharmacy history
========================================================= */

exports.getPharmacyHistory = async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(403).json({ success: false, message: "Unauthorized: pharmacy orgId not found" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = { dispensedBy: orgId, status: "dispensed" };

    // Date range filter
    if (req.query.from || req.query.to) {
      query.updatedAt = {};
      if (req.query.from) {
        const fromDate = new Date(req.query.from);
        fromDate.setHours(0, 0, 0, 0);
        query.updatedAt.$gte = fromDate;
      }
      if (req.query.to) {
        const toDate = new Date(req.query.to);
        toDate.setHours(23, 59, 59, 999);
        query.updatedAt.$lte = toDate;
      }
    }

    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate("patientId", "fullName nationalId")
        .populate("doctorId", "fullName specialty")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Prescription.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: prescriptions,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions/pharmacies/active — Get active pharmacies
========================================================= */

exports.getActivePharmacies = async (req, res, next) => {
  try {
    const Organization = require('../models/Organization');
    const pharmacies = await Organization.find({ type: 'pharmacy', isApproved: true, status: { $ne: 'inactive' } })
      .select('_id name address phoneNumber city')
      .lean();
    res.json({ success: true, data: pharmacies });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/prescriptions/:id/request-pharmacy — Patient requests pharmacy
========================================================= */

exports.requestPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { pharmacyId } = req.body;

    if (!isValidObjectId(id) || !isValidObjectId(pharmacyId)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const prescription = await Prescription.findOneAndUpdate(
      { _id: id, patientId: req.user.userId || req.user._id, status: 'pending' },
      { requestedPharmacy: pharmacyId },
      { new: true }
    );

    if (!prescription) {
      return res.status(404).json({ success: false, message: "الروشتة غير موجودة أو تم صرفها مسبقاً" });
    }

    res.json({ success: true, message: "تم إرسال الطلب للصيدلية بنجاح", data: prescription });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/prescriptions/pharmacy/requests — Get incoming pharmacy requests
========================================================= */

exports.getPharmacyRequests = async (req, res, next) => {
  try {
    const orgId = req.user.orgId;
    if (!orgId) {
      return res.status(403).json({ success: false, message: "Unauthorized: pharmacy orgId not found" });
    }

    const requests = await Prescription.find({ requestedPharmacy: orgId, status: 'pending' })
      .populate('patientId', 'fullName nationalId phoneNumber allergies')
      .populate('doctorId', 'fullName specialty')
      .sort({ updatedAt: -1 })
      .lean();

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

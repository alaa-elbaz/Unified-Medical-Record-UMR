const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { isValidObjectId } = require("../utils/safeObjectId");
const jwt = require("jsonwebtoken");

/* =========================================================
   POST /api/patients — Create patient (Doctor/Admin)
========================================================= */

exports.createPatient = async (req, res, next) => {
  try {
    const { fullName, nationalId, phoneNumber, gender } = req.body;

    const existing = await User.findOne({ nationalId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "National ID already registered",
      });
    }

    const newPatient = new User({
      fullName,
      nationalId,
      phoneNumber,
      gender,
      email: `${nationalId}@umr-temp.com`,
      role: "patient",
      mothersName: "غير محدد",
      idDocumentPath: "pending",
    });

    await newPatient.save();

    res.status(201).json({
      success: true,
      message: "Patient created successfully",
      data: {
        _id: newPatient._id,
        fullName: newPatient.fullName,
        nationalId: newPatient.nationalId,
        phoneNumber: newPatient.phoneNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/patients — List patients (paginated, Doctor/Admin)
========================================================= */

exports.getPatients = async (req, res, next) => {
  try {
    const { search } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // Privileged admins can list everyone. Everyone else MUST send a search
    // query of >= 3 characters — otherwise this endpoint becomes a free
    // patient-database dump for any logged-in doctor / org / pharmacy.
    const isPrivileged = ['super_admin', 'sub_admin'].includes(req.user?.role);
    const query = { role: "patient" };

    if (search && search.trim().length >= 3) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { nationalId: { $regex: escapedSearch, $options: "i" } },
        { phoneNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    } else if (!isPrivileged) {
      return res.status(400).json({
        success: false,
        message: "يجب توفير كلمة بحث لا تقل عن 3 أحرف.",
        data: [],
        patients: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    // Hide sensitive identity fields from non-admin viewers.
    const projection = isPrivileged
      ? undefined
      : "fullName nationalId phoneNumber bloodType gender dateOfBirth";

    const [patients, total] = await Promise.all([
      User.find(query, projection).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: patients,
      patients, // backward compatibility
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/patients/my-patients — Doctor gets only their patients
========================================================= */

exports.getMyPatients = async (req, res, next) => {
  try {
    const { search } = req.query;
    const activeUserId = req.user._id || req.user.userId || req.user.id;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 100);
    const skip = (page - 1) * limit;

    // 1. Find appointments for this doctor/hospital
    const Appointment = require("../models/Appointment");
    const apptQuery = {};
    if (req.user.role === "doctor") {
      apptQuery.doctorId = activeUserId;
    } else if (["hospital", "lab"].includes(req.user.role)) {
      apptQuery.organizationId = activeUserId;
    }

    // 2. Get distinct patientIDs from these appointments
    const patientIds = await Appointment.distinct("patientId", apptQuery);

    if (patientIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        page,
        totalPages: 0,
      });
    }

    // 3. Find patients using those IDs
    const query = { _id: { $in: patientIds }, role: "patient" };

    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { fullName: { $regex: escapedSearch, $options: "i" } },
        { nationalId: { $regex: escapedSearch, $options: "i" } },
        { phoneNumber: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [patients, total] = await Promise.all([
      User.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: patients,
      patients, // backward compatibility
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/patients/:id — Get one patient
========================================================= */

exports.getPatientById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patient ID" });
    }

    const patient = await User.findById(id);

    if (!patient || patient.role !== "patient") {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    res.json({ success: true, data: patient });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/patients/:id — Update patient
========================================================= */

exports.updatePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patient ID" });
    }

    const allowedFields = [
      "fullName",
      "phoneNumber",
      "bloodType",
      "allergies",
      "chronicDiseases",
      "dateOfBirth",
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const patient = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    });

    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    res.json({
      success: true,
      message: "Patient updated successfully",
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/patients/:id — Delete patient (Admin only)
========================================================= */

exports.deletePatient = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patient ID" });
    }

    const patient = await User.findById(id);
    if (!patient) {
      return res
        .status(404)
        .json({ success: false, message: "Patient not found" });
    }

    // Cascade: previously the user document was deleted while medical
    // records, prescriptions, labs, radiology, appointments and OTP sessions
    // were left orphaned with broken `patientId` refs. Clean them up so
    // we don't accumulate dangling rows that break populates and aggregations.
    const MedicalRecord = require('../models/MedicalRecord');
    const Prescription = require('../models/Prescription');
    const LabResult = require('../models/LabResult');
    const Radiology = require('../models/Radiology');
    const Appointment = require('../models/Appointment');
    const Notification = require('../models/Notification');
    const OtpSession = require('../models/OtpSession');

    const cascade = await Promise.allSettled([
      MedicalRecord.deleteMany({ patientId: id }),
      Prescription.deleteMany({ patientId: id }),
      LabResult.deleteMany({ patientId: id }),
      Radiology.deleteMany({ patientId: id }),
      Appointment.deleteMany({ patientId: id }),
      Notification.deleteMany({ userId: id }),
      OtpSession.deleteMany({ patientId: id }),
    ]);

    // Log any partial failures so an admin can investigate without blocking
    // the user-delete itself.
    const failures = cascade.filter((r) => r.status === 'rejected');
    if (failures.length) {
      console.error(`[deletePatient] ${failures.length} cascade failures for ${id}`,
        failures.map((f) => f.reason?.message));
    }

    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Patient deleted successfully",
      cascadeFailures: failures.length,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/patients/:id/qr-token — Generate Short-lived QR token
========================================================= */

exports.generateQrToken = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }

    const patient = await User.findById(id);
    if (!patient || patient.role !== "patient") {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const isPrivilegedAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const callerId = (req.user.userId || req.user.orgId || req.user._id || req.user.id || '').toString();
    if (callerId !== req.params.id && !isPrivilegedAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Sign a short-lived token (15 minutes)
    const qrToken = jwt.sign(
      { patientId: patient._id, type: "qr_access" },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    // Track the action
    await ActivityLog.create({
      action: "qr_token_generated",
      userId: req.user.userId,
      targetType: 'user',
      targetId: req.params.id,
      details: "QR access token generated securely",
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: true,
      data: {
        qrToken,
        expiresIn: '15m'
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/patients/verify-qr — Verify Scanned QR Token
========================================================= */

exports.verifyQrToken = async (req, res, next) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ success: false, message: "Token is required" });
    }

    let patientId;
    let isFullAccess = false;

    // Only signed JWT tokens are accepted. Raw ObjectId tokens used to be a
    // backdoor that bypassed OTP entirely — removed.
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.type !== "qr_access") {
        return res.status(401).json({ success: false, message: "Invalid token type" });
      }
      patientId = decoded.patientId;
      isFullAccess = true;
    } catch (err) {
      return res.status(401).json({ success: false, message: "Expired or invalid QR token" });
    }

    try {
      const patient = await User.findById(patientId)
        .select("fullName nationalId bloodType gender phoneNumber dateOfBirth allergies chronicDiseases emergencyContact")
        .lean();
      if (!patient) {
        return res.status(404).json({ success: false, message: "Patient not found" });
      }

      // Fetch full medical history for secured QR access
      const MedicalRecord = require('../models/MedicalRecord');
      const Prescription = require('../models/Prescription');
      const LabResult = require('../models/LabResult');
      const Radiology = require('../models/Radiology');

      const [records, prescriptions, labs, radiology] = await Promise.all([
        MedicalRecord.find({ patientId }).sort("-visitDate").limit(20).lean(),
        Prescription.find({ patientId }).sort("-createdAt").limit(20).lean(),
        LabResult.find({ patientId }).sort("-createdAt").limit(20).lean(),
        Radiology.find({ patientId }).sort("-createdAt").limit(20).lean(),
      ]);

      res.json({
        success: true,
        data: {
          patient,
          isFullAccess,
          records,
          prescriptions,
          labs,
          radiology,
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: "Error fetching patient data" });
    }
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/patients/:id/pdf — Export Patient Record as PDF
========================================================= */

exports.exportPatientPDF = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid patient ID" });
    }

    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);
    const isDoctor = req.user.role === 'doctor';
    const callerId = (req.user.userId || req.user.orgId || req.user._id || req.user.id || '').toString();
    if (callerId !== id && !isAdmin && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const patient = await User.findById(id);
    if (!patient) return res.status(404).json({ success: false, message: "Patient not found" });

    // Fetch ALL related records
    const MedicalRecord = require('../models/MedicalRecord');
    const Prescription = require('../models/Prescription');
    const LabResult = require('../models/LabResult');
    const Radiology = require('../models/Radiology');
    
    const [records, prescriptions, labs, radiology] = await Promise.all([
      MedicalRecord.find({ patientId: id }).sort("-visitDate").limit(20).lean(),
      Prescription.find({ patientId: id }).sort("-createdAt").limit(20).lean(),
      LabResult.find({ patientId: id }).sort("-createdAt").limit(20).lean(),
      Radiology.find({ patientId: id }).sort("-createdAt").limit(20).lean(),
    ]);

    // Build plain text report (works perfectly with all characters)
    const divider = '='.repeat(60);
    const lines = [];

    lines.push(divider);
    lines.push('           MedCore - Unified Medical Record');
    lines.push('           Medical History Report');
    lines.push(divider);
    lines.push('');
    lines.push(`Full Name       : ${patient.fullName}`);
    lines.push(`National ID     : ${patient.nationalId || 'N/A'}`);
    lines.push(`Gender          : ${patient.gender === 'male' ? 'Male' : 'Female'}`);
    lines.push(`Blood Type      : ${patient.bloodType || 'Unknown'}`);
    lines.push(`Date of Birth   : ${patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString('en-GB') : 'N/A'}`);
    lines.push(`Phone           : ${patient.phoneNumber || 'N/A'}`);
    lines.push(`Chronic Diseases: ${patient.chronicDiseases?.length ? patient.chronicDiseases.join(', ') : 'None'}`);
    lines.push(`Allergies       : ${patient.allergies?.length ? patient.allergies.join(', ') : 'None'}`);
    
    if (patient.emergencyContact?.name) {
      lines.push('');
      lines.push('--- Emergency Contact ---');
      lines.push(`Name     : ${patient.emergencyContact.name}`);
      lines.push(`Phone    : ${patient.emergencyContact.phone || 'N/A'}`);
      lines.push(`Relation : ${patient.emergencyContact.relation || 'N/A'}`);
    }

    lines.push('');
    lines.push(divider);
    lines.push('  MEDICAL RECORDS / DIAGNOSES');
    lines.push(divider);
    if (records.length === 0) { lines.push('  No records found.'); }
    records.forEach((rec, i) => {
      lines.push(`  ${i + 1}. [${new Date(rec.visitDate || rec.createdAt).toLocaleDateString('en-GB')}] ${rec.diagnosis}`);
      if (rec.notes) lines.push(`     Notes: ${rec.notes}`);
      if (rec.requestedLabs?.length > 0) lines.push(`     Labs: ${rec.requestedLabs.join(', ')}`);
      if (rec.requestedRadiology?.length > 0) lines.push(`     Radiology: ${rec.requestedRadiology.join(', ')}`);
      lines.push(`     Source: ${rec.source || 'Doctor'}`);
    });

    lines.push('');
    lines.push(divider);
    lines.push('  PRESCRIPTIONS / MEDICATIONS');
    lines.push(divider);
    if (prescriptions.length === 0) { lines.push('  No prescriptions found.'); }
    prescriptions.forEach((rx, i) => {
      lines.push(`  ${i + 1}. [${new Date(rx.createdAt).toLocaleDateString('en-GB')}] ${rx.medication}`);
      lines.push(`     Dose: ${rx.dose} | Duration: ${rx.duration} | Source: ${rx.source || 'Doctor'}`);
    });

    lines.push('');
    lines.push(divider);
    lines.push('  LAB RESULTS');
    lines.push(divider);
    if (labs.length === 0) { lines.push('  No lab results found.'); }
    labs.forEach((lab, i) => {
      lines.push(`  ${i + 1}. [${new Date(lab.createdAt).toLocaleDateString('en-GB')}] ${lab.testName || 'Lab Test'}`);
      lines.push(`     Status: ${lab.status || 'completed'} | Source: ${lab.source || 'Lab'}`);
    });

    lines.push('');
    lines.push(divider);
    lines.push('  RADIOLOGY REPORTS');
    lines.push(divider);
    if (radiology.length === 0) { lines.push('  No radiology reports found.'); }
    radiology.forEach((rad, i) => {
      lines.push(`  ${i + 1}. [${new Date(rad.createdAt).toLocaleDateString('en-GB')}] ${rad.scanType || 'Radiology'}`);
      lines.push(`     Notes: ${rad.notes || 'N/A'} | Source: ${rad.source || 'Doctor'}`);
    });

    lines.push('');
    lines.push(divider);
    lines.push(`  Report generated: ${new Date().toLocaleString('en-GB')}`);
    lines.push(`  System: MedCore UMR v1.0`);
    lines.push(divider);

    // Stream a real PDF using pdfkit. The text content is already prepared
    // above; we just push each line into the document so the existing
    // rendering logic (sections / dividers) is preserved.
    const PDFDocument = require('pdfkit');
    const safeNationalId = String(patient.nationalId || id).replace(/[^A-Za-z0-9_-]/g, '');
    const filename = `medical_record_${safeNationalId}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ size: 'A4', margin: 36 });
    doc.on('error', (err) => next(err));
    doc.pipe(res);

    // Use the built-in Courier font so monospaced text aligns with the
    // ASCII dividers built earlier. (Arabic glyphs require a custom TTF —
    // out of scope; the report content here is already English.)
    doc.font('Courier').fontSize(10);
    for (const line of lines) {
      doc.text(line);
    }
    doc.end();

  } catch (error) {
    next(error);
  }
};

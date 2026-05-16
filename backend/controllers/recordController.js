const MedicalRecord = require("../models/MedicalRecord");
const OtpSession = require("../models/OtpSession");
const ActivityLog = require("../models/ActivityLog");
const { isValidObjectId } = require("../utils/safeObjectId");
const crypto = require("crypto");
const Notification = require("../models/Notification");
const emailService = require("../services/emailService");

/* =========================================================
   POST /api/records — Create medical record (Doctor only)
========================================================= */

exports.createRecord = async (req, res, next) => {
  try {
    const { patientId, diagnosis, notes, visitDate, requestedLabs, requestedRadiology } = req.body;

    if (!isValidObjectId(patientId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patientId" });
    }

    const record = new MedicalRecord({
      patientId,
      doctorId: req.user.userId || req.user._id,
      diagnosis,
      notes,
      visitDate,
      requestedLabs: Array.isArray(requestedLabs) ? requestedLabs : [],
      requestedRadiology: Array.isArray(requestedRadiology) ? requestedRadiology : [],
      source: 'Doctor'
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: "Medical record created successfully",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/records/:patientId — Get records (paginated)
========================================================= */

exports.getRecordsByPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    if (!isValidObjectId(patientId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid patientId" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = { patientId };

    const [records, total] = await Promise.all([
      MedicalRecord.find(query)
        .populate("doctorId", "fullName specialty")
        .sort({ visitDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MedicalRecord.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: records,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/records/request-access — Pillar 3: OTP Generation
   A doctor/provider requests access to a patient's medical history.
   Returns a sessionId; the actual data is only sent after OTP verification.
========================================================= */

exports.requestAccess = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    // JWT shape differs by login type:
    //   - individuals (doctor)        → { userId, role }
    //   - organizations (hosp/lab/ph) → { orgId,  role, loginType: 'organization' }
    // Falling back through the union gives us the right ID for either case.
    const requesterId = req.user.userId || req.user.orgId || req.user._id || req.user.id;
    const requesterRole = req.user.role;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized: missing requester id" });
    }

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }

    if (!['doctor', 'hospital', 'lab', 'pharmacy'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Generate a 6-digit OTP (10x larger keyspace than the previous 4-digit code).
    const code = crypto.randomInt(100000, 1000000).toString();

    // Remove any existing OTP session for this requester+patient pair
    await OtpSession.deleteMany({ patientId, requesterId });

    const session = await OtpSession.create({
      code,
      patientId,
      requesterId,
      requesterRole
    });

    // Look up the requester. Doctors live on User; orgs (hospital/lab/pharmacy)
    // live on Organization. Both are allowed to request OTPs.
    const User = require('../models/User');
    const Organization = require('../models/Organization');
    const patientObj = await User.findById(patientId).select('email fullName');

    let requesterName = '';
    let requesterLabel = 'الطبيب';
    if (requesterRole === 'doctor') {
      const doctorObj = await User.findById(requesterId).select('fullName');
      requesterName = doctorObj?.fullName || '';
      requesterLabel = 'الطبيب';
    } else {
      const orgObj = await Organization.findById(requesterId).select('name type');
      requesterName = orgObj?.name || '';
      requesterLabel = orgObj?.type === 'hospital' ? 'المستشفى'
                     : orgObj?.type === 'lab' ? 'المعمل'
                     : orgObj?.type === 'pharmacy' ? 'الصيدلية'
                     : 'الجهة الطبية';
    }

    // Create In-App Notification
    await Notification.create({
      userId: patientId,
      title: "طلب صلاحية وصول للسجل الطبي",
      message: `يطلب ${requesterLabel} ${requesterName} الوصول لسجلك الطبي. الرمز السري للموافقة هو: ${code}`,
      type: "otp"
    });

    // Email is FIRE-AND-FORGET. Awaiting it would block the response for up
    // to nodemailer's full TCP timeout (~2 minutes) on environments where
    // outbound SMTP is flaky — observed on Render free tier, where Gmail's
    // IPv6 returns ENETUNREACH and IPv4 hits Connection timeout. The OTP
    // session and in-app notification are already persisted, so we let the
    // doctor continue immediately and the email arrives whenever (or never).
    if (patientObj?.email) {
      emailService.sendNotificationEmail(
        patientObj.email,
        "رسالة هامة: كود الوصول للسجل الطبي - UMR",
        `<div style="font-family: Arial, sans-serif; direction: rtl; padding: 20px;">
          <h2>مرحباً ${patientObj.fullName}،</h2>
          <p>يطلب <strong>${requesterLabel} ${requesterName}</strong> الوصول إلى سجلك الطبي عبر منصة UMR.</p>
          <p>للموافقة على هذا الوصول السريع، يرجى تزويده بالرمز السري التالي المكون من 6 أرقام:</p>
          <h1 style="color: #4F46E5; background: #EEF2FF; padding: 10px 20px; border-radius: 8px; font-size: 32px; letter-spacing: 4px; display: inline-block;">${code}</h1>
          <p style="color: #d97706; margin-top: 15px;">⚠️ تحذير: لا تشارك هذا الرمز مع أي شخص آخر. الكود صالح لمدة 10 دقائق فقط.</p>
        </div>`
      ).catch((mailErr) => {
        console.error('[requestAccess] email delivery failed (non-fatal):', mailErr.message);
      });
    }

    const response = {
      success: true,
      message: "تم إنشاء رمز التحقق. سيصل للمريض عبر إشعار التطبيق (وعبر البريد الإلكتروني إذا كان مُهيأً).",
      sessionId: session._id,
    };
    // Only expose the OTP in development — guards against accidental leakage
    // in case NODE_ENV is misconfigured. Frontend reads `data.__dev_otp` via
    // `import.meta.env.DEV` so this never reaches a real production user.
    if (process.env.NODE_ENV !== 'production') {
      response.__dev_otp = code;
    }
    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/records/verify-otp — Pillar 3: Verify OTP & Return Records
   Patient shares the OTP code with the provider. On success,
   the full medical history is returned.
========================================================= */

exports.verifyOtpAndGetRecords = async (req, res, next) => {
  try {
    const { sessionId, code } = req.body;
    // Same fallback chain as requestAccess so org-issued JWTs work.
    const requesterId = req.user.userId || req.user.orgId || req.user._id || req.user.id;

    if (!requesterId) {
      return res.status(401).json({ success: false, message: "Unauthorized: missing requester id" });
    }
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({ success: false, message: "جلسة غير صالحة" });
    }

    const session = await OtpSession.findOne({ _id: sessionId, requesterId });

    if (!session) {
      return res.status(404).json({ success: false, message: "الجلسة منتهية أو غير موجودة. يرجى طلب كود جديد." });
    }

    // Brute-force lockout: 5 attempts max per session.
    const MAX_ATTEMPTS = 5;
    if (session.locked || session.attempts >= MAX_ATTEMPTS) {
      await OtpSession.deleteOne({ _id: sessionId });
      return res.status(429).json({
        success: false,
        message: "تم إلغاء الجلسة بسبب محاولات خاطئة كثيرة. يرجى طلب كود جديد.",
      });
    }

    // Normalize both sides: strip every non-digit so accidental whitespace,
    // hidden Arabic digits, RTL marks, or zero-width spaces don't cause
    // a false rejection. The user reported "wrong code" even with the
    // visually-correct value typed — most likely a paste artifact.
    const normalize = (v) => String(v ?? '').replace(/\D/g, '');
    const submittedCode = normalize(code);
    const expectedCode = normalize(session.code);

    if (expectedCode !== submittedCode) {
      session.attempts += 1;
      if (session.attempts >= MAX_ATTEMPTS) {
        session.locked = true;
        await session.save();
        return res.status(429).json({
          success: false,
          message: "تجاوزت الحد الأقصى للمحاولات. تم إلغاء الجلسة.",
        });
      }
      await session.save();
      return res.status(401).json({
        success: false,
        message: `رمز التحقق غير صحيح. المحاولات المتبقية: ${MAX_ATTEMPTS - session.attempts}`,
      });
    }

    const { patientId } = session;

    // Destroy session immediately after successful verification (one-time use)
    await OtpSession.deleteOne({ _id: sessionId });

    const User = require('../models/User');
    const Prescription = require('../models/Prescription');

    const [patientData, records, prescriptions] = await Promise.all([
      User.findById(patientId).select('fullName nationalId bloodType allergies chronicDiseases gender dateOfBirth phoneNumber'),
      MedicalRecord.find({ patientId })
        .populate("doctorId", "fullName specialty")
        .sort({ visitDate: -1 })
        .lean(),
      Prescription.find({ patientId })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    // ✅ Return same shape as emergency-access for consistent frontend handling
    res.json({
      success: true,
      message: "تم التحقق بنجاح. إليك السجلات الطبية.",
      data: {
        patient: patientData,
        records,
        prescriptions,
      },
      total: records.length
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/records/self-report — Pillar 4: Patient Self-Reporting
   Patients can upload their own historical documents/notes.
========================================================= */

exports.createPatientRecord = async (req, res, next) => {
  try {
    const patientId = req.user._id || req.user.userId;
    const { diagnosis, notes, visitDate } = req.body;

    if (!diagnosis) {
      return res.status(400).json({ success: false, message: "الوصف / التشخيص مطلوب" });
    }

    const record = new MedicalRecord({
      patientId,
      doctorId: patientId, // Self-report: patient is the author
      diagnosis,
      notes,
      visitDate: visitDate || new Date(),
      source: 'Patient',
      filePath: req.file?.path || null,
      aiProcessed: req.body.aiProcessed ? JSON.parse(req.body.aiProcessed) : null,
    });

    await record.save();

    res.status(201).json({
      success: true,
      message: "تم رفع سجلك الطبي الشخصي بنجاح",
      data: record,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/records/:id — Update record
========================================================= */

exports.updateRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagnosis, notes } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid record ID" });
    }

    const record = await MedicalRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Role checks
    const userId = req.user.userId || req.user._id;
    const isOwner = record.doctorId.toString() === userId.toString();
    const isSelfReport = record.patientId.toString() === userId.toString() && record.source === 'Patient';
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);

    if (!isOwner && !isSelfReport && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to update this record" });
    }

    if (diagnosis) record.diagnosis = diagnosis;
    if (notes !== undefined) record.notes = notes;

    await record.save();

    res.json({
      success: true,
      message: "Record updated successfully",
      data: record
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/records/:id — Delete record
========================================================= */

exports.deleteRecord = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid record ID" });
    }

    const record = await MedicalRecord.findById(id);
    if (!record) {
      return res.status(404).json({ success: false, message: "Record not found" });
    }

    // Role checks
    const userId = (req.user.userId || req.user._id).toString();
    const isOwnerDoctor = record.doctorId.toString() === userId && record.source === 'Doctor';
    const isSelfReport = record.patientId.toString() === userId && record.source === 'Patient';
    const isAdmin = ['super_admin', 'sub_admin'].includes(req.user.role);

    if (!isOwnerDoctor && !isSelfReport && !isAdmin) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this record" });
    }

    await MedicalRecord.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Record deleted successfully"
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/records/emergency-access/:patientId — Break-the-Glass
========================================================= */

exports.emergencyOverrideAccess = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { reason } = req.body;
    const doctorId = req.user.userId || req.user._id;

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "معرف المريض غير صحيح" });
    }

    // 1. Create robust audit log
    await ActivityLog.create({
      action: 'CRITICAL_EMERGENCY_OVERRIDE',
      userId: doctorId,
      targetType: 'patient',
      targetId: patientId,
      details: `Emergency Override: ${reason}`
    });

    // Auto-invalidate any active OTP session for this patient (the schema has
    // no `status` field — TTL drives expiry — so we just delete pending sessions).
    await OtpSession.deleteMany({ patientId });

    // 2. Fetch critical patient data
    const User = require('../models/User'); // Import inline to avoid circular dependency
    const patientData = await User.findById(patientId).select('fullName nationalId bloodType allergies chronicDiseases emergencyContact gender dateOfBirth');
    
    if (!patientData) {
      return res.status(404).json({ success: false, message: "مريض غير موجود" });
    }

    const [records, prescriptions] = await Promise.all([
      MedicalRecord.find({ patientId }).sort({ visitDate: -1 }).limit(50),
      require('../models/Prescription').find({ patientId }).sort({ createdAt: -1 }).limit(50)
    ]);

    // Format consistent with OTP payload structure for the frontend
    res.json({
      success: true,
      data: {
        patient: patientData,
        records,
        prescriptions,
      },
      message: "تم فتح سجل المريض كحالة طارئة وتسجيل الدخول الأمني"
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/records/doctor-patient/:patientId — Fast Access
   Allows a doctor to get all records THEY authored without OTP.
========================================================= */

exports.getRecordsByDoctorAndPatient = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const doctorId = req.user.userId || req.user._id;

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }

    const User = require('../models/User');
    const Prescription = require('../models/Prescription');

    const [patientData, records, prescriptions] = await Promise.all([
      User.findById(patientId).select('fullName nationalId bloodType allergies chronicDiseases gender dateOfBirth phoneNumber'),
      MedicalRecord.find({ patientId, doctorId, source: 'Doctor' })
        .populate("doctorId", "fullName specialty")
        .sort({ visitDate: -1 })
        .lean(),
      Prescription.find({ patientId, doctorId })
        .sort({ createdAt: -1 })
        .lean()
    ]);

    res.json({
      success: true,
      message: "تم استرجاع السجلات الخاصة بك.",
      data: {
        patient: patientData,
        records,
        prescriptions,
      },
      total: records.length
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/records/doctor/my-patients — Doctor Access
   List patients this doctor has created records for (recent first).
========================================================= */

exports.getMyPatientsForDoctor = async (req, res, next) => {
  try {
    const doctorId = req.user.userId || req.user._id;

    // Get unique patient IDs the doctor has seen (via records)
    const records = await MedicalRecord.find({ doctorId, source: 'Doctor' })
      .sort({ visitDate: -1 })
      .populate('patientId', 'fullName nationalId phoneNumber')
      .lean();

    // Deduplicate array of patient objects
    const patientsMap = new Map();
    records.forEach(r => {
      if (r.patientId && !patientsMap.has(r.patientId._id.toString())) {
        patientsMap.set(r.patientId._id.toString(), {
          ...r.patientId,
          lastVisit: r.visitDate,
          lastDiagnosis: r.diagnosis
        });
      }
    });

    const uniquePatients = Array.from(patientsMap.values());

    res.json({
      success: true,
      data: uniquePatients
    });
  } catch (error) {
    next(error);
  }
};

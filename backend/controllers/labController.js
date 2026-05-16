const LabResult = require("../models/LabResult");
const Appointment = require("../models/Appointment");
const { isValidObjectId } = require("../utils/safeObjectId");

/* =========================================================
   POST /api/labs — Create lab request (Doctor / Admin / Lab / Hospital) or Patient Upload
========================================================= */

exports.createLabResult = async (req, res, next) => {
  try {
    const role = req.user.role;
    let { patientId, testName, result, date, labName, labId, appointmentId } = req.body;

    // Validation & Routing based on role
    if (role === "patient") {
      patientId = req.user.userId || req.user._id || req.user.id;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: "يجب إرفاق ملف النتيجة (PDF أو صورة)" });
      }
    } else {
      if (!isValidObjectId(patientId)) {
        return res.status(400).json({ success: false, message: "معرف المريض غير صحيح" });
      }
    }

    const doc = new LabResult({
      patientId,
      testName,
      result,
      date,
      labName,
      labId: labId || undefined,
      appointmentId: appointmentId || undefined,
      labFile: req.files && req.files.length > 0 ? req.files[0].path : undefined,
      labFiles: req.files ? req.files.map(f => f.path) : [],
      filePath: req.files && req.files.length > 0 ? req.files[0].path : undefined,
      status: role === 'patient' ? 'completed' : 'pending_sample',
      source: role === 'patient' ? 'Patient' : 'Organization',
      uploadedBy: req.user.orgId || req.user.userId || req.user._id || req.user.id
    });

    // Referral binding for organizations
    if (role === 'doctor') {
      doc.referredBy   = req.user.userId || req.user._id || req.user.id;
      doc.referrerModel = 'User';
    } else if (role === 'hospital') {
      doc.referredBy   = req.user.orgId || req.user.userId || req.user._id || req.user.id;
      doc.referrerModel = 'Organization';
    } else if (role === 'lab') {
      doc.labId = req.user.orgId || req.user.userId || req.user._id || req.user.id;
    }

    await doc.save();

    // Auto-link appointment if provided. Use the canonical English enum value
    // (Appointment.status enum is `Pending|Confirmed|In-Progress|Completed|Cancelled|Follow-up`).
    if (appointmentId && isValidObjectId(appointmentId)) {
      await Appointment.findByIdAndUpdate(
        appointmentId,
        { status: "Confirmed" },
        { runValidators: true }
      );
    }

    res.status(201).json({ success: true, message: role === 'patient' ? "تم رفع النتيجة بنجاح" : "تم إنشاء طلب التحليل", data: doc });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/labs/:id/status — Update lab request status
   Accepts: status (pending_sample | pending_result | completed)
   Optional: labFile (Multer) when completing
========================================================= */

exports.updateLabStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, result } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
    }

    const allowed = ['pending_sample', 'pending_result', 'completed'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "حالة غير مسموح بها" });
    }

    const labReq = await LabResult.findById(id);
    if (!labReq) {
      return res.status(404).json({ success: false, message: "طلب التحليل غير موجود" });
    }

    // Permission: lab that owns it, or admin/doctor
    const role = req.user.role;
    const uid  = (req.user.orgId || req.user._id || req.user.userId || req.user.id).toString();
    const isOwnerLab  = labReq.labId?.toString()     === uid;
    const isReferrer  = labReq.referredBy?.toString() === uid;
    const isPrivileged = ['super_admin', 'sub_admin'].includes(role);

    if (!isOwnerLab && !isReferrer && !isPrivileged) {
      return res.status(403).json({ success: false, message: "غير مسموح لك بتعديل هذا الطلب" });
    }

    labReq.status = status;

    if (result) labReq.result = result;

    if (req.files && req.files.length > 0) {
      labReq.labFile  = req.files[0].path;  // Cloudinary URL (backward compat)
      labReq.filePath = req.files[0].path;  // backward compat
      labReq.labFiles = req.files.map(f => f.path);
    }

    // When completing, also close any linked appointment (canonical enum value).
    if (status === 'completed' && labReq.appointmentId) {
      await Appointment.findByIdAndUpdate(
        labReq.appointmentId,
        { status: "Completed" },
        { runValidators: true }
      );
    }

    await labReq.save();

    res.json({ success: true, message: "تم تحديث حالة التحليل", data: labReq });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/labs — List lab results (paginated, role-based)
========================================================= */

exports.getLabResults = async (req, res, next) => {
  try {
    const query = {};
    const role  = req.user?.role;
    const uid   = req.user?.orgId || req.user?.userId || req.user?._id || req.user?.id;

    if (role === "patient") {
      query.patientId = uid;
    } else if (role === "doctor") {
      if (req.query.patientId) {
        // IDOR fix: require a prior treatment relationship before letting
        // a doctor pull any patient's lab results by id. Without this check
        // any authenticated doctor could enumerate `?patientId=` and read
        // every patient's bloodwork. Mirrors prescriptionController.
        const [hasAppt, hasReferred] = await Promise.all([
          Appointment.exists({ patientId: req.query.patientId, doctorId: uid }),
          LabResult.exists({ patientId: req.query.patientId, referredBy: uid }),
        ]);
        if (!hasAppt && !hasReferred) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: no treatment relationship with this patient",
          });
        }
        query.patientId = req.query.patientId;
      } else {
        query.referredBy = uid;
      }
    } else if (role === "lab") {
      // BUG FIX: only fetch requests sent to THIS lab
      query.labId = uid;
    } else if (role === "hospital") {
      if (req.query.patientId) {
        // Same IDOR check for hospital orgs.
        const hasAppt = await Appointment.exists({
          patientId: req.query.patientId,
          organizationId: uid,
        });
        if (!hasAppt) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: no treatment relationship with this patient",
          });
        }
        query.patientId = req.query.patientId;
      } else {
        query.referredBy = uid;
      }
    } else if (!['admin', 'super_admin', 'sub_admin'].includes(role)) {
      return res.status(403).json({ success: false, message: "صلاحية غير كافية" });
    }

    // Optional status filter from query string
    if (req.query.status) {
      query.status = req.query.status;
    }

    const page  = Math.max(parseInt(req.query.page)  || 1,  1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip  = (page - 1) * limit;

    const [labs, total] = await Promise.all([
      LabResult.find(query)
        .populate("patientId",  "fullName nationalId phoneNumber")
        .populate("referredBy", "fullName name specialty")
        .populate("labId",      "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      LabResult.countDocuments(query),
    ]);

    res.json({ success: true, data: labs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/labs/:id
========================================================= */

exports.updateLabResult = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { testName, date } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
    }

    const lab = await LabResult.findById(id);
    if (!lab) {
      return res.status(404).json({ success: false, message: "طلب التحليل غير موجود" });
    }

    const role = req.user.role;
    const uid  = (req.user.orgId || req.user._id || req.user.userId || req.user.id).toString();

    // Patient can only edit their OWN self-uploaded results
    if (role === "patient") {
      if (lab.source !== "Patient" || lab.patientId?.toString() !== uid) {
        return res.status(403).json({ success: false, message: "يمكنك تعديل التحاليل المرفوعة ذاتياً فقط" });
      }
    } else if (role === "doctor" && lab.referredBy?.toString() !== uid) {
      return res.status(403).json({ success: false, message: "يمكنك تعديل طلباتك فقط" });
    } else if (role === "lab" && lab.labId?.toString() !== uid) {
      return res.status(403).json({ success: false, message: "يمكنك تعديل طلبات معملك فقط" });
    } else if (role === "hospital" && lab.referredBy?.toString() !== uid && lab.labId?.toString() !== uid) {
      return res.status(403).json({ success: false, message: "غير مسموح لك بتعديل هذا الطلب" });
    }

    lab.testName = testName || lab.testName;
    if (date) {
      lab.date = date;
    }
    
    if (req.files && req.files.length > 0) {
      lab.labFile = req.files[0].path;
      lab.filePath = req.files[0].path;
      lab.labFiles = req.files.map(f => f.path);
    }

    await lab.save();

    res.json({ success: true, message: "تم تحديث اسم التحليل بنجاح", data: lab });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/labs/:id
========================================================= */

exports.deleteLabResult = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
    }

    const lab = await LabResult.findById(id);
    if (!lab) {
      return res.status(404).json({ success: false, message: "طلب التحليل غير موجود" });
    }

    const role = req.user.role;
    const uid  = (req.user.orgId || req.user._id || req.user.userId || req.user.id).toString();

    // Patient can only delete their OWN self-uploaded results
    if (role === "patient") {
      if (lab.source !== "Patient" || lab.patientId?.toString() !== uid) {
        return res.status(403).json({ success: false, message: "يمكنك حذف التحاليل المرفوعة ذاتياً فقط" });
      }
    } else if (role === "doctor" && lab.referredBy?.toString() !== uid) {
      return res.status(403).json({ success: false, message: "يمكنك حذف طلباتك فقط" });
    }

    await LabResult.findByIdAndDelete(id);
    res.json({ success: true, message: "تم حذف التحليل بنجاح" });
  } catch (error) {
    next(error);
  }
};

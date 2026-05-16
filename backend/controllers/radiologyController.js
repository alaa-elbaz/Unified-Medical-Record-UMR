const Radiology = require("../models/Radiology");
const { isValidObjectId } = require("../utils/safeObjectId");

/* =========================================================
   POST /api/radiology — Create radiology result (Doctor/Admin) or Patient Upload
========================================================= */

exports.createRadiology = async (req, res, next) => {
  try {
    const role = req.user.role;
    let { patientId, scanType, report, date } = req.body;

    if (role === "patient") {
      patientId = req.user.userId || req.user._id;
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: "يجب إرفاق ملف الأشعة (PDF أو صورة)" });
      }
    } else {
      if (!isValidObjectId(patientId)) {
        return res.status(400).json({ success: false, message: "Valid patientId is required" });
      }
    }

    const radiology = new Radiology({
      patientId,
      doctorId: role !== 'patient' ? (req.user.userId || req.user._id) : undefined,
      scanType,
      report,
      date,
      imagePath: req.file ? req.file.path : null,
      source: role === 'patient' ? 'Patient' : 'Organization',
      uploadedBy: req.user.userId || req.user._id
    });

    await radiology.save();

    res.status(201).json({
      success: true,
      message: role === 'patient' ? "تم رفع التقرير بنجاح" : "Radiology result created successfully",
      data: radiology,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/radiology — List radiology results (paginated, role-based)
========================================================= */

exports.getRadiologyResults = async (req, res, next) => {
  try {
    const query = {};
    const userRole = req.user?.role;
    const requestedPatient = req.query.patientId;
    const uid = req.user?.userId || req.user?.orgId || req.user?._id || req.user?.id;

    if (userRole === "patient") {
      query.patientId = uid;
    } else if (userRole === "doctor") {
      if (requestedPatient) {
        // IDOR fix: doctor can only fetch radiology for patients they have
        // a treatment relationship with. Previously any doctor could read
        // any patient's scans by passing `?patientId=`.
        const Appointment = require("../models/Appointment");
        const [hasAppt, hasOrdered] = await Promise.all([
          Appointment.exists({ patientId: requestedPatient, doctorId: uid }),
          Radiology.exists({ patientId: requestedPatient, doctorId: uid }),
        ]);
        if (!hasAppt && !hasOrdered) {
          return res.status(403).json({
            success: false,
            message: "Forbidden: no treatment relationship with this patient",
          });
        }
        query.patientId = requestedPatient;
      } else {
        query.doctorId = uid;
      }
    } else if (userRole === "super_admin" || userRole === "sub_admin") {
      if (requestedPatient) {
        query.patientId = requestedPatient;
      }
    } else {
      return res
        .status(403)
        .json({ success: false, message: "Forbidden" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [results, total] = await Promise.all([
      Radiology.find(query)
        .populate("doctorId", "fullName specialty")
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Radiology.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: results,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/radiology/:id — Update radiology scan type
========================================================= */

exports.updateRadiology = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { scanType, date } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "معرف الطلب غير صحيح" });
    }

    const rad = await Radiology.findById(id);
    if (!rad) {
      return res.status(404).json({ success: false, message: "تقرير الأشعة غير موجود" });
    }

    const role = req.user.role;
    // Org JWTs (hospital/lab) carry orgId, not userId. Reading `.userId.toString()`
    // would TypeError out and 500 the request before this branch ever runs.
    const uid = (req.user.userId || req.user.orgId || req.user._id || req.user.id || '').toString();

    if (role === "patient") {
      if (rad.source !== "Patient" || rad.patientId?.toString() !== uid) {
        return res.status(403).json({ success: false, message: "يمكنك تعديل الأشعة المرفوعة ذاتياً فقط" });
      }
    } else if (role === "doctor" && rad.doctorId?.toString() !== uid) {
      return res.status(403).json({ success: false, message: "يمكنك تعديل طلباتك فقط" });
    }

    rad.scanType = scanType || rad.scanType;
    if (date) {
      rad.date = date;
    }

    if (req.file) {
      rad.imagePath = req.file.path;
    }

    await rad.save();

    res.json({ success: true, message: "تم تحديث اسم الأشعة بنجاح", data: rad });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/radiology/:id — Delete radiology (owner doctor / admin)
========================================================= */

exports.deleteRadiology = async (req, res, next) => {
  try {
    const radiologyId = req.params.id;

    if (!isValidObjectId(radiologyId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid radiology ID" });
    }

    const radiology = await Radiology.findById(radiologyId);

    if (!radiology) {
      return res
        .status(404)
        .json({ success: false, message: "تقرير الأشعة غير موجود" });
    }

    const role = req.user.role;
    // Org JWTs carry orgId, not userId — same fallback as updateRadiology.
    const uid = (req.user.userId || req.user.orgId || req.user._id || req.user.id || '').toString();

    // Patient can only delete their OWN self-uploaded results
    if (role === "patient") {
      if (radiology.source !== "Patient" || radiology.patientId?.toString() !== uid) {
        return res.status(403).json({
          success: false,
          message: "يمكنك حذف نتائج الأشعة المرفوعة ذاتياً فقط",
        });
      }
    } else if (
      role === "doctor" &&
      radiology.doctorId?.toString() !== uid
    ) {
      return res.status(403).json({
        success: false,
        message: "يمكنك حذف نتائج الأشعة الخاصة بك فقط",
      });
    }

    await Radiology.findByIdAndDelete(radiologyId);

    res.json({
      success: true,
      message: "تم حذف تقرير الأشعة بنجاح",
    });
  } catch (error) {
    next(error);
  }
};

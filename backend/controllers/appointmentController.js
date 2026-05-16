const Appointment = require("../models/Appointment");
const ActivityLog = require("../models/ActivityLog");
const LabResult = require("../models/LabResult");
const { isValidObjectId } = require("../utils/safeObjectId");

/* =========================================================
   GET /api/appointments — List appointments (paginated, role-based)
========================================================= */

exports.getAppointments = async (req, res, next) => {
  try {
    const query = {};
    const activeUserId = req.user.orgId || req.user._id || req.user.userId || req.user.id;

    if (req.user.role === "doctor") {
      query.doctorId = activeUserId;
    } else if (["hospital", "lab"].includes(req.user.role)) {
      query.organizationId = activeUserId;
    } else if (req.user.role === "patient") {
      query.patientId = activeUserId;
    }
    // Admin sees all

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const [appointments, total] = await Promise.all([
      Appointment.find(query)
        .populate("patientId", "fullName nationalId phoneNumber idDocumentPath bloodType allergies chronicDiseases")
        .populate({ path: 'doctorId', select: 'fullName specialty' })
        .populate({ path: 'organizationId', select: 'name' })
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Appointment.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: appointments,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/appointments — Patient books an appointment
========================================================= */

exports.createAppointment = async (req, res, next) => {
  try {
    const { doctorId, organizationId, specialty, date, time, appointmentType, reason, commonReason, notes } = req.body;

    // Validate IDs up-front so we return a clean 400 instead of letting
    // Mongoose throw a CastError that hits the global error handler.
    if (doctorId && !isValidObjectId(doctorId)) {
      return res.status(400).json({ success: false, message: "doctorId غير صالح" });
    }
    if (organizationId && !isValidObjectId(organizationId)) {
      return res.status(400).json({ success: false, message: "organizationId غير صالح" });
    }
    if (req.body.patientId && !isValidObjectId(req.body.patientId)) {
      return res.status(400).json({ success: false, message: "patientId غير صالح" });
    }

    // Validate the date — `new Date('not a date')` returns Invalid Date and
    // Mongoose accepts it then stores `null`. Reject it explicitly.
    const appointmentDate = new Date(date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ success: false, message: "تاريخ الموعد غير صالح" });
    }

    const isPrivileged = ["hospital", "lab", "super_admin", "sub_admin"].includes(req.user.role);
    // Privileged callers (orgs/admins) MUST pass a patientId in the body —
    // they have no `userId` of their own to fall back to. Without this guard
    // an org JWT with no patientId silently created appointments with
    // `patientId: undefined`, which then broke every downstream lookup.
    if (isPrivileged && !req.body.patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId مطلوب عند حجز موعد لمريض من حساب مؤسسة/مشرف",
      });
    }
    const finalPatientId = isPrivileged ? req.body.patientId : req.user.userId;

    const appointment = await Appointment.create({
      patientId: finalPatientId,
      doctorId: doctorId || null,
      organizationId: organizationId || null,
      specialty,
      date: appointmentDate,
      time,
      appointmentType,
      reason,
      commonReason,
      notes,
    });

    await ActivityLog.create({
      action: 'appointment_created',
      userId: req.user.userId,
      targetType: 'appointment',
      targetId: appointment._id,
      details: `Appointment requested with ${doctorId || organizationId}`,
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.status(201).json({
      success: true,
      message: "تم حجز الموعد بنجاح",
      data: appointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "هذا الموعد محجوز مسبقاً، يرجى اختيار وقت آخر." });
    }
    next(error);
  }
};

/* =========================================================
   PATCH /api/appointments/:id/status — Update appointment status
========================================================= */

exports.updateAppointmentStatus = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { status, doctorNotes } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: "الحالة مطلوبة" });
    }

    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, message: "معرف الموعد غير صحيح" });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "الموعد غير موجود" });
    }

    const allowedTransitions = {
      'Pending': ['Confirmed', 'Cancelled'],
      'Confirmed': ['In-Progress', 'Completed', 'Cancelled'],
      'In-Progress': ['Completed'],
      'Completed': ['Follow-up'],
      'Cancelled': [],
      'Follow-up': ['Completed', 'Cancelled']
    };

    if (!allowedTransitions[appointment.status].includes(status)) {
      return res.status(400).json({ success: false, message: `لا يمكن تغيير الحالة من ${appointment.status} إلى ${status}` });
    }

    const userId = (req.user.orgId || req.user._id || req.user.userId || req.user.id).toString();
    const role = req.user.role;

    if (role === 'doctor') {
      if (appointment.doctorId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    } else if (["hospital", "lab"].includes(role)) {
      if (appointment.organizationId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    } else if (role === 'patient') {
      if (appointment.patientId?.toString() !== userId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
      if (status !== 'Cancelled' || appointment.status !== 'Pending') {
        return res.status(403).json({ success: false, message: "لا تملك صلاحية لتغيير هذه الحالة" });
      }
    }

    if (doctorNotes !== undefined && role === 'doctor') {
      appointment.doctorNotes = doctorNotes;
    }

    if (["hospital", "lab"].includes(role)) {
      if (req.body.queueNumber !== undefined) {
        appointment.queueNumber = req.body.queueNumber;
      }
      if (req.body.hospitalMessage !== undefined) {
        appointment.hospitalMessage = req.body.hospitalMessage;
      }
    }

    appointment.status = status;
    await appointment.save();

    // =========================================================
    // Lab Automation Workflow
    // =========================================================
    if (role === 'lab') {
      if (status === 'Confirmed') {
        // Auto-create pending_sample Lab Request
        const existingLabReq = await LabResult.findOne({ appointmentId: appointment._id });
        if (!existingLabReq) {
          await LabResult.create({
            patientId: appointment.patientId,
            appointmentId: appointment._id,
            labId: appointment.organizationId,
            testName: appointment.appointmentType || 'تحليل معملي',
            status: 'pending_sample',
            source: 'Organization',
            uploadedBy: userId
          });
        }
      } else if (status === 'Completed') {
        // Auto-update linked Lab Request to pending_result
        await LabResult.findOneAndUpdate(
          { appointmentId: appointment._id },
          { status: 'pending_result' }
        );
      }
    }

    await ActivityLog.create({
      action: `appointment_${status.toLowerCase()}`,
      userId: req.user.userId,
      targetType: 'appointment',
      targetId: appointment._id,
      details: `Appointment status updated to ${status} for provider ${appointment.doctorId || appointment.organizationId}`,
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: true,
      message: "تم تحديث الحالة بنجاح",
      data: appointment,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/appointments/:id — Update appointment
========================================================= */

exports.updateAppointment = async (req, res, next) => {
  try {
    const appointmentId = req.params.id;
    const { date, time, appointmentType, reason, commonReason, notes } = req.body;

    if (!isValidObjectId(appointmentId)) {
      return res.status(400).json({ success: false, message: "معرف الموعد غير صحيح" });
    }

    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: "الموعد غير موجود" });
    }

    const role = req.user.role;
    const userId = (req.user.orgId || req.user._id || req.user.userId || req.user.id).toString();

    if (role === "patient" && appointment.patientId.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    } else if (["hospital", "lab"].includes(role) && appointment.organizationId?.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    if (role === "patient" && appointment.status !== 'Pending') {
      return res.status(400).json({ success: false, message: "لا يمكن تعديل الموعد إلا إذا كان قيد الانتظار" });
    }

    if (date) appointment.date = new Date(date);
    if (time) appointment.time = time;
    if (appointmentType) appointment.appointmentType = appointmentType;
    if (reason !== undefined) appointment.reason = reason;
    if (commonReason !== undefined) appointment.commonReason = commonReason;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    await ActivityLog.create({
      action: 'appointment_updated',
      userId: req.user.userId,
      targetType: 'appointment',
      targetId: appointment._id,
      details: 'Appointment details updated by patient',
      ipAddress: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: true,
      message: "تم تحديث طلب الحجز بنجاح",
      data: appointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "هذا الموعد محجوز مسبقاً، يرجى اختيار وقت آخر." });
    }
    next(error);
  }
};

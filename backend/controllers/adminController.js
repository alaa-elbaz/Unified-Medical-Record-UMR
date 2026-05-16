const User = require("../models/User");
const Organization = require("../models/Organization");
const ActivityLog = require("../models/ActivityLog");
const { isValidObjectId } = require("../utils/safeObjectId");
const { logActivity } = require("../utils/activityLogger");

/* =========================================================
   GET /api/admin/stats — إحصائيات المنصة الحقيقية
========================================================= */

exports.getStats = async (req, res, next) => {
  try {
    const Appointment = require("../models/Appointment");
    const Prescription = require("../models/Prescription");
    const LabResult = require("../models/LabResult");

    // Date helpers for time-based stats
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      activePatients,
      activeDoctors,
      activeHospitals,
      activeLabs,
      activePharmacies,
      pendingUsers,
      pendingOrganizations,
      totalOrganizations,
      appointmentsToday,
      appointmentsThisWeek,
      prescriptionsThisMonth,
      labsThisMonth,
      newUsersThisMonth,
    ] = await Promise.all([
      User.countDocuments({ role: { $nin: ["super_admin", "sub_admin"] } }),
      User.countDocuments({ role: "patient", status: "active" }),
      User.countDocuments({ role: "doctor", status: "active" }),
      Organization.countDocuments({ type: "hospital", status: "active" }),
      Organization.countDocuments({ type: "lab", status: "active" }),
      Organization.countDocuments({ type: "pharmacy", status: "active" }),
      User.countDocuments({ status: "pending" }),
      Organization.countDocuments({ status: "pending" }),
      Organization.countDocuments({}),
      Appointment.countDocuments({ date: { $gte: startOfToday } }).catch(() => 0),
      Appointment.countDocuments({ date: { $gte: startOfWeek } }).catch(() => 0),
      Prescription.countDocuments({ createdAt: { $gte: startOfMonth } }).catch(() => 0),
      LabResult.countDocuments({ createdAt: { $gte: startOfMonth } }).catch(() => 0),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }).catch(() => 0),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        activePatients,
        activeDoctors,
        activeHospitals,
        activeLabs,
        activePharmacies,
        pendingUsers,
        pendingOrganizations,
        totalOrganizations,
        appointmentsToday,
        appointmentsThisWeek,
        prescriptionsThisMonth,
        labsThisMonth,
        newUsersThisMonth,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/users — قائمة المستخدمين الحقيقيين (مع تصفح)
========================================================= */

exports.getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const roleFilter = req.query.role;
    const statusFilter = req.query.status;
    const search = (req.query.search || "").trim();

    const query = { role: { $nin: ["super_admin", "sub_admin"] } };
    if (roleFilter && ["patient", "doctor"].includes(roleFilter)) {
      query.role = roleFilter;
    }
    if (statusFilter && ["active", "pending", "rejected", "suspended"].includes(statusFilter)) {
      query.status = statusFilter;
    }
    if (search) {
      // Escape regex special chars to prevent ReDoS / injection
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      query.$or = [
        { fullName: rx },
        { email: rx },
        { nationalId: rx },
        { phoneNumber: rx },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/admin/users — إضافة مستخدم جديد (مع إيميل مؤقت)
========================================================= */

exports.createUser = async (req, res, next) => {
  try {
    const {
      fullName,
      nationalId,
      role,
      phoneNumber,
      gender,
      mothersName,
      syndicateNumber,
      specialty,
    } = req.body;

    // التحقق من الحقول الإلزامية
    if (!fullName || !nationalId || !role || !phoneNumber || !gender) {
      return res.status(400).json({
        success: false,
        message: "جميع الحقول الإلزامية مطلوبة (الاسم، الرقم القومي، الدور، الهاتف، النوع)",
      });
    }

    if (!["patient", "doctor"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "الدور يجب أن يكون مريض أو طبيب",
      });
    }

    // التحقق من عدم تكرار الرقم القومي
    const existingUser = await User.findOne({ nationalId });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "الرقم القومي مسجل بالفعل",
      });
    }

    // توليد إيميل مؤقت تلقائياً
    const generatedEmail = `${nationalId}@umr-temp.com`;

    // التحقق من عدم تكرار الإيميل المُولَّد
    const existingEmail = await User.findOne({ email: generatedEmail });
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        message: "هذا المستخدم مسجل بالفعل",
      });
    }

    const userData = {
      fullName,
      email: generatedEmail,
      nationalId,
      role,
      phoneNumber,
      gender,
      status: "active", // الأدمن يضيف مباشرة كحساب نشط
      isVerified: true,
      idDocumentPath: "pending", // لا يوجد مستند عند الإضافة بواسطة الأدمن
    };

    // حقول خاصة بالمريض
    if (role === "patient") {
      userData.mothersName = mothersName || "";
    }

    // حقول خاصة بالطبيب
    if (role === "doctor") {
      userData.syndicateNumber = syndicateNumber || "";
      userData.specialty = specialty || "";
      userData.syndicateIdPath = "pending";
    }

    const newUser = new User(userData);
    await newUser.save();

    // تسجيل النشاط
    await logActivity({
      action: "إضافة مستخدم جديد بواسطة الأدمن",
      userId: req.user.userId,
      targetType: "user",
      targetId: newUser._id,
      details: `تم إضافة ${roleLabels[role]}: ${fullName}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المستخدم بنجاح",
      data: {
        user: newUser,
        generatedEmail,
      },
    });
  } catch (error) {
    next(error);
  }
};

const roleLabels = { patient: "مريض", doctor: "طبيب", hospital: "مستشفى", lab: "مختبر", admin: "مدير" };

/* =========================================================
   GET /api/admin/doctors — List doctors (paginated, Admin only)
========================================================= */

exports.getDoctors = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const query = { role: "doctor" };

    const [doctors, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: doctors,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/verify-doctor/:id — Verify doctor (Admin only)
========================================================= */

exports.verifyDoctor = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid doctor ID" });
    }

    const doctor = await User.findById(id);

    if (!doctor || doctor.role !== "doctor") {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    doctor.isVerified = true;
    await doctor.save();

    res.json({
      success: true,
      message: "Doctor verified successfully",
      data: doctor,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/admin/user/:id — Delete user (Admin only)
========================================================= */

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // Prevent self-delete
    if (req.user && String(req.user.userId) === String(id)) {
      return res.status(403).json({
        success: false,
        message: "لا يمكنك حذف حسابك الخاص",
      });
    }

    // Prevent deleting other super_admins (only the user themselves can leave)
    const target = await User.findById(id).select("role");
    if (target && target.role === "super_admin") {
      return res.status(403).json({
        success: false,
        message: "لا يمكن حذف حساب مدير عام آخر",
      });
    }

    const user = await User.findByIdAndDelete(id);

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // تسجيل النشاط
    await logActivity({
      action: "حذف مستخدم",
      userId: req.user.userId,
      targetType: "user",
      targetId: id,
      details: `تم حذف المستخدم: ${user.fullName}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/users/pending — List pending users (Admin only)
========================================================= */

exports.getPendingUsers = async (req, res, next) => {
  try {
    const users = await User.find({ status: "pending", role: { $nin: ["super_admin", "sub_admin"] } }).sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/users/:id/status — Update user status (Admin only)
========================================================= */

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    if (!["active", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.status = status;
    await user.save();

    // تسجيل النشاط
    await logActivity({
      action: status === "active" ? "اعتماد حساب مستخدم" : "رفض حساب مستخدم",
      userId: req.user.userId,
      targetType: "user",
      targetId: user._id,
      details: `تم ${status === "active" ? "اعتماد" : "رفض"} حساب: ${user.fullName}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: `User status successfully updated to ${status}`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/organizations — قائمة المنظمات
========================================================= */

exports.getOrganizations = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    const typeFilter = req.query.type;
    const statusFilter = req.query.status;
    const search = (req.query.search || "").trim();

    const query = {};
    if (typeFilter && ["hospital", "lab", "pharmacy"].includes(typeFilter)) {
      query.type = typeFilter;
    }
    if (statusFilter && ["active", "pending", "rejected", "suspended"].includes(statusFilter)) {
      query.status = statusFilter;
    }
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      query.$or = [
        { name: rx },
        { email: rx },
        { healthRegNumber: rx },
        { phoneNumber: rx },
        { city: rx },
      ];
    }

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: organizations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/admin/organizations — إضافة منظمة جديدة
========================================================= */

exports.createOrganization = async (req, res, next) => {
  try {
    const {
      name,
      type,
      email,
      healthRegNumber,
      phoneNumber,
      address,
      city,
      bedCount,
      departmentCount,
      testTypes,
      description,
    } = req.body;

    // التحقق من الحقول الإلزامية
    if (!name || !type || !email || !healthRegNumber || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "جميع الحقول الإلزامية مطلوبة (الاسم، النوع، الإيميل، رقم تسجيل الصحة، الهاتف)",
      });
    }

    if (!["hospital", "lab"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "نوع المنظمة يجب أن يكون مستشفى أو مختبر",
      });
    }

    // التحقق من عدم التكرار
    const existingOrg = await Organization.findOne({
      $or: [{ email }, { healthRegNumber }],
    });

    if (existingOrg) {
      return res.status(409).json({
        success: false,
        message: "الإيميل أو رقم تسجيل الصحة مسجل بالفعل",
      });
    }

    const orgData = {
      name,
      type,
      email,
      healthRegNumber,
      phoneNumber,
      address: address || "",
      city: city || "",
      status: "active",
      description: description || "",
    };

    // حقول خاصة بالمستشفى
    if (type === "hospital") {
      orgData.bedCount = bedCount || 0;
      orgData.departmentCount = departmentCount || 0;
    }

    // حقول خاصة بالمعمل
    if (type === "lab") {
      orgData.testTypes = testTypes || [];
    }

    const newOrg = new Organization(orgData);
    await newOrg.save();

    // تسجيل النشاط
    await logActivity({
      action: "إضافة منظمة جديدة",
      userId: req.user.userId,
      targetType: "organization",
      targetId: newOrg._id,
      details: `تم إضافة ${type === "hospital" ? "مستشفى" : "مختبر"}: ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "تم إنشاء المنظمة بنجاح",
      data: newOrg,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/activity-log — سجل النشاط الحقيقي
========================================================= */

exports.getActivityLog = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 30, 1), 100);
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find({})
        .populate("userId", "fullName email role")
        .populate("organizationId", "name type")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ActivityLog.countDocuments({}),
    ]);

    res.json({
      success: true,
      data: logs,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/user/:id — عرض تفاصيل المستخدم
========================================================= */

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    const user = await User.findById(id).select("-__v");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/user/:id — تعديل بيانات المستخدم
========================================================= */

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid user ID" });
    }

    // Protect sensitive details like role or password from arbitrary injection
    const updates = { ...req.body };
    delete updates._id;

    // We shouldn't let them demote/promote freely using this to super_admin
    if (updates.role && ["super_admin", "sub_admin"].includes(updates.role)) {
      if (req.user.role !== "super_admin") {
         delete updates.role; // Sub admins cannot grant admin roles
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await logActivity({
      action: "تعديل بيانات مستخدم",
      userId: req.user.userId,
      targetType: "user",
      targetId: updatedUser._id,
      details: `تم تعديل بيانات: ${updatedUser.fullName}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedUser, message: "تم تعديل المستخدم بنجاح" });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/organization/:id — تفاصيل منظمة
========================================================= */

exports.getOrganizationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid org ID" });
    }

    const org = await Organization.findById(id).select("-__v");
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    res.json({ success: true, data: org });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/organization/:id — تعديل منظمة
========================================================= */

exports.updateOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid org ID" });
    }

    const updates = { ...req.body };
    delete updates._id;

    const updatedOrg = await Organization.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (!updatedOrg) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    await logActivity({
      action: "تعديل بيانات منظمة",
      userId: req.user.userId,
      targetType: "organization",
      targetId: updatedOrg._id,
      details: `تم تعديل منظمة: ${updatedOrg.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, data: updatedOrg, message: "تم تعديل المنظمة بنجاح" });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/organizations/:id/status — تعديل حالة المنظمة
========================================================= */

exports.updateOrganizationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid org ID" });
    }

    if (!["active", "inactive", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    org.status = status;
    await org.save();

    await logActivity({
      action: "تعديل حالة منظمة",
      userId: req.user.userId,
      targetType: "organization",
      targetId: org._id,
      details: `إلى ${status}: ${org.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `Organization status updated to ${status}`, data: org });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/admin/organization/:id — حذف المنظمة
========================================================= */

exports.deleteOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid org ID" });
    }

    const org = await Organization.findByIdAndDelete(id);
    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    await logActivity({
      action: "حذف منظمة",
      userId: req.user.userId,
      targetType: "organization",
      targetId: id,
      details: `تم حذف (${org.type}): ${org.name}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: "Organization deleted successfully" });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   DELETE /api/admin/activity-log — حذف سجلات النشاط
========================================================= */

exports.clearActivityLog = async (req, res, next) => {
  try {
    const { logIds } = req.body; // مصفوفة لتحديد الحذف، إذا كانت غير موجودة يتم حذف الكل

    let deletedCount = 0;
    if (logIds && Array.isArray(logIds) && logIds.length > 0) {
      const result = await ActivityLog.deleteMany({ _id: { $in: logIds } });
      deletedCount = result.deletedCount;
    } else {
      const result = await ActivityLog.deleteMany({});
      deletedCount = result.deletedCount;
    }

    await logActivity({
      action: "مسح سجل النشاط",
      userId: req.user.userId,
      targetType: "system",
      details: `تم مسح ${deletedCount} من السجلات`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: `تم مسح ${deletedCount} من سجلات النشاط بنجاح` });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/pending-organizations — قائمة المنظمات المعلقة
========================================================= */

exports.getPendingOrganizations = async (req, res, next) => {
  try {
    const orgs = await Organization.find({ isApproved: false }).sort({ createdAt: -1 });
    res.json({ success: true, count: orgs.length, data: orgs });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   PUT /api/admin/approve-organization/:id — الموافقة على منظمة
========================================================= */

exports.approveOrganization = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid organization ID" });
    }

    const org = await Organization.findById(id);

    if (!org) {
      return res.status(404).json({ success: false, message: "Organization not found" });
    }

    org.isApproved = true;
    org.status = "active";
    await org.save();

    // تسجيل النشاط
    await logActivity({
      action: "اعتماد منظمة جديدة",
      userId: req.user.userId,
      targetType: "organization",
      targetId: org._id,
      details: `تم اعتماد ${org.type === "hospital" ? "مستشفى" : "مختبر"}: ${org.name}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "تم اعتماد المنظمة بنجاح",
      data: org,
    });
  } catch (error) {
    next(error);
  }
};


/* =========================================================
   POST /api/admin/users/bulk-status — Bulk update users status
========================================================= */
exports.bulkUpdateUsersStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "معرفات المستخدمين مطلوبة" });
    }
    if (!["active", "pending", "rejected", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, message: "حالة غير صحيحة" });
    }
    const validIds = ids.filter((id) => isValidObjectId(id));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "لا توجد معرفات صحيحة" });
    }
    // Prevent suspending/rejecting other admins
    const result = await User.updateMany(
      { _id: { $in: validIds }, role: { $nin: ["super_admin", "sub_admin"] } },
      { $set: { status } }
    );
    await logActivity({
      action: "تحديث جماعي لحالة المستخدمين",
      userId: req.user.userId,
      targetType: "user",
      details: `تم تحديث ${result.modifiedCount} مستخدم إلى الحالة: ${status}`,
      ipAddress: req.ip,
    });
    res.json({
      success: true,
      message: `تم تحديث ${result.modifiedCount} مستخدم`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/admin/users/bulk-delete — Bulk delete users (super_admin only)
========================================================= */
exports.bulkDeleteUsers = async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "معرفات المستخدمين مطلوبة" });
    }
    const validIds = ids.filter((id) => isValidObjectId(id) && String(id) !== String(req.user.userId));
    if (validIds.length === 0) {
      return res.status(400).json({ success: false, message: "لا توجد معرفات صحيحة" });
    }
    // Prevent deleting other admins via bulk
    const result = await User.deleteMany({
      _id: { $in: validIds },
      role: { $nin: ["super_admin", "sub_admin"] },
    });
    await logActivity({
      action: "حذف جماعي للمستخدمين",
      userId: req.user.userId,
      targetType: "user",
      details: `تم حذف ${result.deletedCount} مستخدم`,
      ipAddress: req.ip,
    });
    res.json({
      success: true,
      message: `تم حذف ${result.deletedCount} مستخدم`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/admin/organizations/bulk-status
========================================================= */
exports.bulkUpdateOrganizationsStatus = async (req, res, next) => {
  try {
    const { ids, status } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: "معرفات المنظمات مطلوبة" });
    }
    if (!["active", "pending", "rejected", "suspended"].includes(status)) {
      return res.status(400).json({ success: false, message: "حالة غير صحيحة" });
    }
    const validIds = ids.filter((id) => isValidObjectId(id));
    const result = await Organization.updateMany(
      { _id: { $in: validIds } },
      { $set: { status } }
    );
    await logActivity({
      action: "تحديث جماعي لحالة المنظمات",
      userId: req.user.userId,
      targetType: "organization",
      details: `تم تحديث ${result.modifiedCount} منظمة إلى الحالة: ${status}`,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: `تم تحديث ${result.modifiedCount} منظمة`, modifiedCount: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   CSV Export Helpers
========================================================= */
function toCsvCell(value) {
  if (value === null || value === undefined) return "";
  // Escape embedded double-quotes per RFC 4180 (`"` -> `""`).
  const str = String(value).replace(/"/g, '""');
  if (/[",\n\r]/.test(str)) return `"${str}"`;
  return str;
}
function toCsv(headers, rows) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(row.map(toCsvCell).join(","));
  }
  // BOM so Excel opens UTF-8 Arabic correctly
  return "﻿" + lines.join("\r\n");
}

/* =========================================================
   GET /api/admin/export/users — CSV
========================================================= */
exports.exportUsersCsv = async (req, res, next) => {
  try {
    const roleFilter = req.query.role;
    const statusFilter = req.query.status;
    const query = { role: { $nin: ["super_admin", "sub_admin"] } };
    if (roleFilter && ["patient", "doctor"].includes(roleFilter)) query.role = roleFilter;
    if (statusFilter) query.status = statusFilter;

    const users = await User.find(query)
      .select("fullName email nationalId phoneNumber role status createdAt specialty syndicateNumber gender")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const headers = ["الاسم", "الإيميل", "الرقم القومي", "الهاتف", "الدور", "الحالة", "النوع", "التخصص", "تاريخ الانضمام"];
    const rows = users.map((u) => [
      u.fullName,
      u.email,
      u.nationalId,
      u.phoneNumber,
      u.role,
      u.status,
      u.gender || "",
      u.specialty || "",
      u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : "",
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/admin/export/organizations — CSV
========================================================= */
exports.exportOrganizationsCsv = async (req, res, next) => {
  try {
    const typeFilter = req.query.type;
    const statusFilter = req.query.status;
    const query = {};
    if (typeFilter && ["hospital", "lab", "pharmacy"].includes(typeFilter)) query.type = typeFilter;
    if (statusFilter) query.status = statusFilter;

    const orgs = await Organization.find(query)
      .select("name email type sectorType healthRegNumber phoneNumber city address bedCount status createdAt")
      .sort({ createdAt: -1 })
      .limit(10000)
      .lean();

    const headers = ["الاسم", "النوع", "القطاع", "رقم التسجيل", "الإيميل", "الهاتف", "المدينة", "العنوان", "الأسرّة", "الحالة", "تاريخ التسجيل"];
    const rows = orgs.map((o) => [
      o.name,
      o.type,
      o.sectorType || "",
      o.healthRegNumber,
      o.email,
      o.phoneNumber,
      o.city || "",
      o.address || "",
      o.bedCount ?? "",
      o.status,
      o.createdAt ? new Date(o.createdAt).toISOString().slice(0, 10) : "",
    ]);

    const csv = toCsv(headers, rows);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="organizations-${Date.now()}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};


/* =========================================================
   System Settings
========================================================= */
const SystemSettings = require("../models/SystemSettings");
const { invalidateSettingsCache } = require("../middleware/systemSettings");

exports.getSystemSettings = async (req, res, next) => {
  try {
    const settings = await SystemSettings.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    next(error);
  }
};

exports.updateSystemSettings = async (req, res, next) => {
  try {
    const allowed = [
      "registrationEnabled",
      "patientRegistrationEnabled",
      "doctorRegistrationEnabled",
      "organizationRegistrationEnabled",
      "maintenanceMode",
      "maintenanceMessage",
      "autoApprovePatients",
      "autoApproveDoctors",
      "autoApproveOrganizations",
      "announcement",
    ];
    const update = { updatedBy: req.user.userId };
    for (const k of allowed) {
      if (k in req.body) update[k] = req.body[k];
    }
    const settings = await SystemSettings.findOneAndUpdate(
      { key: "global" },
      { $set: update },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    // Without this, the public /settings endpoint keeps serving the
    // pre-update value (incl. maintenanceMode) for up to 60s, which
    // makes the maintenance screen linger for end users after an
    // admin toggles it off.
    invalidateSettingsCache();
    await logActivity({
      action: "تحديث إعدادات النظام",
      userId: req.user.userId,
      targetType: "system",
      details: `تم تحديث: ${Object.keys(update).filter(k => k !== "updatedBy").join(", ")}`,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: "تم حفظ الإعدادات", data: settings });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   Sub-Admin Management (super_admin only)
========================================================= */

exports.getSubAdmins = async (req, res, next) => {
  try {
    const admins = await User.find({ role: { $in: ["super_admin", "sub_admin"] } })
      .select("fullName email role status createdAt phoneNumber")
      .sort({ createdAt: -1 });
    res.json({ success: true, data: admins });
  } catch (error) {
    next(error);
  }
};

exports.createSubAdmin = async (req, res, next) => {
  try {
    const { fullName, email, nationalId, phoneNumber, gender } = req.body;
    if (!fullName || !email || !nationalId || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: "الاسم، الإيميل، الرقم القومي، والهاتف مطلوبة",
      });
    }
    if (await User.findOne({ $or: [{ email }, { nationalId }] })) {
      return res.status(409).json({ success: false, message: "الإيميل أو الرقم القومي مسجل بالفعل" });
    }
    const newAdmin = await User.create({
      fullName,
      email,
      nationalId,
      phoneNumber,
      gender: gender || "male",
      role: "sub_admin",
      status: "active",
      isVerified: true,
      idDocumentPath: "pending",
    });
    await logActivity({
      action: "إنشاء مدير مساعد",
      userId: req.user.userId,
      targetType: "user",
      targetId: newAdmin._id,
      details: `تم إنشاء مدير مساعد: ${fullName}`,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, message: "تم إنشاء المدير المساعد", data: newAdmin });
  } catch (error) {
    next(error);
  }
};

exports.removeSubAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "معرف غير صحيح" });
    }
    if (String(req.user.userId) === String(id)) {
      return res.status(403).json({ success: false, message: "لا يمكنك حذف حسابك الخاص" });
    }
    const admin = await User.findById(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: "المدير غير موجود" });
    }
    if (admin.role === "super_admin") {
      return res.status(403).json({ success: false, message: "لا يمكن حذف مدير عام" });
    }
    if (admin.role !== "sub_admin") {
      return res.status(400).json({ success: false, message: "هذا المستخدم ليس مديراً مساعداً" });
    }
    await admin.deleteOne();
    await logActivity({
      action: "حذف مدير مساعد",
      userId: req.user.userId,
      targetType: "user",
      details: `تم حذف: ${admin.fullName}`,
      ipAddress: req.ip,
    });
    res.json({ success: true, message: "تم حذف المدير المساعد" });
  } catch (error) {
    next(error);
  }
};

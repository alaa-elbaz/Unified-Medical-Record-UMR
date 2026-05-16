const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Organization = require("../models/Organization");
const { logActivity } = require("../utils/activityLogger");
const sanitize = require("mongo-sanitize");
const bcrypt = require("bcryptjs");
const { extractTextFromImage } = require("../services/ocrService");
const { evaluateIdentity } = require("../services/kycDecisionEngine");

/* =========================================================
   JWT helper
========================================================= */

function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "1d",
    issuer: "umr-api",
    audience: "umr-client",
  });
}

/* =========================================================
   POST /api/auth/register/patient
========================================================= */

exports.registerPatient = async (req, res, next) => {
  try {
    const { fullName, email, nationalId, phoneNumber, gender, mothersName, bloodType, chronicDiseases, allergies } = req.body;

    // 1. التحقق من وجود صورة الهوية
    if (!req.files || !req.files["idDocument"]) {
      return res.status(400).json({ success: false, message: "صورة بطاقة الرقم القومي مطلوبة لإتمام التسجيل." });
    }

    const uploadedImagePath = req.files["idDocument"][0].path;

    // 2. التحقق من أن الاسم بالعربية فقط
    const arabicNameRegex = /^[\u0600-\u06FF\s]+$/;
    if (!arabicNameRegex.test(String(fullName || '').trim())) {
      return res.status(400).json({ success: false, message: "يجب إدخال الاسم الرباعي باللغة العربية كما هو مدوَّن في بطاقة الرقم القومي." });
    }

    // 3. التحقق من عدم التكرار
    const existingUser = await User.findOne({ $or: [{ email }, { nationalId }] });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "البريد الإلكتروني أو الرقم القومي مسجَّل بالفعل." });
    }

    // 4. OCR — استخراج النص من الصورة بـ tesseract.js (بدون AI)
    let extractedText = '';
    let ocrFailed = false;
    try {
      extractedText = await extractTextFromImage(uploadedImagePath);
    } catch (ocrErr) {
      console.error('[Auth] خطأ OCR:', ocrErr.message);
      ocrFailed = true;
    }

    // 5. محرك قرار KYC (بدون AI — فقط string-similarity)
    const kycResult = evaluateIdentity(extractedText, fullName, nationalId, ocrFailed);
    console.log(`[Auth] KYC: ${kycResult.status} (${kycResult.score}/100)`);

    // 6. إذا رُفض → إعادة خطأ 400
    if (kycResult.status === 'rejected') {
      return res.status(400).json({
        success: false,
        message: kycResult.reason || 'بيانات غير متطابقة أو الصورة ليست بطاقة هوية',
        kycScore: kycResult.score,
      });
    }

    // 7. تعيين حالة الحساب
    const accountStatus = kycResult.status === 'approved' ? 'active' : 'pending';

    // 8. حفظ المستخدم
    const newUser = new User({
      fullName, email, role: "patient", status: accountStatus,
      nationalId, phoneNumber, gender, mothersName,
      bloodType: bloodType || 'unknown',
      chronicDiseases: chronicDiseases ? (Array.isArray(chronicDiseases) ? chronicDiseases : [chronicDiseases]) : [],
      allergies: allergies ? (Array.isArray(allergies) ? allergies : [allergies]) : [],
      idDocumentPath: uploadedImagePath,
      kycStatus: kycResult.status,
      kycScore: kycResult.score,
    });
    await newUser.save();

    // 9. تسجيل النشاط
    await logActivity({
      action: "تسجيل مريض جديد",
      userId: newUser._id,
      targetType: "user",
      targetId: newUser._id,
      details: `تسجيل حساب مريض: ${fullName} | KYC: ${kycResult.status} (${kycResult.score}/100)`,
      ipAddress: req.ip,
    });

    // 10. الرد
    const msg = kycResult.status === 'approved'
      ? 'تم التسجيل والتحقق من هويتك بنجاح! يمكنك تسجيل الدخول الآن.'
      : 'تم استلام طلب تسجيلك بنجاح. بياناتك قيد المراجعة وسيتم إعلامك خلال 24 ساعة.';

    return res.status(201).json({
      success: true,
      message: msg,
      kycStatus: kycResult.status,
      kycScore: kycResult.score,
    });

  } catch (error) {
    next(error);
  }
};


/* =========================================================
   POST /api/auth/register/doctor
========================================================= */

exports.registerDoctor = async (req, res, next) => {
  try {
    const { fullName, email, nationalId, phoneNumber, gender, syndicateNumber, specialty } = req.body;

    if (!req.files || !req.files["syndicateId"]) {
      return res.status(400).json({
        success: false,
        message: "Syndicate ID image is required",
      });
    }

    const existingUser = await User.findOne({
      $or: [{ email }, { nationalId }],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or National ID already registered",
      });
    }

    const newDoctor = new User({
      fullName,
      email,
      role: "doctor",
      status: "pending",
      nationalId,
      phoneNumber,
      gender,
      syndicateNumber,
      specialty: specialty || 'غير معروف',
      syndicateIdPath: req.files["syndicateId"][0].path,
    });

    await newDoctor.save();

    // تسجيل النشاط
    await logActivity({
      action: "تسجيل طبيب جديد",
      userId: newDoctor._id,
      targetType: "user",
      targetId: newDoctor._id,
      details: `تسجيل حساب طبيب: ${fullName}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "Doctor registered successfully",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/auth/login — يدعم تسجيل دخول الأفراد والمنظمات
========================================================= */

exports.login = async (req, res, next) => {
  try {
    const { email, nationalId, healthRegNumber, loginType } = req.body;

    // ===== تسجيل دخول المنظمات (مستشفى / مختبر) =====
    if (loginType === "organization") {
      if (!email || !healthRegNumber) {
        return res.status(400).json({
          success: false,
          message: "البريد الإلكتروني ورقم تسجيل الصحة مطلوبان",
        });
      }

      const org = await Organization.findOne({ email, healthRegNumber });

      if (!org) {
        return res.status(401).json({
          success: false,
          message: "بيانات الدخول غير صحيحة",
        });
      }

      if (!org.isApproved) {
        return res.status(403).json({
          success: false,
          message: "طلب تسجيل المنظمة قيد المراجعة. سيتم إعلامكم عند الاعتماد.",
        });
      }

      if (org.status === "inactive") {
        return res.status(403).json({
          success: false,
          message: "هذه المنظمة غير نشطة. تواصل مع الإدارة.",
        });
      }

      const token = signToken({
        orgId: org._id,
        role: org.type,
        loginType: "organization",
      });

      // تسجيل النشاط
      await logActivity({
        action: "تسجيل دخول منظمة",
        organizationId: org._id,
        targetType: "organization",
        targetId: org._id,
        details: `تسجيل دخول ${org.type === "hospital" ? "مستشفى" : org.type === "lab" ? "مختبر" : "صيدلية"}: ${org.name}`,
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: "Login successful",
        token,
        user: {
          id: org._id,
          fullName: org.name,
          email: org.email,
          role: org.type,
          loginType: "organization",
        },
      });
    }

    // ===== تسجيل دخول الأفراد (مريض / طبيب / أدمن) =====
    const user = await User.findOne({ email, nationalId });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or National ID",
      });
    }

    if (user.status === "pending") {
      if (user.isVerified === true) {
        user.status = "active";
        await user.save();
      } else {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval.",
        });
      }
    }

    if (user.status === "rejected") {
      return res.status(403).json({
        success: false,
        message: "Your account registration was rejected.",
      });
    }

    const token = signToken({ userId: user._id, role: user.role });

    // تسجيل النشاط
    await logActivity({
      action: "تسجيل دخول",
      userId: user._id,
      targetType: "user",
      targetId: user._id,
      details: `تسجيل دخول ${user.role}: ${user.fullName}`,
      ipAddress: req.ip,
    });

    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/auth/me
========================================================= */

exports.getMe = async (req, res, next) => {
  try {
    // التحقق من نوع تسجيل الدخول (منظمة أو فرد)
    if (req.user.loginType === "organization") {
      const org = await Organization.findById(req.user.orgId);
      if (!org) {
        return res.status(404).json({
          success: false,
          message: "Organization not found",
        });
      }
      return res.json({
        success: true,
        user: {
          id: org._id,
          fullName: org.name,
          email: org.email,
          role: org.type,
          loginType: "organization",
          phoneNumber: org.phoneNumber,
          healthRegNumber: org.healthRegNumber,
          address: org.address,
          city: org.city,
          workingDays: org.workingDays,
          workingHours: org.workingHours,
          slotDuration: org.slotDuration,
          managerName: org.managerName,
          emergencyPhone: org.emergencyPhone,
        },
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        nationalId: user.nationalId,
        bloodType: user.bloodType,
        dateOfBirth: user.dateOfBirth,
        chronicDiseases: user.chronicDiseases,
        allergies: user.allergies,
        emergencyContact: user.emergencyContact,
        idDocumentPath: user.idDocumentPath,
        syndicateIdPath: user.syndicateIdPath,
        mothersName: user.mothersName,
        syndicateNumber: user.syndicateNumber,
        specialty: user.specialty,
        workingDays: user.workingDays,
        workingHours: user.workingHours,
        slotDuration: user.slotDuration,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/auth/recover-email
========================================================= */

exports.recoverEmail = async (req, res, next) => {
  try {
    const { nationalId, securityAnswer, role } = req.body;

    // 1. Validation: Ensure all necessary fields are provided
    if (!nationalId || !securityAnswer || !role) {
      return res.status(400).json({
        success: false,
        message: "حقول مفقودة: الرقم القومي، الإجابة الأمنية، والدور مطلوبة",
      });
    }

    // 2. Query Safety: Ensure role is strictly 'patient' or 'doctor'
    if (role !== "patient" && role !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "دور غير صالح. يجب أن يكون 'patient' أو 'doctor'",
      });
    }

    // 3. Sanitization & Normalization
    // Prevent NoSQL injection
    const cleanNationalId = sanitize(String(nationalId).trim());
    const cleanSecurityAnswer = sanitize(String(securityAnswer).trim().toLowerCase());
    const cleanRole = sanitize(String(role).trim());

    // 4. Map the role to the correct security field
    const query = {
      nationalId: cleanNationalId,
      role: cleanRole,
    };

    if (cleanRole === "patient") {
      query.mothersName = cleanSecurityAnswer;
    } else if (cleanRole === "doctor") {
      query.syndicateNumber = cleanSecurityAnswer;
    }

    // 5. Query execution with .select() for safety
    const user = await User.findOne(query).select("email");

    // 6. Always return the same shape whether or not we found a user — this
    // avoids account / nationalId enumeration via the recover-email endpoint.
    // If a user is found we mask the email; if not we return a generic
    // "if a match exists, the email was sent / found" style message and
    // omit the masked email.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "إذا كانت البيانات مطابقة لحساب موجود فستجد البريد الإلكتروني المسجل.",
      });
    }

    const [username, domain] = user.email.split("@");
    const maskedUsername =
      username.length > 2
        ? `${username.slice(0, 2)}${"*".repeat(username.length - 2)}`
        : `${username[0]}*`;
    const maskedEmail = `${maskedUsername}@${domain}`;

    return res.status(200).json({
      success: true,
      message: "إذا كانت البيانات مطابقة لحساب موجود فستجد البريد الإلكتروني المسجل.",
      email: maskedEmail,
    });
  } catch (error) {
    // 9. Pass errors to the global error handler
    next(error);
  }
};

/* =========================================================
   PUT /api/auth/profile — تحديث الملف الشخصي (مع دعم تعديل الإيميل)
========================================================= */

exports.updateProfile = async (req, res, next) => {
  try {
    const role = req.user.role;

    // Organization-backed roles update Organization, not User.
    if (["hospital", "lab", "pharmacy"].includes(role)) {
      const orgId = req.user.orgId || req.user.id || req.user.userId;

      // Whitelist of fields an org admin may self-update.
      const ORG_ALLOWED = ['name', 'phoneNumber', 'address', 'city', 'description', 'managerName', 'emergencyPhone', 'workingDays', 'workingHours', 'slotDuration'];
      const updates = {};
      ORG_ALLOWED.forEach((f) => {
        if (req.body[f] !== undefined) updates[f] = req.body[f];
      });

      const updatedOrg = await Organization.findByIdAndUpdate(orgId, updates, {
        new: true,
        runValidators: true,
      }).select("-__v");

      if (!updatedOrg) {
        return res.status(404).json({ success: false, message: "المنظمة غير موجودة" });
      }

      return res.json({
        success: true,
        message: "تم تحديث الملف الشخصي بنجاح",
        data: updatedOrg,
      });
    }

    // User-backed roles (patient / doctor / admins). Whitelist per role.
    const userId = req.user.userId || req.user.id || req.user._id;
    const ALLOWED_FIELDS = {
      patient: ['fullName', 'email', 'phoneNumber', 'bloodType', 'dateOfBirth', 'allergies', 'chronicDiseases', 'emergencyContact', 'address', 'city'],
      doctor: ['fullName', 'email', 'phoneNumber', 'specialty', 'workingHours', 'workingDays', 'slotDuration'],
      super_admin: ['fullName', 'email', 'phoneNumber'],
      sub_admin: ['fullName', 'email', 'phoneNumber'],
    };

    const allowedFields = ALLOWED_FIELDS[role] || ['fullName', 'email', 'phoneNumber'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    // NOTE: `status` is intentionally NOT in any whitelist — it must never be
    // self-updatable (was a privilege-escalation hole previously).

    // Pre-check is a UX nicety — the unique index on `email` is the actual
    // race-safe enforcement. Two concurrent updates with the same new email
    // both pass this check, then one wins the update and the other gets a
    // duplicate-key (E11000) which we translate to a 409 below.
    if (updates.email) {
      const existingEmail = await User.findOne({ email: updates.email, _id: { $ne: userId } });
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          message: "هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر",
        });
      }
    }

    let user;
    try {
      user = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true });
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "هذا البريد الإلكتروني مسجل بالفعل لمستخدم آخر",
        });
      }
      throw err;
    }

    if (!user) {
      return res.status(404).json({ success: false, message: "المستخدم غير موجود" });
    }

    await logActivity({
      action: "تحديث الملف الشخصي",
      userId: user._id,
      targetType: "user",
      targetId: user._id,
      details: `تم تحديث الملف الشخصي لـ: ${user.fullName}`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: "تم تحديث الملف الشخصي بنجاح",
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        phoneNumber: user.phoneNumber,
        gender: user.gender,
        bloodType: user.bloodType,
        dateOfBirth: user.dateOfBirth,
        chronicDiseases: user.chronicDiseases,
        allergies: user.allergies,
        emergencyContact: user.emergencyContact,
      },
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/auth/register/hospital
========================================================= */

exports.registerHospital = async (req, res, next) => {
  try {
    const {
      name,
      sectorType,
      email,
      healthRegNumber,
      phoneNumber,
      address,
      city,
      bedCount,
      departmentCount,
      roomsCount,
      doctorsCount,
      description,
    } = req.body;

    // Check for existing organization
    const existing = await Organization.findOne({
      $or: [{ email }, { healthRegNumber }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "البريد الإلكتروني أو رقم تسجيل الصحة مسجل بالفعل",
      });
    }

    const hospital = new Organization({
      name,
      type: "hospital",
      sectorType, // 'Private' or 'Public'
      email,
      healthRegNumber,
      phoneNumber,
      address: address || "",
      city: city || "",
      bedCount: bedCount || 0,
      departmentCount: departmentCount || 0,
      roomsCount: roomsCount || 0,
      doctorsCount: doctorsCount || 0,
      description: description || "",
      status: "pending",
      isApproved: false,
    });

    await hospital.save();

    await logActivity({
      action: "تسجيل مستشفى جديد",
      organizationId: hospital._id,
      targetType: "organization",
      targetId: hospital._id,
      details: `طلب تسجيل مستشفى: ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال طلب تسجيل المستشفى بنجاح. سيتم مراجعته من قِبل الإدارة.",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/auth/register/lab
========================================================= */

exports.registerLab = async (req, res, next) => {
  try {
    const {
      name,
      sectorType,
      email,
      healthRegNumber,
      phoneNumber,
      address,
      city,
      doctorsCount,
      testTypes,
      description,
    } = req.body;

    // Check for existing organization
    const existing = await Organization.findOne({
      $or: [{ email }, { healthRegNumber }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "البريد الإلكتروني أو رقم تسجيل الصحة مسجل بالفعل",
      });
    }

    const lab = new Organization({
      name,
      type: "lab",
      sectorType,
      email,
      healthRegNumber,
      phoneNumber,
      address: address || "",
      city: city || "",
      doctorsCount: doctorsCount || 0,
      testTypes: testTypes || [],
      description: description || "",
      status: "pending",
      isApproved: false,
    });

    await lab.save();

    await logActivity({
      action: "تسجيل مختبر جديد",
      organizationId: lab._id,
      targetType: "organization",
      targetId: lab._id,
      details: `طلب تسجيل مختبر: ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال طلب تسجيل المختبر بنجاح. سيتم مراجعته من قِبل الإدارة.",
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/auth/register/pharmacy
========================================================= */

exports.registerPharmacy = async (req, res, next) => {
  try {
    const {
      name,
      sectorType,
      email,
      healthRegNumber,
      phoneNumber,
      address,
      city,
      description,
    } = req.body;

    // Check for existing organization
    const existing = await Organization.findOne({
      $or: [{ email }, { healthRegNumber }],
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "البريد الإلكتروني أو رقم تسجيل الصحة مسجل بالفعل",
      });
    }

    const pharmacy = new Organization({
      name,
      type: "pharmacy",
      sectorType,
      email,
      healthRegNumber,
      phoneNumber,
      address: address || "",
      city: city || "",
      description: description || "",
      status: "pending",
      isApproved: false,
    });

    await pharmacy.save();

    await logActivity({
      action: "تسجيل صيدلية جديدة",
      organizationId: pharmacy._id,
      targetType: "organization",
      targetId: pharmacy._id,
      details: `طلب تسجيل صيدلية: ${name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: "تم إرسال طلب تسجيل الصيدلية بنجاح. سيتم مراجعته من قِبل الإدارة.",
    });
  } catch (error) {
    next(error);
  }
};

// (Duplicate updateProfile removed — the version above handles all roles
// safely with role-scoped whitelists and prevents `status` self-modification.)
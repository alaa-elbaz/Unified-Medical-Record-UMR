const Organization = require("../models/Organization");
const Appointment = require("../models/Appointment");
const User = require("../models/User");

/* =========================================================
   GET /api/hospital/stats — Get Hospital Overview Stats
========================================================= */

exports.getHospitalStats = async (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.user.userId || req.user.id;

    // Check if hospital exists
    const hospital = await Organization.findById(orgId);
    if (!hospital) {
      return res.status(404).json({ success: false, message: "Hospital not found" });
    }

    // Get today's start and end
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const [appointmentsTotal, doctorsTotal, departmentsTotal] = await Promise.all([
      // Total appointments today
      Appointment.countDocuments({
        organizationId: orgId,
        date: { $gte: todayStart, $lte: todayEnd }
      }),
      // Total doctors
      User.countDocuments({
        role: "doctor",
        hospitalId: orgId
      }),
      // Total departments
      Department.countDocuments({ hospitalId: orgId })
    ]);

    // Bed Occupancy rate
    const bedOccupancyRate = hospital.bedCount > 0 
      ? Math.round(( (Math.floor(hospital.bedCount * 0.72)) / hospital.bedCount) * 100) 
      : 0; // Mock 72% occupancy for Phase 1 until actual inpatient models exist

    res.json({
      success: true,
      data: {
        totalAppointmentsToday: appointmentsTotal,
        totalDoctors: doctorsTotal,
        activeDepartments: departmentsTotal,
        bedOccupancyRate: bedOccupancyRate,
        totalBeds: hospital.bedCount || 0,
        occupiedBeds: hospital.bedCount > 0 ? Math.floor(hospital.bedCount * 0.72) : 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/hospital/departments — Add Department
========================================================= */
const Department = require("../models/Department");

exports.addDepartment = async (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.user.userId || req.user.id;
    const { name, description, bedCapacity } = req.body;

    if (!name) return res.status(400).json({ success: false, message: "اسم القسم مطلوب" });

    const existing = await Department.findOne({ name, hospitalId: orgId });
    if (existing) {
      return res.status(409).json({ success: false, message: "هذا القسم موجود بالفعل في المستشفى" });
    }

    const dept = new Department({
      name,
      description,
      bedCapacity: bedCapacity || 0,
      hospitalId: orgId
    });
    
    await dept.save();

    // Update hospital stats
    await Organization.findByIdAndUpdate(orgId, { $inc: { departmentCount: 1, bedCount: bedCapacity || 0 } });

    res.status(201).json({ success: true, message: "تم إضافة القسم بنجاح", data: dept });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/hospital/departments — List Departments
========================================================= */
exports.getDepartments = async (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.user.userId || req.user.id;
    const departments = await Department.find({ hospitalId: orgId });
    res.json({ success: true, data: departments });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   GET /api/hospital/doctors — List Doctors
========================================================= */
exports.getDoctors = async (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.user.userId || req.user.id;
    const doctors = await User.find({ role: "doctor", hospitalId: orgId }).select("-password");
    res.json({ success: true, data: doctors });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/hospital/doctors/add — Add Scoped Doctor
========================================================= */
exports.addScopedDoctor = async (req, res, next) => {
  try {
    const orgId = req.user.orgId || req.user.userId || req.user.id;
    const { fullName, phoneNumber, gender, specialty, department, syndicateNumber, nationalId } = req.body;

    if (!fullName || !phoneNumber || !specialty || !department || !syndicateNumber) {
      return res.status(400).json({ success: false, message: "يرجى تعبئة الحقول الإلزامية" });
    }

    const hospital = await Organization.findById(orgId);
    
    // Generate an internal email safely (handling Arabic names)
    let cleanHospitalName = hospital.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanHospitalName) cleanHospitalName = `hosp${hospital._id.toString().slice(-4)}`;
    
    // Attempt to parse English name if fullName has it, otherwise use random fallback
    let cleanDocName = fullName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!cleanDocName) cleanDocName = 'doc';
    
    const email = `dr.${cleanDocName}.${Date.now().toString().slice(-4)}@${cleanHospitalName}.umr.com`;
    
    // Wait, the User model removed password field as per new login requirements
    // So they login via OTP or another method (like nationalId/email).
    
    const existingDoctor = await User.findOne({ $or: [{ nationalId }, { syndicateNumber }] });
    if (existingDoctor) {
         return res.status(409).json({ success: false, message: "يوجد طبيب مسجل بهذا الرقم القومي أو رقم النقابة مسبقاً" });
    }

    const newDoctor = new User({
      fullName,
      email,
      role: "doctor",
      status: "pending", // Force them to update profile on first login
      nationalId: nationalId || 'N/A',
      phoneNumber,
      gender: gender || 'male',
      specialty,
      syndicateNumber,
      hospitalId: orgId,
      hospitalDepartment: department,
      syndicateIdPath: "scoped_account_no_image_required"
    });

    await newDoctor.save();

    await Organization.findByIdAndUpdate(orgId, { $inc: { doctorsCount: 1 } });

    res.status(201).json({ 
      success: true, 
      message: "تم إضافة الطبيب بنجاح", 
      data: {
        _id: newDoctor._id,
        fullName: newDoctor.fullName,
        email: newDoctor.email, // give them the autogenerated email to login
        department: newDoctor.hospitalDepartment
      } 
    });
  } catch (error) {
    next(error);
  }
};

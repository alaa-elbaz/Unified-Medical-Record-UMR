const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    // =====================================================
    // البيانات المشتركة
    // =====================================================

    fullName: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    // Password field removed as per the new login requirements

    // Only individual user roles live on User. Organization-backed actors
    // (hospital / lab / pharmacy) live on the Organization model and the
    // role at request-time comes from the JWT, not from this enum.
    role: {
        type: String,
        enum: ['patient', 'doctor', 'super_admin', 'sub_admin'],
        default: 'patient'
    },

    isVerified: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['pending', 'active', 'rejected'],
        default: 'pending' // جميع الحسابات المعلقة افتراضياً
    },

    // =====================================================
    // بيانات KYC — التحقق من الهوية الآلي
    // =====================================================

    kycStatus: {
        type: String,
        enum: ['not_submitted', 'approved', 'pending_review', 'rejected'],
        default: 'not_submitted'
    },

    kycScore: {
        type: Number,
        min: 0,
        max: 100,
        default: null
    },

    // =====================================================
    // البيانات الطبية الأساسية
    // =====================================================

    nationalId: {
        type: String,
        required: function () {
            // الأدمنز لا يحتاجون رقماً قومياً عند الإنشاء
            return this.role !== 'super_admin' && this.role !== 'sub_admin';
        },
        unique: true,
        sparse: true,
        trim: true
    },

    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        // Unique so two patients can't register with the same phone — was
        // previously non-unique which let duplicates accumulate. If existing
        // production data contains duplicates, the index build will fail
        // until they are reconciled.
        unique: true,
    },

    gender: {
        type: String,
        enum: ['male', 'female'],
        required: true
    },

    // =====================================================
    // بيانات المريض
    // =====================================================

    mothersName: {
        type: String,
        required: function () {
            return this.role === 'patient';
        },
        trim: true
    },

    idDocumentPath: {
        type: String,
        required: function () {
            return this.role === 'patient';
        }
    },

    dateOfBirth: {
        type: Date
    },

    bloodType: {
        type: String,
        // القيمة 'unknown' تعني غير معروف بدلاً من نص فارغ
        enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'],
        default: 'unknown'
    },

    allergies: [{
        type: String,
        trim: true
    }],

    chronicDiseases: [{
        type: String,
        trim: true
    }],

    emergencyContact: {
        name: { type: String, trim: true },
        phone: { type: String, trim: true },
        relation: { type: String, trim: true }
    },

    // =====================================================
    // بيانات الطبيب
    // =====================================================

    syndicateNumber: {
        type: String,
        required: function () {
            return this.role === 'doctor';
        },
        trim: true
    },

    specialty: {
        type: String,
        trim: true,
        default: 'غير معروف'
    },

    syndicateIdPath: {
        type: String,
        required: function () {
            return this.role === 'doctor';
        }
    },

    workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" }
    },

    workingDays: [{
        type: String,
        enum: ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        default: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']
    }],

    slotDuration: {
        type: Number,
        default: 10
    },
    
    // =====================================================
    // روابط المستشفى (للأطباء العاملين بالمستشفيات)
    // =====================================================
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },
    
    hospitalDepartment: {
        type: String,
        trim: true
    }

}, { timestamps: true });





// =====================================================
// تحسين الأداء عبر الفهارس
// =====================================================

userSchema.index({ role: 1 });


module.exports = mongoose.model('User', userSchema);
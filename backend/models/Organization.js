const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema({

    // =====================================================
    // البيانات الأساسية
    // =====================================================

    name: {
        type: String,
        required: true,
        trim: true
    },

    type: {
        type: String,
        enum: ['hospital', 'lab', 'pharmacy'],
        required: true
    },

    sectorType: {
        type: String,
        enum: ['Private', 'Public'],
        required: true
    },

    isApproved: {
        type: Boolean,
        default: false
    },

    doctorsCount: {
        type: Number,
        default: 0
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },

    healthRegNumber: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },

    phoneNumber: {
        type: String,
        required: true,
        trim: true,
        // Unique to prevent two organizations sharing the same contact number,
        // which would make support routing and verification ambiguous. Same
        // caveat as User.phoneNumber: clean up duplicates first.
        unique: true,
    },

    address: {
        type: String,
        trim: true
    },

    managerName: {
        type: String,
        trim: true
    },

    emergencyPhone: {
        type: String,
        trim: true
    },

    city: {
        type: String,
        trim: true
    },

    status: {
        type: String,
        enum: ['active', 'inactive', 'pending'],
        default: 'pending'
    },

    // =====================================================
    // بيانات خاصة بالمستشفى
    // =====================================================

    bedCount: {
        type: Number,
        default: 0
    },

    roomsCount: {
        type: Number,
        default: 0
    },

    departmentCount: {
        type: Number,
        default: 0
    },

    // =====================================================
    // بيانات خاصة بالمعمل
    // =====================================================

    testTypes: [{
        type: String,
        trim: true
    }],

    // =====================================================
    // معلومات تكميلية
    // =====================================================

    description: {
        type: String,
        trim: true
    },

    licenseExpiry: {
        type: Date
    },

    workingDays: [{
        type: String,
        trim: true
    }],

    workingHours: {
        start: { type: String, default: "09:00" },
        end: { type: String, default: "17:00" }
    },

    slotDuration: {
        type: Number,
        default: 10
    }

}, { timestamps: true });

// =====================================================
// الفهارس
// =====================================================

organizationSchema.index({ type: 1 });
organizationSchema.index({ status: 1 });

module.exports = mongoose.model('Organization', organizationSchema);

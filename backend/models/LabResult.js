const mongoose = require('mongoose');

const labResultSchema = new mongoose.Schema({

    // ===================== المريض =====================
    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    // ===================== جهة الإحالة =====================
    referredBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'referrerModel'
    },
    referrerModel: {
        type: String,
        enum: ['User', 'Organization']   // User = doctor, Organization = hospital/lab
    },

    // ===================== المعمل المنفذ =====================
    labId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
    },

    appointmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
    },

    // ===================== بيانات الفحص =====================
    testName: {
        type: String,
        required: true,
        trim: true
    },

    result: {
        type: String,
        trim: true     // optional until completed
    },

    date: {
        type: Date,
        default: Date.now
    },

    labName: {
        type: String,
        trim: true
    },

    // ===================== حالة الطلب =====================
    status: {
        type: String,
        enum: ['pending_sample', 'pending_result', 'completed'],
        default: 'pending_sample'
    },

    // ===================== ملف النتيجة (PDF) =====================
    labFile: {
        type: String     // Cloudinary URL or local path (backward compatibility)
    },

    labFiles: [{
        type: String     // Array of Cloudinary URLs or local paths for multiple files
    }],

    filePath: {
        type: String
    },

    // ===================== بيانات التحميل =====================
    source: {
        type: String,
        enum: ['Organization', 'Patient'],
        default: 'Organization'
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }

}, { timestamps: true });

labResultSchema.index({ patientId: 1, date: -1 });
labResultSchema.index({ labId: 1, status: 1 });
labResultSchema.index({ referredBy: 1, date: -1 });

module.exports = mongoose.model('LabResult', labResultSchema);

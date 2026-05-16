const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({

    action: {
        type: String,
        required: true,
        trim: true
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },

    targetType: {
        type: String,
        enum: ['user', 'organization', 'patient', 'prescription', 'lab_result', 'appointment', 'system'],
        default: 'system'
    },

    targetId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },

    details: {
        type: String,
        trim: true
    },

    ipAddress: {
        type: String,
        trim: true
    }

}, { timestamps: true });

// =====================================================
// الفهارس لتسريع الاستعلامات
// =====================================================

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1 });
activityLogSchema.index({ organizationId: 1 });
activityLogSchema.index({ targetType: 1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

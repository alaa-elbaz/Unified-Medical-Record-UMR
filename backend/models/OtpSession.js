const mongoose = require('mongoose');

/* =========================================================
   OtpSession — Temporary TTL-based token for medical record access
   Auto-expires after 5 minutes via MongoDB TTL index
========================================================= */

const otpSessionSchema = new mongoose.Schema({

    code: {
        type: String,
        required: true
    },

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    requesterId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },

    requesterRole: {
        type: String,
        enum: ['doctor', 'hospital', 'lab', 'pharmacy'],
        required: true
    },

    attempts: {
        type: Number,
        default: 0
    },

    locked: {
        type: Boolean,
        default: false
    },

    createdAt: {
        type: Date,
        default: Date.now,
        // TTL: 10 minutes — 5 minutes was too tight for the realistic flow
        // (doctor requests → patient opens app → reads code → tells doctor).
        expires: 600
    }

});

// Speeds up the common deleteMany at the start of every requestAccess call
// (clearing the previous outstanding session for this requester+patient pair)
// without depending on a collection scan as the table grows.
otpSessionSchema.index({ patientId: 1, requesterId: 1 });

module.exports = mongoose.model('OtpSession', otpSessionSchema);

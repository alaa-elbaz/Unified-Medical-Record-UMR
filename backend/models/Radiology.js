const mongoose = require('mongoose');

const radiologySchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    scanType: {
        type: String,
        required: true,
        trim: true
    },

    imagePath: {
        type: String
    },

    report: {
        type: String,
        trim: true
    },

    date: {
        type: Date,
        default: Date.now
    },

    source: {
        type: String,
        enum: ['Organization', 'Patient'],
        default: 'Organization'
    },

    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }

}, { timestamps: true });

radiologySchema.index({ patientId: 1, date: -1 });
radiologySchema.index({ doctorId: 1, date: -1 });

module.exports = mongoose.model('Radiology', radiologySchema);

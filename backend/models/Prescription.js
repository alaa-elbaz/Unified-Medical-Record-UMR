const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },

    medication: {
        type: String,
        required: true,
        trim: true
    },

    dose: {
        type: String,
        required: true,
        trim: true
    },

    duration: {
        type: String,
        required: true,
        trim: true
    },

    endDate: {
        type: Date
    },

    isChronic: {
        type: Boolean,
        default: false
    },

    status: {
        type: String,
        enum: ['pending', 'dispensed'],
        default: 'pending'
    },

    source: {
        type: String,
        enum: ['Doctor', 'Patient'],
        default: 'Doctor'
    },

    dispensedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    },

    dispensedAt: {
        type: Date
    },

    requestedPharmacy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization'
    }

}, { timestamps: true });

prescriptionSchema.index({ patientId: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);

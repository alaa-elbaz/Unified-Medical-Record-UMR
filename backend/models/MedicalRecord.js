const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    diagnosis: {
        type: String,
        required: true,
        trim: true
    },

    notes: {
        type: String,
        trim: true
    },

    visitDate: {
        type: Date,
        default: Date.now
    },

    source: {
        type: String,
        enum: ['Doctor', 'Patient'],
        default: 'Doctor'
    },

    filePath: {
        type: String,
        default: null
    },

    aiProcessed: {
        type: Object,
        default: null
    },

    requestedLabs: [{
        type: String,
        trim: true
    }],

    requestedRadiology: [{
        type: String,
        trim: true
    }]

}, { timestamps: true });

medicalRecordSchema.index({ patientId: 1, visitDate: -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);

const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    hospitalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    bedCapacity: {
        type: Number,
        default: 0
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, { timestamps: true });

// Ensure department names are unique per hospital
departmentSchema.index({ name: 1, hospitalId: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);

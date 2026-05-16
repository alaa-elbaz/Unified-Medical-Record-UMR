const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({

    patientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    organizationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Organization',
        default: null
    },

    specialty: {
        type: String,
        trim: true
    },

    date: {
        type: Date,
        required: true
    },

    time: {
        type: String,
        required: true,
        trim: true
    },

    appointmentType: {
        type: String,
        enum: ['New Check-up', 'Consultation', 'Follow-up'],
        required: true
    },



    // =====================================================
    // Hospital Workflow Additions
    // =====================================================
    queueNumber: {
        type: Number,
        default: null
    },

    hospitalMessage: {
        type: String,
        trim: true
    },

    reason: {
        type: String,
        maxlength: 100,
        trim: true
    },

    commonReason: {
        type: String,
        trim: true
    },

    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'In-Progress', 'Completed', 'Cancelled', 'Follow-up'],
        default: 'Pending'
    },

    notes: {
        type: String,
        trim: true
    },

    doctorNotes: {
        type: String,
        trim: true
    },

    // Set true after the daily reminder cron has emailed the patient. Prevents
    // duplicate reminders if the cron runs more than once before the appointment.
    reminderSent: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

appointmentSchema.index(
    { doctorId: 1, date: 1, time: 1 }, 
    { unique: true, partialFilterExpression: { doctorId: { $ne: null } } }
);

appointmentSchema.index(
    { organizationId: 1, date: 1, time: 1 },
    { unique: true, partialFilterExpression: { organizationId: { $ne: null } } }
);

// Prevent the same patient from booking two providers in the exact same slot
// (was a real foot-gun: a patient could double-book themselves with two
// doctors and miss one because the calendar only shows the first).
appointmentSchema.index(
    { patientId: 1, date: 1, time: 1 },
    { unique: true, partialFilterExpression: { patientId: { $ne: null }, status: { $ne: 'Cancelled' } } }
);

appointmentSchema.pre('validate', function(next) {
    if ((this.doctorId == null && this.organizationId == null) || (this.doctorId != null && this.organizationId != null)) {
      this.invalidate('target', 'A doctor OR an organization must be specified, but NOT BOTH and NOT NEITHER.');
    }
    next();
});

module.exports = mongoose.model('Appointment', appointmentSchema);

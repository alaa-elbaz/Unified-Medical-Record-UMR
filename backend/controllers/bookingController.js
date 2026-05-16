const User = require('../models/User');
const Organization = require('../models/Organization');
const Appointment = require('../models/Appointment');
const { isValidObjectId } = require('../utils/safeObjectId');

/* =========================================================
   GET /api/booking/providers — List active doctors and hospitals
   OPTIMIZED: Added Pagination, .lean(), and explicit .select()
========================================================= */
exports.getProviders = async (req, res, next) => {
    try {
        // GLOBAL OPTIMIZATION: Implement Pagination
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 50;
        const skip = (page - 1) * limit;

        // GLOBAL OPTIMIZATION: Always use .lean() for read-only GET queries
        // GLOBAL OPTIMIZATION: Always use .select() to exclude heavy fields
        const [doctors, orgs] = await Promise.all([
            User.find({ role: 'doctor', status: 'active' })
                .select('_id fullName specialty')
                .skip(skip)
                .limit(limit)
                .lean(),
                
            Organization.find({ type: { $in: ['hospital', 'lab'] }, status: 'active' })
                .select('_id name type')
                .skip(skip)
                .limit(limit)
                .lean()
        ]);

        const mappedDoctors = doctors.map(d => ({
            _id: d._id,
            fullName: d.fullName,
            specialty: d.specialty,
            providerType: 'doctor'
        }));

        const mappedOrgs = orgs.map(h => ({
            _id: h._id,
            fullName: h.name, // standardize name field for frontend search
            providerType: h.type // 'hospital' or 'lab'
        }));

        const providers = [...mappedDoctors, ...mappedOrgs].sort((a, b) => 
            a.fullName.localeCompare(b.fullName, 'ar')
        );

        res.json({
            success: true,
            data: providers,
            pagination: {
                page,
                limit,
                returnedCount: providers.length
            }
        });
    } catch (error) {
        next(error);
    }
};

/* =========================================================
   GET /api/booking/available-slots — Get available time slots
   OPTIMIZED: Added .lean() to select query & Dynamic Generation
========================================================= */
exports.getAvailableSlots = async (req, res, next) => {
    try {
        const { date, doctorId, hospitalId, labId, organizationId } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: 'Date is required' });
        }

        const targetId = doctorId || hospitalId || labId || organizationId;

        if (!targetId) {
            return res.status(400).json({ success: false, message: 'Provider ID is required' });
        }

        let provider;
        if (doctorId) {
            provider = await User.findById(doctorId).select('workingHours slotDuration').lean();
        } else {
            provider = await Organization.findById(targetId).select('workingHours slotDuration').lean();
        }

        if (!provider) {
             return res.status(404).json({ success: false, message: 'Provider not found' });
        }

        // Compare against the whole day instead of an exact instant. The
        // previous `date: new Date(date)` only matched appointments stored at
        // exactly midnight UTC, so any TZ skew between the client and the
        // server (or between two backend instances) caused slots to look
        // available even when they were already booked.
        const dayStart = new Date(date);
        if (isNaN(dayStart.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid date' });
        }
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const query = {
            date: { $gte: dayStart, $lt: dayEnd },
            status: { $ne: 'Cancelled' }
        };

        if (doctorId && isValidObjectId(doctorId)) {
            query.doctorId = doctorId;
        } else if (targetId && isValidObjectId(targetId)) {
            query.organizationId = targetId;
        } else {
            return res.status(400).json({ success: false, message: 'Invalid provider ID' });
        }

        // Fetch booked appointments on that day for the selected provider
        const bookedAppointments = await Appointment.find(query)
            .select('time')
            .lean();
            
        const bookedTimes = bookedAppointments.map(app => app.time);

        // Get working hours logic
        const start = provider.workingHours?.start || "09:00";
        const end = provider.workingHours?.end || "17:00";
        const duration = provider.slotDuration || 10;

        const [startH, startM] = start.split(':').map(Number);
        const [endH, endM] = end.split(':').map(Number);
        
        let currentMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        const allSlots = [];
        
        const formatTime = (totalMinutes) => {
             const h = Math.floor(totalMinutes / 60);
             const m = totalMinutes % 60;
             const modifier = h >= 12 ? 'PM' : 'AM';
             let displayHour = h > 12 ? h - 12 : h;
             if (displayHour === 0) displayHour = 12;
             const hh = displayHour.toString().padStart(2, '0');
             const mm = m.toString().padStart(2, '0');
             return `${hh}:${mm} ${modifier}`;
        };

        while (currentMinutes + duration <= endMinutes) {
             allSlots.push(formatTime(currentMinutes));
             currentMinutes += duration;
        }

        // Available slots are those not in bookedTimes
        const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        res.json({
            success: true,
            data: availableSlots
        });
    } catch (error) {
        next(error);
    }
};

/* =========================================================
   GET /api/booking/hospital/:id/departments-doctors
   Fetch all doctors for a hospital, grouped by department
========================================================= */
exports.getHospitalDepartmentsAndDoctors = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({ success: false, message: 'Invalid hospital ID' });
        }

        const doctors = await User.find({ 
            role: 'doctor', 
            status: 'active',
            hospitalId: id 
        }).select('_id fullName specialty hospitalDepartment').lean();

        // Group by department
        const grouped = {};
        
        doctors.forEach(doc => {
            const dept = doc.hospitalDepartment || 'عام';
            if (!grouped[dept]) {
                grouped[dept] = [];
            }
            grouped[dept].push({
                _id: doc._id,
                fullName: doc.fullName,
                specialty: doc.specialty
            });
        });

        // Convert to array format for easier frontend handling
        const departments = Object.keys(grouped).map(dept => ({
            name: dept,
            doctors: grouped[dept]
        }));

        res.json({
            success: true,
            data: departments
        });
    } catch (error) {
        next(error);
    }
};

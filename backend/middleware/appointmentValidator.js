const { body } = require('express-validator');

exports.validateCreateAppointment = [
  body('doctorId').optional({ checkFalsy: true }).isMongoId().withMessage('معرف الطبيب غير صالح'),
  body('organizationId').optional({ checkFalsy: true }).isMongoId().withMessage('معرف المستشفى/المعمل غير صالح'),
  body().custom((value, { req }) => {
    if (!req.body.doctorId && !req.body.organizationId) {
      throw new Error('يجب تحديد الطبيب أو المؤسسة');
    }
    if (req.body.doctorId && req.body.organizationId) {
      throw new Error('لا يمكن تحديد الطبيب والمؤسسة معاً');
    }
    return true;
  }),
  body('date')
    .notEmpty().withMessage('تاريخ الموعد مطلوب')
    .isISO8601().withMessage('تاريخ غير صالح')
    .custom((value) => {
      const appointmentDateStr = new Date(value).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];
      if (appointmentDateStr < todayStr) {
        throw new Error('لا يمكن حجز موعد في الماضي');
      }
      return true;
    }),
  body('time')
    .notEmpty().withMessage('الوقت مطلوب')
    .matches(/^(1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm])$/).withMessage('صيغة الوقت غير صالحة')
    .custom((value, { req }) => {
        if (!req.body.date) return true;
        
        const appointmentDateStr = new Date(req.body.date).toISOString().split('T')[0];
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (appointmentDateStr === todayStr) {
            // value is like "02:30 PM"
            // Let's create a comparative logic
            const match = value.match(/^(1[0-2]|0?[1-9]):([0-5][0-9]) ?([AaPp][Mm])$/);
            if (match) {
                let hours = parseInt(match[1]);
                const mins = parseInt(match[2]);
                const modifier = match[3].toUpperCase();
                
                if (hours === 12) {
                  hours = modifier === 'AM' ? 0 : 12;
                } else if (modifier === 'PM') {
                  hours += 12;
                }
                
                const now = new Date();
                const currentHours = now.getHours();
                const currentMins = now.getMinutes();

                if (hours < currentHours || (hours === currentHours && mins < currentMins)) {
                    throw new Error("لا يمكن حجز موعد في وقت سابق من اليوم");
                }
            }
        }
        return true;
    }),
  body('appointmentType')
    .notEmpty().withMessage('نوع الموعد مطلوب')
    .isIn(['New Check-up', 'Consultation', 'Follow-up']).withMessage('نوع موعد غير صحيح'),
  body('reason')
    .notEmpty().withMessage('سبب الزيارة مطلوب')
    .isLength({ max: 100 }).withMessage('سبب الزيارة يجب ألا يتجاوز 100 حرف')
];

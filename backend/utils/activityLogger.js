const ActivityLog = require('../models/ActivityLog');

/**
 * تسجيل نشاط في النظام
 * @param {Object} params
 * @param {string} params.action - وصف العملية (مثال: "تسجيل دخول")
 * @param {string} [params.userId] - معرف المستخدم
 * @param {string} [params.organizationId] - معرف المنظمة
 * @param {string} [params.targetType] - نوع الهدف
 * @param {string} [params.targetId] - معرف الهدف
 * @param {string} [params.details] - تفاصيل إضافية
 * @param {string} [params.ipAddress] - عنوان IP
 */
async function logActivity({ action, userId, organizationId, targetType, targetId, details, ipAddress }) {
    try {
        await ActivityLog.create({
            action,
            userId: userId || null,
            organizationId: organizationId || null,
            targetType: targetType || 'system',
            targetId: targetId || null,
            details: details || '',
            ipAddress: ipAddress || ''
        });
    } catch (error) {
        // لا نريد أن يتسبب خطأ في تسجيل النشاط في إيقاف العملية الأصلية
        console.error('Failed to log activity:', error.message);
    }
}

module.exports = { logActivity };

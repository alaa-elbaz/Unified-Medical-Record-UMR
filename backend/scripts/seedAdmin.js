require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/* =========================================================
   سكريبت إنشاء حساب الأدمن الأول
   الاستخدام: node scripts/seedAdmin.js
   يجب وجود ملف .env يحتوي على MONGO_URI قبل التشغيل
========================================================= */

const User = require('../models/User');

/* =========================================================
   بيانات حساب الأدمن - غيّرها قبل التشغيل
========================================================= */
const ADMIN_DATA = {
    fullName: 'مدير النظام',
    email: 'admin@umr.com',
    password: 'Admin@123456',
    nationalId: '00000000000000',
    phoneNumber: '01000000000',
    gender: 'male',
    role: 'admin',
    isVerified: true
};

async function seedAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ اتصال بقاعدة البيانات ناجح');

        /* التحقق من عدم وجود أدمن مسبقاً */
        const existing = await User.findOne({ email: ADMIN_DATA.email });
        if (existing) {
            console.log('⚠️  حساب الأدمن موجود مسبقاً بهذا الإيميل:', ADMIN_DATA.email);
            process.exit(0);
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(ADMIN_DATA.password, salt);

        const admin = new User({
            ...ADMIN_DATA,
            password: hashedPassword
        });

        await admin.save();
        console.log('✅ تم إنشاء حساب الأدمن بنجاح');
        console.log('   الإيميل:', ADMIN_DATA.email);
        console.log('   كلمة المرور:', ADMIN_DATA.password);
        console.log('   ⚠️  قم بتغيير كلمة المرور فور تسجيل الدخول!');

    } catch (error) {
        console.error('❌ خطأ:', error.message);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

seedAdmin();

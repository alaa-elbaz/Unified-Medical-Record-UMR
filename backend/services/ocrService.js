/**
 * ================================================
 * ocrService.js — خدمة استخراج النص من الصور
 * ================================================
 * يستخدم tesseract.js لإجراء OCR على صور بطاقات
 * الهوية المصرية (عربي + إنجليزي).
 *
 * يدعم:
 *  - روابط Cloudinary (يتم تحميل الصورة مؤقتاً ثم حذفها)
 *  - ملفات محلية على السيرفر
 *
 * لا يستخدم أي AI خارجي.
 */

const Tesseract = require('tesseract.js');
const axios     = require('axios');
const fs        = require('fs');
const path      = require('path');
const crypto    = require('crypto');

// ── مجلد مؤقت لتحميل الصور من Cloudinary ──────────────────────────────
const TEMP_DIR = path.join(__dirname, '..', 'uploads', '_ocr_temp');

// إنشاء المجلد المؤقت إن لم يكن موجوداً
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

/**
 * downloadToTemp
 * ──────────────
 * يحمّل صورة من URL (Cloudinary أو غيره) ويحفظها مؤقتاً على الديسك.
 *
 * @param   {string} imageUrl
 * @returns {Promise<string>} المسار المحلي المؤقت
 */
async function downloadToTemp(imageUrl) {
  const response = await axios.get(imageUrl, {
    responseType: 'arraybuffer',
    timeout: 20000,
    headers: { 'User-Agent': 'UMR-KYC/1.0' },
  });

  // نحدد الامتداد من content-type
  const contentType = response.headers['content-type'] || 'image/jpeg';
  const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
  const ext = extMap[contentType.split(';')[0].trim()] || '.jpg';

  // اسم فريد لتجنب التعارضات
  const tempName = `ocr_${crypto.randomBytes(8).toString('hex')}${ext}`;
  const tempPath = path.join(TEMP_DIR, tempName);

  fs.writeFileSync(tempPath, Buffer.from(response.data));
  console.log(`[OCR Service] ✅ تم تحميل الصورة مؤقتاً: ${tempName}`);

  return tempPath;
}

/**
 * cleanupTemp
 * ───────────
 * يحذف الملف المؤقت بعد انتهاء الـ OCR.
 */
function cleanupTemp(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[OCR Service] 🗑️ تم حذف الملف المؤقت');
    }
  } catch (_) {
    // تجاهل أخطاء الحذف — ليست حرجة
  }
}

/**
 * extractTextFromImage — الدالة الرئيسية
 * ────────────────────────────────────────
 * تستخرج كل النص من صورة بطاقة الهوية.
 *
 * @param   {string}          imagePath - رابط Cloudinary أو مسار ملف محلي
 * @returns {Promise<string>}           - النص المستخرج
 * @throws  {Error}                     - إذا فشل الـ OCR
 */
async function extractTextFromImage(imagePath) {
  let localPath  = null;
  let isTemp     = false;

  try {
    // ── تحديد مصدر الصورة ──────────────────────────────────────
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      // الصورة على Cloudinary — نحملها مؤقتاً
      console.log('[OCR Service] الصورة على Cloudinary — جاري التحميل...');
      localPath = await downloadToTemp(imagePath);
      isTemp = true;
    } else {
      // ملف محلي
      localPath = path.resolve(imagePath);
      if (!fs.existsSync(localPath)) {
        throw new Error(`ملف الصورة غير موجود: ${localPath}`);
      }
    }

    console.log(`[OCR Service] بدء OCR على: ${path.basename(localPath)}`);

    /**
     * نستخدم لغتين:
     *  - ara : العربية (اسم صاحب البطاقة + العبارات القومية)
     *  - eng : الإنجليزية (الأرقام والرقم القومي)
     */
    const { data } = await Tesseract.recognize(localPath, 'ara+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          process.stdout.write(`\r[OCR Service] التقدم: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    process.stdout.write('\n');
    const text = data.text || '';
    console.log(`[OCR Service] ✅ اكتمل — عدد الأحرف: ${text.length}`);
    console.log(`[OCR Service] نموذج: ${text.substring(0, 100).replace(/\n/g, ' ')}...`);

    return text;

  } finally {
    // ── تنظيف الملف المؤقت دائماً ──────────────────────────────
    if (isTemp && localPath) {
      cleanupTemp(localPath);
    }
  }
}

module.exports = { extractTextFromImage };

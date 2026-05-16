/**
 * ================================================
 * kycDecisionEngine.js — محرك قرار KYC
 * ================================================
 * يحلل النص المستخرج من صورة البطاقة (عبر tesseract.js)
 * ويقارنه ببيانات المستخدم المُدخَلة، ثم يُصدر قراراً
 * آلياً: approved / pending_review / rejected.
 *
 * لا يستخدم أي AI — فقط مقارنة نصوص + string-similarity.
 *
 * نظام التسجيل (100 نقطة):
 *  ┌─────────────────────────────────────────┬────────┐
 *  │ المعيار                                 │ النقاط │
 *  ├─────────────────────────────────────────┼────────┤
 *  │ الصورة بطاقة هوية مصرية                 │   30   │
 *  │ تطابق الرقم القومي                      │   40   │
 *  │ تشابه الاسم (string-similarity)         │   30   │
 *  └─────────────────────────────────────────┴────────┘
 */

const stringSimilarity = require('string-similarity');

// ── الكلمات المفتاحية المتوقع وجودها في بطاقة الرقم القومي المصرية ──
const EGYPTIAN_ID_KEYWORDS = [
  'بطاقة',
  'تحقيق',
  'شخصية',
  'الرقم القومي',
  'جمهورية',
  'مصر',
  'العربية',
];

// ── حدود القرار ──
// مخفَّضة لمراعاة تفاوتات جودة tesseract على بطاقات الهوية الحقيقية
const THRESHOLD_APPROVED = 50;
const THRESHOLD_PENDING  = 35;

// ── عتبة تشابه الأسماء ──
// مخفَّضة لأن tesseract لا يُرجع دائماً نصاً مثالياً من بطاقة فيزيائية
const NAME_SIMILARITY_THRESHOLD = 0.40;

/**
 * checkIsEgyptianId
 * -----------------
 * يتحقق مما إذا كان النص يحتوي على الكلمات المفتاحية لبطاقة الهوية المصرية.
 *
 * @param   {string}  text
 * @returns {{ score: number, matchedKeywords: string[] }}
 */
function checkIsEgyptianId(text) {
  const matched = EGYPTIAN_ID_KEYWORDS.filter((keyword) =>
    text.includes(keyword)
  );

  // 30 نقطة إذا وُجدت كلمتان على الأقل (دليل أقوى)
  // 15 نقطة إذا وُجدت كلمة واحدة
  let score = 0;
  if (matched.length >= 2) score = 30;
  else if (matched.length === 1) score = 15;

  return { score, matchedKeywords: matched };
}

/**
 * checkNationalIdMatch
 * --------------------
 * يتحقق مما إذا كان الرقم القومي المُدخَل موجوداً ضمن النص المستخرج.
 * يبحث عن التطابق الكامل أو الجزئي (OCR قد يخطئ في رقم أو اثنين).
 *
 * @param   {string}  text
 * @param   {string}  inputNationalId
 * @returns {{ score: number, found: boolean, partialMatch: boolean }}
 */
function checkNationalIdMatch(text, inputNationalId) {
  const cleanId = String(inputNationalId).trim();

  // إزالة المسافات والأحرف غير الرقمية من النص لتحسين البحث
  const digitsInText = text.replace(/[^\d]/g, '');

  // تطابق كامل — 40 نقطة
  if (text.includes(cleanId) || digitsInText.includes(cleanId)) {
    return { score: 40, found: true, partialMatch: false };
  }

  // تطابق جزئي — أول 10 أرقام على الأقل (OCR قد يخطئ في آخر 4)
  if (cleanId.length >= 10 && digitsInText.includes(cleanId.substring(0, 10))) {
    return { score: 25, found: false, partialMatch: true };
  }

  return { score: 0, found: false, partialMatch: false };
}

/**
 * checkNameSimilarity
 * -------------------
 * يقارن الاسم المُدخَل بالنص المستخرج بالكامل وبكل سطر على حدة.
 *
 * @param   {string}  text
 * @param   {string}  inputName
 * @returns {{ score: number, similarity: number }}
 */
function checkNameSimilarity(text, inputName) {
  const cleanName = String(inputName).trim();

  if (!cleanName) return { score: 0, similarity: 0 };

  // مقارنة الاسم بالنص كاملاً
  const fullTextSimilarity = stringSimilarity.compareTwoStrings(cleanName, text);

  // مقارنة الاسم بكل سطر على حدة واختيار الأفضل
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2);

  let bestLineSimilarity = 0;

  if (lines.length > 0) {
    const ratings = stringSimilarity.findBestMatch(cleanName, lines);
    bestLineSimilarity = ratings.bestMatch.rating;
  }

  // أخذ أعلى قيمة بين المقارنتين
  const similarity = Math.max(fullTextSimilarity, bestLineSimilarity);

  const score = similarity >= NAME_SIMILARITY_THRESHOLD ? 30 : Math.round(similarity * 30);

  return { score, similarity: parseFloat(similarity.toFixed(4)) };
}

/**
 * evaluateIdentity — الدالة الرئيسية
 * ------------------------------------
 * تُشغِّل محرك قرار KYC الكامل وتُعيد قراراً نهائياً.
 *
 * @param   {string}  extractedText   - النص الناتج عن tesseract.js
 * @param   {string}  inputName       - الاسم الرباعي المُدخَل بالعربية
 * @param   {string}  inputNationalId - الرقم القومي (14 رقم)
 * @param   {boolean} [ocrFailed]     - true إذا فشل OCR كلياً (خطأ تقني)
 * @returns {{
 *   status:    'approved' | 'pending_review' | 'rejected',
 *   score:     number,
 *   breakdown: object,
 *   reason?:   string
 * }}
 */
function evaluateIdentity(extractedText, inputName, inputNationalId, ocrFailed = false) {
  console.log('[KYC Engine] بدء تقييم الهوية...');

  // ── حماية: إذا فشل OCR كلياً بسبب خطأ تقني ──────────────────────────
  // لا نُعاقب المستخدم — نُحيله للمراجعة اليدوية.
  if (ocrFailed) {
    console.warn('[KYC Engine] ⚠️  OCR فشل كلياً — إحالة إلى pending_review');
    return {
      status:    'pending_review',
      score:     0,
      breakdown: { ocrFailed: true, reason: 'فشل قراءة الصورة — تتم مراجعتها يدوياً' },
    };
  }

  const text = String(extractedText || '');

  // ── الخطوة 1: التحقق من أن الصورة بطاقة هوية مصرية (30 نقطة) ──
  const idCheck         = checkIsEgyptianId(text);

  // ── الخطوة 2: التحقق من تطابق الرقم القومي (40 نقطة) ──
  const nationalIdCheck = checkNationalIdMatch(text, inputNationalId);

  // ── الخطوة 3: مقارنة الاسم (30 نقطة) ──
  const nameCheck       = checkNameSimilarity(text, inputName);

  // ── حساب الدرجة الإجمالية ──
  const totalScore = idCheck.score + nationalIdCheck.score + nameCheck.score;

  // ── تفاصيل التقييم ──
  const breakdown = {
    egyptianIdCheck: {
      score: idCheck.score,
      maxScore: 30,
      matchedKeywords: idCheck.matchedKeywords,
    },
    nationalIdCheck: {
      score: nationalIdCheck.score,
      maxScore: 40,
      found: nationalIdCheck.found,
      partialMatch: nationalIdCheck.partialMatch,
    },
    nameCheck: {
      score: nameCheck.score,
      maxScore: 30,
      similarity: nameCheck.similarity,
    },
    totalScore,
  };

  console.log('[KYC Engine] تفاصيل التقييم:', JSON.stringify(breakdown, null, 2));

  // ── إصدار القرار النهائي ──
  if (totalScore >= THRESHOLD_APPROVED) {
    console.log(`[KYC Engine] ✅ القرار: approved (${totalScore}/100)`);
    return { status: 'approved', score: totalScore, breakdown };
  }

  if (totalScore >= THRESHOLD_PENDING) {
    console.log(`[KYC Engine] ⏳ القرار: pending_review (${totalScore}/100)`);
    return { status: 'pending_review', score: totalScore, breakdown };
  }

  // ── حماية إضافية: إذا الصورة تحتوي على كلمات بطاقة هوية مصرية ──
  // لا نرفض أبداً — tesseract.js ضعيف في قراءة العربية من البطاقات الحقيقية
  // نُحيل للمراجعة اليدوية بدلاً من الرفض
  if (idCheck.score > 0) {
    console.log(`[KYC Engine] ⏳ القرار: pending_review (${totalScore}/100) — الصورة تحتوي كلمات بطاقة هوية، إحالة للمراجعة`);
    return { status: 'pending_review', score: totalScore, breakdown };
  }

  console.log(`[KYC Engine] ❌ القرار: rejected (${totalScore}/100)`);
  return {
    status: 'rejected',
    score: totalScore,
    breakdown,
    reason: 'الصورة المرفقة لا تبدو بطاقة هوية مصرية. يرجى إرفاق صورة واضحة لبطاقة الرقم القومي.',
  };
}

module.exports = { evaluateIdentity };

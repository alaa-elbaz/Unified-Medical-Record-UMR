/**
 * ================================================
 * aiProviderService.js — Multi-Provider AI Service
 * ================================================
 * Abstraction layer يدعم 4 مزودي AI مع fallback تلقائي:
 *
 *  1. Gemini  (GEMINI_API_KEY)
 *  2. OpenAI  (OPENAI_API_KEY)
 *  3. Groq    (GROQ_API_KEY)    — مجاني مع limits
 *  4. z.ai   (ZAI_API_KEY)     — OpenAI-compatible
 *
 * الترتيب الافتراضي: Gemini → OpenAI → Groq → z.ai
 * إذا فشل مزود ينتقل للتالي تلقائياً.
 *
 * لا يُكشف أي مفتاح — كل شيء من process.env
 */

// ── 1. Gemini ──────────────────────────────────────────────────────────
let geminiClient = null;
try {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  if (process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('🟢 [AI] Gemini متوفر');
  }
} catch (_) {}

// ── 2. OpenAI ──────────────────────────────────────────────────────────
let openaiClient = null;
try {
  const OpenAI = require('openai');
  if (process.env.OPENAI_API_KEY) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('🟢 [AI] OpenAI متوفر');
  }
} catch (_) {}

// ── 3. Groq ────────────────────────────────────────────────────────────
let groqClient = null;
try {
  const Groq = require('groq-sdk');
  if (process.env.GROQ_API_KEY) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
    console.log('🟢 [AI] Groq متوفر');
  }
} catch (_) {}

// ── 4. z.ai (OpenAI-compatible API) ────────────────────────────────────
let zaiClient = null;
try {
  const OpenAI = require('openai');
  if (process.env.ZAI_API_KEY) {
    zaiClient = new OpenAI({
      apiKey: process.env.ZAI_API_KEY,
      baseURL: 'https://api.zettablock.com/v1', // z.ai endpoint
    });
    console.log('🟢 [AI] z.ai متوفر');
  }
} catch (_) {}

// ── سجل المزودين المتاحين ──────────────────────────────────────────────
const availableCount = [geminiClient, openaiClient, groqClient, zaiClient].filter(Boolean).length;
if (availableCount === 0) {
  console.warn('⚠️ [AI] لا يوجد أي مزود AI متاح — سيتم استخدام الـ fallback المحلي');
} else {
  console.log(`🟢 [AI] ${availableCount} مزود AI جاهز للعمل`);
}

/* =========================================================
   Individual Provider Functions
========================================================= */

/**
 * callGemini — استدعاء Google Gemini
 */
async function callGemini(prompt, jsonMode = false) {
  if (!geminiClient) return null;
  const model = geminiClient.getGenerativeModel({
    model: 'gemini-2.0-flash',
    generationConfig: jsonMode
      ? { responseMimeType: 'application/json', temperature: 0.3 }
      : { temperature: 0.4 },
  });
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return jsonMode ? JSON.parse(text) : text;
}

/**
 * callOpenAI — استدعاء OpenAI (GPT-4o-mini أو gpt-3.5-turbo)
 */
async function callOpenAI(prompt, jsonMode = false) {
  if (!openaiClient) return null;
  const response = await openaiClient.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: jsonMode ? 0.3 : 0.4,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
  const text = response.choices[0]?.message?.content || '';
  return jsonMode ? JSON.parse(text) : text;
}

/**
 * callGroq — استدعاء Groq (LLaMA 3)
 */
async function callGroq(prompt, jsonMode = false) {
  if (!groqClient) return null;
  const response = await groqClient.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: jsonMode ? 0.3 : 0.4,
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });
  const text = response.choices[0]?.message?.content || '';
  return jsonMode ? JSON.parse(text) : text;
}

/**
 * callZAI — استدعاء z.ai (OpenAI-compatible)
 */
async function callZAI(prompt, jsonMode = false) {
  if (!zaiClient) return null;
  const response = await zaiClient.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
    temperature: jsonMode ? 0.3 : 0.4,
  });
  const text = response.choices[0]?.message?.content || '';
  return jsonMode ? JSON.parse(text) : text;
}

/* =========================================================
   callAI — الدالة الرئيسية مع Fallback تلقائي
   ─────────────────────────────────────────────
   بتجرب كل مزود بالترتيب. أول واحد ينجح يرجع نتيجته.
   لو كلهم فشلوا ترجع null (والـ controller يستخدم الـ heuristic).
========================================================= */

async function callAI(prompt, jsonMode = false) {
  const providers = [
    { name: 'Groq',    fn: callGroq },
    { name: 'z.ai',    fn: callZAI },
    { name: 'OpenAI',  fn: callOpenAI },
    { name: 'Gemini',  fn: callGemini },
  ];

  for (const provider of providers) {
    try {
      const result = await provider.fn(prompt, jsonMode);
      if (result !== null && result !== undefined) {
        console.log(`[AI] ✅ استجابة ناجحة من ${provider.name}`);
        return result;
      }
    } catch (err) {
      console.warn(`[AI] ⚠️ فشل ${provider.name}: ${err.message} — جاري تجربة المزود التالي...`);
    }
  }

  console.error('[AI] ❌ جميع مزودي AI فشلوا');
  return null;
}

/* =========================================================
   Exports
========================================================= */

module.exports = {
  callAI,         // الدالة الرئيسية (fallback تلقائي)
  callGemini,     // استدعاء مباشر لمزود محدد
  callOpenAI,
  callGroq,
  callZAI,
};

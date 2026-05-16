const User = require("../models/User");
const MedicalRecord = require("../models/MedicalRecord");
const Prescription = require("../models/Prescription");
const { isValidObjectId } = require("../utils/safeObjectId");
const { callAI } = require("../services/aiProviderService");

/* =========================================================
   POST /api/ai/format-record — AI Assisted Medical Record Entry
   Uses Gemini to rewrite patient text into structured medical terminology.
========================================================= */

exports.formatPatientRecord = async (req, res, next) => {
  try {
    const { rawText } = req.body;

    if (!rawText || typeof rawText !== 'string') {
      return res.status(400).json({ success: false, message: "النص العشوائي مطلوب" });
    }

    // --- Try Gemini first ---
    const prompt = `You are a medical documentation assistant. The patient wrote this complaint in Arabic:
"${rawText}"

Your task:
1. Rewrite it as a professional medical record entry in Arabic. Use proper medical terminology.
2. Extract any symptoms mentioned.

Respond ONLY with this JSON format, nothing else:
{
  "structuredText": "الصياغة الطبية المهنية هنا",
  "extractedSymptoms": ["عرض 1", "عرض 2"]
}

Rules:
- Write the structuredText in Arabic medical language.
- Be concise and clinical.
- If the text mentions body parts, surgeries, or conditions, use proper medical terms.
- extractedSymptoms should be an array of symptom/condition strings in Arabic.`;

    const geminiResult = await callAI(prompt, true);

    if (geminiResult && geminiResult.structuredText) {
      return res.json({
        success: true,
        data: {
          structuredText: geminiResult.structuredText,
          extractedSymptoms: geminiResult.extractedSymptoms || []
        }
      });
    }

    // --- Fallback: Heuristic simulation ---
    const keywords = ["مغص", "حرارة", "صداع", "دوخة", "كحة", "سكر", "ضغط", "ألم", "استفراغ", "زكام", "ربو", "عظام", "مفصل", "حوض", "عملية", "كسر"];
    const extractedSymptoms = keywords.filter(k => rawText.includes(k));

    let structuredText = rawText.trim();
    if (extractedSymptoms.length > 0) {
      structuredText = `يشكو المريض من أعراض تشمل: ${extractedSymptoms.join('، ')}. الشكوى الأصلية: "${rawText}"`;
    } else {
      structuredText = `يفيد المريض بالتالي: "${rawText}"`;
    }

    res.json({
      success: true,
      data: {
        structuredText,
        extractedSymptoms
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/ai/check-interactions — AI Drug Interaction Checker
   Uses Gemini to analyze drug interactions intelligently.
========================================================= */

exports.checkDrugInteractions = async (req, res, next) => {
  try {
    const { newDrug, currentDrugs = [], allergies = [] } = req.body;

    if (!newDrug && currentDrugs.length < 2) {
      return res.status(400).json({ success: false, message: "الدواء الجديد مطلوب أو يجب أن يكون هناك أكثر من دواء للفحص" });
    }

    // --- Try AI providers (auto-fallback) ---
    if (newDrug || currentDrugs.length > 1 || allergies.length > 0) {
      const prompt = `You are a pharmacology expert AI. Analyze the following:

${newDrug ? `New drug being added: "${newDrug}"` : 'Running an overall safety check on current block of drugs.'}
Current medications (if any): [${currentDrugs.map(d => `"${d}"`).join(', ')}]
Known allergies: [${allergies.map(a => `"${a}"`).join(', ')}]

Check for:
1. Drug-allergy conflicts (DANGER level)
2. Drug-drug interactions within the entire list (WARNING level)
3. Duplicate medications (WARNING level)

Respond ONLY with this JSON:
{
  "status": "Danger" | "Warning" | "Safe",
  "message": "رسالة باللغة العربية توضح النتيجة بالتفصيل"
}

Rules:
- If there is an allergy conflict, status must be "Danger"
- If there is a drug interaction or duplicate, status must be "Warning"
- If everything is safe, status must be "Safe"
- Message MUST be in Arabic`;

      const geminiResult = await callAI(prompt, true);
      if (geminiResult && geminiResult.status) {
        return res.json({ success: true, data: geminiResult });
      }
    }

    // --- Fallback: Heuristic simulation ---
    const nDrug = newDrug ? newDrug.toLowerCase() : '';
    const cDrugs = currentDrugs.map(d => d.toLowerCase());
    const algs = allergies.map(a => a.toLowerCase());

    // 1. Allergy Check (Danger)
    if (algs.some(a => nDrug.includes(a) || a.includes(nDrug))) {
      return res.json({
        success: true,
        data: {
          status: 'Danger',
          message: `خطر: الدواء "${newDrug}" يتعارض مع حساسية المريض المسجلة.`
        }
      });
    }

    // 2. Duplicate Check (Warning)
    if (cDrugs.some(d => d.includes(nDrug) || nDrug.includes(d))) {
      return res.json({
        success: true,
        data: {
          status: 'Warning',
          message: `تحذير: المريض يتناول بالفعل دواء مشابه أو مطابق لـ "${newDrug}".`
        }
      });
    }

    // 3. Known Interactions Simulation — BIDIRECTIONAL CHECK (Warning)
    const MOCK_INTERACTIONS = {
      'aspirin': ['warfarin', 'ibuprofen', 'naproxen', 'clopidogrel'],
      'warfarin': ['aspirin', 'ibuprofen', 'naproxen', 'vitamin k', 'garlic'],
      'metformin': ['alcohol', 'contrast dye'],
      'lisinopril': ['potassium', 'spironolactone'],
      'amoxicillin': ['methotrexate'],
      'ibuprofen': ['aspirin', 'warfarin', 'naproxen', 'lisinopril'],
      'naproxen': ['aspirin', 'warfarin', 'ibuprofen'],
      'clopidogrel': ['aspirin', 'omeprazole'],
      'omeprazole': ['clopidogrel', 'methotrexate'],
      'ciprofloxacin': ['theophylline', 'warfarin', 'tizanidine'],
      'fluconazole': ['warfarin', 'simvastatin'],
      'simvastatin': ['fluconazole', 'amlodipine', 'grapefruit'],
      'methotrexate': ['amoxicillin', 'ibuprofen', 'omeprazole']
    };

    let flags = [];

    // Check 1: newDrug is a key → see if any currentDrug is in its conflict list
    const directConflicts = MOCK_INTERACTIONS[nDrug];
    if (directConflicts) {
      flags = directConflicts.filter(c => cDrugs.some(m => m.includes(c)));
    }

    // Check 2: newDrug is a VALUE in another drug's conflict list → reverse lookup
    if (flags.length === 0) {
      for (const [drugKey, conflicts] of Object.entries(MOCK_INTERACTIONS)) {
        if (conflicts.some(c => nDrug.includes(c) || c.includes(nDrug))) {
          const matchedCurrent = cDrugs.filter(m => m.includes(drugKey));
          if (matchedCurrent.length > 0) {
            flags = matchedCurrent;
            break;
          }
        }
      }
    }

    if (flags.length > 0) {
      return res.json({
        success: true,
        data: {
          status: 'Warning',
          message: `تحذير تداخل دوائي: قد يتعارض "${newDrug}" مع "${flags.join(' و ')}". يرجى مراجعة الطبيب.`
        }
      });
    }

    // Default Safe
    return res.json({
      success: true,
      data: {
        status: 'Safe',
        message: `آمن: لا توجد تعارضات دوائية مكشوفة مع "${newDrug}".`
      }
    });

  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/ai/analyze — Full Clinical AI Analysis
   Uses Gemini to produce comprehensive patient health analysis.
========================================================= */

exports.analyzePatient = async (req, res, next) => {
  try {
    const { patientId } = req.body;
    const requesterId = req.user._id || req.user.userId;
    const requesterRole = req.user.role;

    if (!isValidObjectId(patientId)) {
      return res.status(400).json({ success: false, message: "Invalid patientId" });
    }

    if (!req.body.hasConsented) {
      return res.status(400).json({ success: false, message: "Consent required: يجب الموافقة على أن الذكاء الاصطناعي مجرد أداة مساعدة" });
    }

    // Security: patients can only analyze themselves
    if (requesterRole === 'patient' && requesterId.toString() !== patientId) {
      return res.status(403).json({ success: false, message: "لا يمكنك تحليل بيانات مريض آخر" });
    }

    // --- Step 1: Collect patient data from MongoDB ---
    const [patient, records, prescriptions] = await Promise.all([
      User.findById(patientId)
        .select('fullName bloodType allergies chronicDiseases dateOfBirth gender')
        .lean(),
      MedicalRecord.find({ patientId })
        .populate('doctorId', 'fullName specialty')
        .sort({ visitDate: -1 })
        .limit(10)
        .lean(),
      Prescription.find({ patientId })
        .populate('doctorId', 'fullName')
        .sort({ createdAt: -1 })
        .limit(10)
        .lean()
    ]);

    if (!patient) {
      return res.status(404).json({ success: false, message: "المريض غير موجود" });
    }

    // --- Step 2: Build structured clinical payload ---
    const payload = {
      patient: {
        name: patient.fullName,
        age: patient.dateOfBirth
          ? Math.floor((new Date() - new Date(patient.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
          : null,
        gender: patient.gender,
        bloodType: patient.bloodType || 'غير معروف',
        allergies: patient.allergies || [],
        chronicDiseases: patient.chronicDiseases || []
      },
      recentDiagnoses: records.map(r => ({
        diagnosis: r.diagnosis,
        notes: r.notes,
        doctor: r.doctorId?.fullName || 'غير معروف',
        specialty: r.doctorId?.specialty || '',
        date: r.visitDate,
        source: r.source || 'Doctor'
      })),
      activePrescriptions: prescriptions.map(p => ({
        medication: p.medication,
        dose: p.dose,
        duration: p.duration,
        doctor: p.doctorId?.fullName || 'غير معروف',
        status: p.status
      }))
    };

    // --- Step 3: Try Gemini AI for real analysis ---
    const geminiPrompt = `أنت طبيب ذكاء اصطناعي متخصص في التحليل السريري. قم بتحليل بيانات المريض التالية وقدم تقريراً شاملاً:

بيانات المريض:
- الاسم: ${payload.patient.name}
- العمر: ${payload.patient.age || 'غير معروف'}
- الجنس: ${payload.patient.gender || 'غير معروف'}
- فصيلة الدم: ${payload.patient.bloodType}
- الحساسيات: ${payload.patient.allergies.length ? payload.patient.allergies.join('، ') : 'لا يوجد'}
- الأمراض المزمنة: ${payload.patient.chronicDiseases.length ? payload.patient.chronicDiseases.join('، ') : 'لا يوجد'}

التشخيصات الأخيرة:
${payload.recentDiagnoses.length ? payload.recentDiagnoses.map(d => `- ${d.diagnosis} (${d.doctor}, ${d.date ? new Date(d.date).toLocaleDateString('ar-EG') : 'غير محدد'})`).join('\n') : 'لا توجد سجلات'}

الأدوية الحالية:
${payload.activePrescriptions.length ? payload.activePrescriptions.map(p => `- ${p.medication} ${p.dose} (${p.duration})`).join('\n') : 'لا توجد أدوية'}

قدم تحليلك بصيغة JSON فقط:
{
  "summary": "ملخص شامل للحالة الصحية بالعربية (3-5 جمل)",
  "drugWarnings": ["تحذيرات دوائية إن وجدت"],
  "recommendations": ["توصيات طبية عامة"],
  "riskLevel": "low" | "medium" | "high"
}`;

    const geminiResult = await callAI(geminiPrompt, true);

    if (geminiResult && geminiResult.summary) {
      return res.json({
        success: true,
        message: "تم تجهيز التحليل السريري بنجاح (AI)",
        payload,
        analysis: {
          summary: geminiResult.summary,
          drugWarnings: geminiResult.drugWarnings || [],
          recommendations: geminiResult.recommendations || [],
          riskLevel: geminiResult.riskLevel || 'low',
          generatedAt: new Date().toISOString(),
          aiModel: "multi-provider",
          disclaimer: "هذا تحليل أولي من الذكاء الاصطناعي لأغراض المساعدة فقط. يجب دائماً مراجعة طبيب متخصص."
        }
      });
    }

    // --- Fallback: Heuristic simulation ---
    const drugWarnings = [];
    const MOCK_INTERACTIONS = {
      'aspirin': ['warfarin', 'ibuprofen', 'naproxen'],
      'metformin': ['alcohol', 'contrast dye'],
      'lisinopril': ['potassium', 'spironolactone']
    };

    const medNames = prescriptions.map(p => p.medication.toLowerCase());
    medNames.forEach(med => {
      const interactsWith = Object.entries(MOCK_INTERACTIONS).find(([key]) => med.includes(key));
      if (interactsWith) {
        const [drug, conflicts] = interactsWith;
        const flagged = conflicts.filter(c => medNames.some(m => m.includes(c)));
        if (flagged.length) {
          drugWarnings.push(`⚠️ تحذير تفاعل دوائي: ${drug} مع ${flagged.join(', ')}`);
        }
      }
    });

    const summary = [
      `المريض ${patient.fullName}،`,
      patient.chronicDiseases?.length
        ? `يعاني من أمراض مزمنة: ${patient.chronicDiseases.join('، ')}.`
        : `لا يوجد أمراض مزمنة موثقة.`,
      patient.allergies?.length
        ? `لديه حساسية تجاه: ${patient.allergies.join('، ')}.`
        : `لا توجد حساسيات موثقة.`,
      records.length
        ? `آخر تشخيص طبي: "${records[0].diagnosis}" بتاريخ ${new Date(records[0].visitDate).toLocaleDateString('ar-EG')}.`
        : `لا توجد سجلات طبية سابقة.`,
      prescriptions.length
        ? `يتناول حالياً ${prescriptions.length} دواء/أدوية. أبرزها: ${prescriptions[0].medication} (${prescriptions[0].dose}).`
        : `لا توجد وصفات طبية نشطة.`,
      drugWarnings.length ? drugWarnings.join(' ') : '✅ لم يتم اكتشاف تفاعلات دوائية خطرة.'
    ].join(' ');

    res.json({
      success: true,
      message: "تم تجهيز التحليل السريري بنجاح (Simulation Mode)",
      payload,
      analysis: {
        summary,
        drugWarnings,
        riskLevel: drugWarnings.length > 0 ? 'high' : (patient.chronicDiseases?.length > 2 ? 'medium' : 'low'),
        generatedAt: new Date().toISOString(),
        aiModel: "heuristic-simulation",
        disclaimer: "هذا تحليل أولي اصطناعي لأغراض المساعدة فقط. يجب دائماً مراجعة طبيب متخصص. (ملاحظة: لتفعيل Gemini AI الحقيقي، أضف GEMINI_API_KEY في متغيرات البيئة)"
      }
    });
  } catch (error) {
    console.error("AI ERROR:", error);
    res.status(503).json({ success: false, message: "خدمة الذكاء الاصطناعي غير متوفرة حالياً، يرجى المحاولة لاحقاً." });
  }
};

/* =========================================================
   POST /api/ai/chat — Patient AI Chatbot
   Real-time chat holding context of the patient's records
========================================================= */

exports.chatWithPatient = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    const userId = req.user.userId || req.user._id;

    if (!message) {
      return res.status(400).json({ success: false, message: "الرسالة مطلوبة" });
    }

    const userDoc = await User.findById(userId).select("fullName role gender bloodType allergies chronicDiseases");

    const siteGuide = `
      دليل نظام MedCore:
      - التسجيل: من الصفحة الرئيسية ← "إنشاء حساب" ← إدخال البيانات ← رفع صورة البطاقة ← الانتظار للموافقة
      - تسجيل الدخول: بالإيميل + الرقم القومي (بدون كلمة مرور)
      - حجز موعد: من تبويب "المواعيد" ← "حجز موعد جديد" ← اختيار التخصص والطبيب والوقت
      - QR Code: من تبويب QR ← الرابط العام يعرض بيانات الطوارئ فقط، الكود المؤمّن (15 دقيقة) يعرض كل السجلات
      - الأدوية: من تبويب "الأدوية" ← إضافة دواء ← فحص التعارض ← حفظ
      - التحاليل: من تبويب "التحاليل" ← رفع ملف نتيجة خارجية
      - الأشعة: من تبويب "الأشعة" ← رفع صورة أشعة خارجية
      - الطوارئ: صفحة /emergency متاحة للجميع بدون تسجيل دخول
      - تصدير PDF: زر "تصدير السجل" من أعلى لوحة التحكم
      - الملف الشخصي: من صفحة البروفايل ← تعديل البيانات ← جهة اتصال الطوارئ
    `;

    const medicalContext = userDoc ? `
      بيانات المستخدم: ${userDoc.fullName} (${userDoc.role})
      ${userDoc.role === 'patient' ? `
      النوع: ${userDoc.gender === 'male' ? 'ذكر' : 'أنثى'}
      فصيلة الدم: ${userDoc.bloodType || 'غير محدد'}
      الأمراض المزمنة: ${userDoc.chronicDiseases?.length > 0 ? userDoc.chronicDiseases.join(', ') : 'لا يوجد'}
      الحساسيات: ${userDoc.allergies?.length > 0 ? userDoc.allergies.join(', ') : 'لا يوجد'}` : ''}
    ` : '';

    const systemPrompt = `
      أنت "MedBot"، المساعد الذكي لنظام MedCore (السجل الطبي الموحد).
      أنت تعرف كل شيء عن الموقع وكيف يعمل. أنت أيضاً مستشار صحي عام.
      ${siteGuide}
      ${medicalContext}

      القواعد:
      1. إذا سأل المستخدم عن كيفية استخدام الموقع (التسجيل، الحجز، الأدوية، إلخ) → أجب من دليل الموقع أعلاه بوضوح.
      2. إذا سأل عن صحته → قدم نصائح عامة مع التحذير باستشارة طبيب.
      3. لا تصف أدوية أبداً. قل "يجب استشارة طبيبك".
      4. إذا كانت حالة طارئة → وجهه لأقرب طوارئ أو صفحة /emergency.
      5. ردودك مختصرة ومفيدة (3-5 أسطر). تحدث بالعربية بأسلوب ودود.

      المحادثة السابقة: ${history ? JSON.stringify(history.slice(-5)) : 'لا يوجد'}
      رسالة المستخدم: "${message}"
    `;

    let reply = "";

    const aiReply = await callAI(systemPrompt, false);
    if (aiReply) {
      reply = aiReply;
    } else {
      // Enhanced local fallback
      const m = message.toLowerCase();
      if (m.includes('سجل') || m.includes('تسجيل') || m.includes('حساب')) {
        reply = 'للتسجيل: اذهب للصفحة الرئيسية ← اضغط "إنشاء حساب" ← أدخل بياناتك (الاسم، الإيميل، الرقم القومي، اسم الأم) ← ارفع صورة البطاقة ← انتظر موافقة الإدارة.';
      } else if (m.includes('دخول') || m.includes('login')) {
        reply = 'لتسجيل الدخول: اذهب لصفحة "تسجيل الدخول" ← أدخل الإيميل والرقم القومي. لا يحتاج النظام كلمة مرور.';
      } else if (m.includes('حجز') || m.includes('موعد')) {
        reply = 'لحجز موعد: من لوحة التحكم ← تبويب "المواعيد" ← "حجز موعد جديد" ← اختر التخصص والطبيب والموعد المناسب.';
      } else if (m.includes('طوارئ') || m.includes('emergency')) {
        reply = 'للطوارئ: افتح صفحة /emergency مباشرة (بدون تسجيل دخول). يمكن مسح QR المريض لرؤية بياناته الحيوية وجهة اتصال الطوارئ فوراً.';
      } else if (m.includes('ألم') || m.includes('تعب') || m.includes('صداع')) {
        reply = 'يبدو أنك تعاني من أعراض. يرجى حجز موعد مع الطبيب عبر المنصة. إذا كانت الأعراض شديدة، توجه لأقرب طوارئ فوراً.';
      } else if (m.includes('دواء') || m.includes('علاج') || m.includes('تعارض')) {
        reply = 'لا يمكنني وصف أدوية. يمكنك فحص التعارض الدوائي من تبويب "الأدوية" ← اكتب اسم الدواء ← اضغط "فحص التعارض". استشر طبيبك دائماً.';
      } else {
        reply = 'أهلاً بك! أنا مساعد MedCore الذكي. يمكنني مساعدتك في: التسجيل، تسجيل الدخول، حجز المواعيد، الأدوية والتعارضات، التحاليل، الأشعة، QR Code، الطوارئ، تصدير PDF وغيرها. اسألني!';
      }
    }

    res.json({ success: true, data: { reply } });
  } catch (error) {
    next(error);
  }
};

/* =========================================================
   POST /api/ai/simplify-diagnosis — AI Patient Notes Generator
   Converts a doctor's clinical diagnosis into simple Arabic
   patient instructions and notes.
========================================================= */

exports.simplifyDiagnosis = async (req, res, next) => {
  try {
    const { diagnosis } = req.body;

    if (!diagnosis || typeof diagnosis !== 'string' || !diagnosis.trim()) {
      return res.status(400).json({ success: false, message: "التشخيص الطبي مطلوب" });
    }

    const prompt = `أنت مساعد طبي متخصص في التواصل مع المرضى. 
الطبيب كتب التشخيص التالي بالمصطلحات الطبية:
"${diagnosis}"

مهمتك: اكتب ملاحظات مبسطة وواضحة للمريض العادي باللغة العربية العامية المصرية، تشمل:
1. شرح الحالة بكلام بسيط ومفهوم
2. أهم التعليمات التي يجب اتباعها
3. متى يجب العودة للطبيب أو الذهاب للطوارئ (إن وجد)

اكتب بشكل ودي ومطمئن، وبدون أي مصطلحات طبية معقدة.
لا تتجاوز 100 كلمة. لا تذكر أدوية محددة أو جرعات.`;

    const simplifiedText = await callAI(prompt, false);

    if (simplifiedText) {
      return res.json({
        success: true,
        data: { simplifiedNotes: simplifiedText.trim() }
      });
    }

    // Fallback
    return res.json({
      success: true,
      data: {
        simplifiedNotes: `بناءً على تشخيص طبيبك، يُرجى الالتزام بالتعليمات المُعطاة لك والراحة التامة. إذا ساءت الأعراض أو ظهرت أعراض جديدة ومقلقة، يُرجى مراجعة الطبيب فوراً أو التوجه للطوارئ. صحة وسلامة! 💚`
      }
    });
  } catch (error) {
    next(error);
  }
};

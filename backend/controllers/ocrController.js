const Tesseract = require("tesseract.js");
const fs = require("fs");
const { callAI } = require("../services/aiProviderService");

/* =========================================================
   POST /api/ai/ocr — Optical Character Recognition
   Extract text from uploaded image and optionally format it
========================================================= */

exports.extractTextFromImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "صورة السجل مطلوبة" });
    }

    const imagePath = req.file.path;

    // Run Tesseract OCR (Ara + Eng)
    // For production, maybe just ara or eng depending on the document
    const { data: { text } } = await Tesseract.recognize(
      imagePath,
      'ara+eng', // Arabic and English support
      { logger: m => console.log(m) } // Log progress
    );

    // Delete the temporary uploaded file immediately since we just needed the
    // text. Skip when the path is a remote URL (CloudinaryStorage returns
    // `req.file.path` as an HTTPS URL — calling fs.unlink on that would always
    // fail, polluting logs. Cloudinary lifecycle handles its own cleanup.)
    if (typeof imagePath === 'string' && !/^https?:\/\//i.test(imagePath)) {
      fs.unlink(imagePath, (err) => {
        if (err) console.error("Failed to delete temp OCR image:", err);
      });
    }

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: "لم نتمكن من قراءة أي نص من الصورة. يرجى التأكد من وضوح الصورة." 
      });
    }

    // Try formatting the extracted raw text via Gemini, similar to format-record
    const prompt = `
      نص تم استخراجه من صورة طبية قديمة (روشتة، تحليل، او تقرير) باستخدام أداة OCR:
      ---
      ${text}
      ---
      المطلوب:
      اقرأ النص جيداً. استخرج البيانات الطبية المهمة (تشخيص، أدوية، قيم تحاليل) واكتبها في قصة سريرية قصيرة ومفهومة باللغة العربية.
      استخرج أيضاً "extractedSymptoms" مصفوفة بأهم الأعراض أو الكلمات المفتاحية للحالة.
      قم بإرجاع JSON بالصيغة التالية تماماً:
      {
        "structuredText": "النص المنقح والصياغة السريرية",
        "extractedSymptoms": ["عرض 1", "دواء 1", "كلمة مفتاحية"]
      }
      لا تكتب أي شيء خارج ה־ JSON.
    `;

    let result = { structuredText: text, extractedSymptoms: [] };

    try {
      const aiResponse = await callAI(prompt, true);
      if (aiResponse && aiResponse.structuredText) {
        result = aiResponse;
      }
    } catch (err) {
      console.warn("AI formatting for OCR failed, falling back to raw text", err.message);
    }

    res.json({
      success: true,
      message: "تم قراءة الصورة وتحليلها بنجاح",
      data: {
        rawText: text,
        formatted: result
      }
    });

  } catch (error) {
    next(error);
  }
};

import { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot } from 'lucide-react'
import { useAuth } from '@/context/AuthContext.jsx'
import api from '@/services/api.js'

/* =========================================================
   Global AI Chatbot Widget — site-wide, right-positioned
   Works for ALL users (logged in or guest)
   Understands the WHOLE site: registration, booking, etc.
========================================================= */

// Site knowledge base for offline/fallback mode
const SITE_KNOWLEDGE = {
  register: 'للتسجيل كمريض: اضغط على "إنشاء حساب" من الصفحة الرئيسية، ثم أدخل بياناتك الشخصية (الاسم، الإيميل، الرقم القومي، اسم الأم) وارفع صورة البطاقة. بعدها انتظر موافقة الإدارة.',
  login: 'لتسجيل الدخول: اذهب لصفحة "تسجيل الدخول" وأدخل الإيميل والرقم القومي. لا يحتاج النظام كلمة مرور.',
  book: 'لحجز موعد: من لوحة التحكم الخاصة بك، اذهب لتبويب "المواعيد" واضغط "حجز موعد جديد". اختر التخصص والطبيب والموعد المناسب.',
  emergency: 'للطوارئ: يمكن لأي شخص (بدون تسجيل دخول) فتح صفحة /emergency ومسح كود QR الخاص بالمريض لرؤية فصيلة الدم والحساسيات والأمراض المزمنة وجهة اتصال الطوارئ فوراً.',
  qr: 'كود QR: من لوحة التحكم، تبويب "QR Code". يمكنك عرض رابط عام للطوارئ أو توليد كود مؤمّن لمدة 15 دقيقة يتيح للطبيب رؤية سجلك الكامل.',
  prescription: 'الأدوية: يمكنك إضافة أدوية ذاتياً من تبويب "الأدوية"، مع فحص التعارض الدوائي قبل الحفظ. كما يمكنك حذف الأدوية التي أضفتها بنفسك.',
  lab: 'التحاليل: من تبويب "التحاليل" يمكنك رفع نتيجة تحليل خارجية (صورة أو PDF). كما يمكنك حذف التحاليل التي رفعتها بنفسك.',
  radiology: 'الأشعة: من تبويب "الأشعة" يمكنك رفع صور أشعة خارجية. يمكنك أيضاً حذف الأشعة التي رفعتها بنفسك.',
  profile: 'الملف الشخصي: من صفحة "الملف الشخصي" يمكنك تعديل بياناتك الأساسية وإضافة جهة اتصال الطوارئ (اسم وهاتف وصلة القرابة).',
  pdf: 'تصدير PDF: من أعلى لوحة التحكم، اضغط زر "تصدير السجل (PDF)" لتحميل ملخص سجلك الطبي كملف PDF.',
  ai: 'الذكاء الاصطناعي: يدعم النظام صياغة طبية ذكية للملاحظات، فحص تعارض الأدوية، وقراءة الصور ضوئياً (OCR). كل هذا من تبويب "إدخال ذاتي".',
  pharmacy: 'الصيدلية: يمكن للصيدلية البحث عن مريض بالـ ID أو QR Code لرؤية وصفاته وصرف الأدوية.',
  doctor: 'الطبيب: يمكن للطبيب إنشاء سجلات طبية وروشتات للمريض، وإدارة المواعيد والحالات.',
}

function getLocalReply(msg) {
  const m = msg.toLowerCase()
  if (m.includes('سجل') || m.includes('تسجيل') || m.includes('حساب') || m.includes('register')) return SITE_KNOWLEDGE.register
  if (m.includes('دخول') || m.includes('login') || m.includes('ادخل')) return SITE_KNOWLEDGE.login
  if (m.includes('حجز') || m.includes('موعد') || m.includes('book') || m.includes('appointment')) return SITE_KNOWLEDGE.book
  if (m.includes('طوارئ') || m.includes('emergency') || m.includes('اسعاف')) return SITE_KNOWLEDGE.emergency
  if (m.includes('qr') || m.includes('كود') || m.includes('باركود')) return SITE_KNOWLEDGE.qr
  if (m.includes('دواء') || m.includes('علاج') || m.includes('روشتة') || m.includes('تعارض')) return SITE_KNOWLEDGE.prescription
  if (m.includes('تحليل') || m.includes('مختبر') || m.includes('lab')) return SITE_KNOWLEDGE.lab
  if (m.includes('اشعة') || m.includes('أشعة') || m.includes('radiology')) return SITE_KNOWLEDGE.radiology
  if (m.includes('ملف') || m.includes('بروفايل') || m.includes('profile') || m.includes('شخصي')) return SITE_KNOWLEDGE.profile
  if (m.includes('pdf') || m.includes('تصدير') || m.includes('تحميل')) return SITE_KNOWLEDGE.pdf
  if (m.includes('ذكاء') || m.includes('ai') || m.includes('ocr')) return SITE_KNOWLEDGE.ai
  if (m.includes('صيدل') || m.includes('pharmacy')) return SITE_KNOWLEDGE.pharmacy
  if (m.includes('طبيب') || m.includes('دكتور') || m.includes('doctor')) return SITE_KNOWLEDGE.doctor
  if (m.includes('ألم') || m.includes('تعب') || m.includes('صداع') || m.includes('مريض')) return 'يبدو أنك تعاني من أعراض مزعجة. يرجى حجز موعد مع الطبيب عبر المنصة من تبويب "المواعيد". إذا كانت الأعراض شديدة، توجه لأقرب طوارئ فوراً.'
  return 'أهلاً بك! أنا مساعد MedCore الذكي. يمكنني مساعدتك في: التسجيل، تسجيل الدخول، حجز المواعيد، الأدوية، التحاليل، الأشعة، QR Code، الطوارئ، تصدير PDF وغيرها. اسألني عن أي شيء!'
}

export default function AiChatbotWidget() {
  // AuthProvider is mandatory at the App root, so `useAuth()` is always
  // available. The previous `useAuth?.() || {}` was misleading — it implied
  // the widget could survive without the provider, which it can't.
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'أهلاً بك في نظام MedCore! أنا المساعد الذكي. اسألني عن أي شيء يخص الموقع أو صحتك 🩺' }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input.trim()
    setInput('')
    const newMessages = [...messages, { role: 'user', text: userMessage }]
    setMessages(newMessages)
    setIsLoading(true)

    try {
      if (user) {
        // Authenticated — call backend AI
        const history = newMessages.slice(Math.max(0, newMessages.length - 6), newMessages.length - 1)
        const { data } = await api.post('/ai/chat', { message: userMessage, history })
        setMessages([...newMessages, { role: 'ai', text: data.data.reply }])
      } else {
        // Guest — use local knowledge base
        await new Promise(r => setTimeout(r, 400))
        const reply = getLocalReply(userMessage)
        setMessages([...newMessages, { role: 'ai', text: reply }])
      }
    } catch {
      // Fallback to local knowledge if API fails
      const reply = getLocalReply(userMessage)
      setMessages([...newMessages, { role: 'ai', text: reply }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999]" dir="rtl">

      {isOpen && (
        <div className="bg-white/95 backdrop-blur-xl border border-indigo-100 w-[calc(100vw-32px)] sm:w-96 rounded-2xl shadow-2xl overflow-hidden mb-3 flex flex-col transition-all duration-300 animate-in slide-in-from-bottom-5" style={{ height: '480px', maxHeight: '75vh' }}>

          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 p-3.5 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-full"><Bot size={18} /></div>
              <div>
                <h3 className="font-bold text-sm">المساعد الذكي (MedBot)</h3>
                <p className="text-[10px] text-indigo-200">{user ? `مرحباً ${user.fullName?.split(' ')[0]}` : 'متاح للجميع'}</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1.5 rounded-full transition"><X size={18} /></button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot size={14} className="text-indigo-600" />
                  </div>
                )}
                <div className={`p-2.5 rounded-2xl max-w-[82%] text-[13px] leading-relaxed shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tl-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-tr-sm'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0"><Bot size={14} className="text-indigo-600" /></div>
                <div className="p-2.5 bg-white border border-gray-100 rounded-2xl rounded-tr-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text" value={input} onChange={(e) => setInput(e.target.value)}
              placeholder="اسألني عن أي شيء..."
              className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={isLoading}
            />
            <button type="submit" disabled={!input.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white w-9 h-9 rounded-xl flex items-center justify-center transition">
              <Send size={16} />
            </button>
          </form>

          <div className="bg-gray-50 py-1 px-2 text-center border-t">
            <p className="text-[8px] text-gray-400">لا يغني عن استشارة الطبيب المختص</p>
          </div>
        </div>
      )}

      {!isOpen && (
        <button onClick={() => setIsOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 hover:scale-110 transition-all text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <MessageCircle size={26} />
        </button>
      )}
    </div>
  )
}

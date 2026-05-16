import { useState, useEffect } from "react";
import api from "../../services/api";

export default function SecureImage({ src, alt, className, onClick }) {
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  // Always have *something* meaningful for screen readers — falling back to
  // a plain "صورة طبية" beats an empty alt that announces as "image".
  const safeAlt = alt || 'صورة طبية';

  useEffect(() => {
    let isMounted = true;

    const fetchSecureUrl = async () => {
      if (!src) return;

      // لو الصورة مش من Cloudinary أصلًا (مثلاً صورة شخصية ديفولت أو مسار محلي)، نعرضها فوراً
      if (!src.includes("cloudinary.com")) {
        setImgUrl(src);
        setLoading(false);
        return;
      }

      try {
        // الاتصال بنقطة النهاية الآمنة، نبعت الـ url كامل عشان الباك اند يستخرج منه الـ publicId
        const response = await api.get(`/images/secure?url=${encodeURIComponent(src)}`);
        if (isMounted) {
          setImgUrl(response.data.url);
        }
      } catch (error) {
        console.error("Error fetching secure image", error);
        // Fallback
        if (isMounted) setImgUrl(src);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSecureUrl();

    return () => {
      isMounted = false;
    };
  }, [src]);

  if (loading) {
    return (
      <div
        className={`animate-pulse bg-gray-200 flex items-center justify-center text-gray-500 rounded ${className}`}
        role="img"
        aria-label={`جاري تحميل ${safeAlt}`}
      >
        <span className="sr-only">جاري تحميل {safeAlt}</span>
        <svg className="w-6 h-6 animate-spin mr-2" viewBox="0 0 24 24" aria-hidden="true">
          <circle
            cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="4" className="opacity-25"
          ></circle>
          <path
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
            className="opacity-75"
          ></path>
        </svg>
      </div>
    );
  }

  if (errored || !imgUrl) {
    return (
      <div
        className={`bg-gray-100 border border-dashed border-gray-300 flex items-center justify-center text-gray-500 text-xs rounded ${className}`}
        role="img"
        aria-label={`تعذر تحميل ${safeAlt}`}
      >
        <span>تعذر تحميل {safeAlt}</span>
      </div>
    );
  }

  return (
    <img
      src={imgUrl}
      alt={safeAlt}
      className={className}
      onClick={onClick}
      onError={() => setErrored(true)}
    />
  );
}

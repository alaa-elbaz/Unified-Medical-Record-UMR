export const getImageUrl = (image) => {
  if (!image) return "/default.png";

  // لو Cloudinary
  if (image.startsWith("http")) return image;

  // remove /api من الـ base URL
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api")
    .replace(/\/api$/, "");

  // handle windows paths and normalize slashes
  const cleanPath = image.replace(/\\/g, "/");

  // Fix old absolute system paths (e.g., /opt/render/project/.../uploads/xxx.jpg)
  const uploadsIndex = cleanPath.indexOf('uploads/');
  if (uploadsIndex !== -1) {
    return `${baseUrl}/${cleanPath.substring(uploadsIndex)}`;
  }

  // Fallback (ensure no double slashes if cleanPath starts with a slash)
  return `${baseUrl}/${cleanPath.replace(/^\/+/, '')}`;
};
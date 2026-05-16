/**
 * cloudinaryPreprocess.js — image preprocessing via Cloudinary URL transformations.
 *
 * Why Cloudinary, not sharp?
 *  - Zero CPU/memory load on our backend.
 *  - The CDN delivers preprocessed images straight from edge nodes.
 *  - Multiple transformation variants are just different URLs — we can fan
 *    them out in parallel and let the OCR engine pick the cleanest read.
 *
 * Public API:
 *   buildVariantUrls(publicId, opts) → { name → signedUrl }
 *   listVariantNames()               → string[]
 */

const cloudinary = require("../config/cloudinary");

/**
 * Variant catalogue.
 *
 * Each variant is a list of Cloudinary transformations applied left-to-right.
 * They all share the same width-cap and output JPEG to keep the OCR download
 * size predictable (full-resolution photos can be 5–10 MB).
 *
 * - baseline   : just resized + JPEG (control, sometimes the best for clean photos)
 * - greyAuto   : greyscale + auto-contrast (best general-purpose enhance)
 * - greySharp  : greyAuto + sharpen kernel (helps on slightly blurry text)
 * - blackwhite : threshold (great for printed text on white background)
 * - improve    : Cloudinary's smart `improve` + greyscale
 */
const VARIANT_TRANSFORMATIONS = {
  baseline: [
    { width: 1800, height: 1800, crop: "limit" },
    { quality: 85, fetch_format: "jpg" },
  ],
  greyAuto: [
    { width: 1800, height: 1800, crop: "limit" },
    { effect: "grayscale" },
    { effect: "auto_contrast" },
    { quality: 90, fetch_format: "jpg" },
  ],
  greySharp: [
    { width: 1800, height: 1800, crop: "limit" },
    { effect: "grayscale" },
    { effect: "auto_contrast" },
    { effect: "sharpen:80" },
    { quality: 90, fetch_format: "jpg" },
  ],
  blackwhite: [
    { width: 1800, height: 1800, crop: "limit" },
    { effect: "blackwhite:50" },
    { quality: 90, fetch_format: "jpg" },
  ],
  improve: [
    { width: 1800, height: 1800, crop: "limit" },
    { effect: "improve" },
    { effect: "grayscale" },
    { quality: 90, fetch_format: "jpg" },
  ],
};

/**
 * Parse a Cloudinary URL or path into the bits we need to build signed
 * transformation URLs. Same logic as imageController so the two stay aligned.
 */
function parseCloudinaryUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 4) return null;
    const resourceType = parts[1] || "image";
    const deliveryType = parts[2] || "upload";
    let versionIdx = -1;
    for (let i = 3; i < parts.length; i++) {
      if (/^v\d+$/.test(parts[i])) { versionIdx = i; break; }
    }
    const idParts = parts.slice(versionIdx >= 0 ? versionIdx + 1 : 3);
    const last = idParts.pop() || "";
    const dot = last.lastIndexOf(".");
    const filename = dot > -1 ? last.slice(0, dot) : last;
    const format = dot > -1 ? last.slice(dot + 1).toLowerCase() : "";
    const publicId = [...idParts, filename].join("/");
    return { resourceType, deliveryType, publicId, format };
  } catch {
    return null;
  }
}

/**
 * Build the full set of variant URLs for an image.
 *
 * @param {string} input — either a Cloudinary URL OR a public_id directly.
 * @param {object} [opts]
 *   - deliveryType   : 'private' (default) | 'upload' | 'authenticated'
 *   - resourceType   : 'image' (default)
 *   - variants       : subset of names to build; defaults to all
 * @returns {Object<string,string>} map of variantName → signed URL
 */
function buildVariantUrls(input, opts = {}) {
  let publicId = input;
  let deliveryType = opts.deliveryType || "private";
  let resourceType = opts.resourceType || "image";

  if (typeof input === "string" && /^https?:\/\//.test(input)) {
    const parsed = parseCloudinaryUrl(input);
    if (parsed) {
      publicId = parsed.publicId;
      deliveryType = opts.deliveryType || parsed.deliveryType || "private";
      resourceType = opts.resourceType || parsed.resourceType || "image";
    }
  }

  if (!publicId) return {};

  const wanted = Array.isArray(opts.variants) && opts.variants.length
    ? opts.variants
    : Object.keys(VARIANT_TRANSFORMATIONS);

  const out = {};
  for (const name of wanted) {
    const transformation = VARIANT_TRANSFORMATIONS[name];
    if (!transformation) continue;
    out[name] = cloudinary.url(publicId, {
      type: deliveryType,
      resource_type: resourceType,
      sign_url: true,
      secure: true,
      expires_at: Math.floor(Date.now() / 1000) + 60 * 10, // 10 min — enough for OCR
      transformation,
    });
  }
  return out;
}

function listVariantNames() {
  return Object.keys(VARIANT_TRANSFORMATIONS);
}

module.exports = {
  buildVariantUrls,
  listVariantNames,
  parseCloudinaryUrl,
};

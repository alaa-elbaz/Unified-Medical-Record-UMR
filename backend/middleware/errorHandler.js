const multer = require("multer");

const isProduction = process.env.NODE_ENV === "production";

/**
 * Global error-handling middleware.
 * Must be registered AFTER all routes in server.js.
 *
 * Handles:
 *  - Multer file-upload errors
 *  - Mongoose CastError (invalid ObjectId)
 *  - Mongoose ValidationError
 *  - Mongoose duplicate-key (E11000)
 *  - JSON parse errors
 *  - JWT errors
 *  - Everything else (unknown)
 *
 * In production we never echo `err.message` directly because Mongoose error
 * messages contain internal field names and constraint details that should
 * not leak to clients. In development we keep the original message so the
 * developer console is useful.
 */
function errorHandler(err, req, res, next) {
  // Always log server-side for ops; do NOT include this in the response body.
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);

  let status = err.status || err.statusCode || 500;
  let message = "Internal Server Error";

  // Multer (file upload) errors
  if (err instanceof multer.MulterError) {
    status = 400;
    message = "File upload error";
  }
  // Mongoose CastError (invalid ObjectId, type mismatch)
  else if (err.name === "CastError") {
    status = 400;
    message = "Invalid request data";
  }
  // Mongoose validation errors
  else if (err.name === "ValidationError") {
    status = 400;
    message = "Validation failed";
  }
  // Mongoose duplicate-key
  else if (err.code === 11000) {
    status = 409;
    message = "Duplicate value";
  }
  // JSON body parser
  else if (err.type === "entity.parse.failed") {
    status = 400;
    message = "Invalid JSON payload";
  }
  // JWT errors
  else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    status = 401;
    message = "Invalid or expired token";
  }
  // Trusted error: explicit `err.expose === true` opts in to surfacing the
  // original message (used by route-level errors that intentionally craft
  // user-facing copy).
  else if (err.expose === true && err.message) {
    message = err.message;
  }
  // Default: keep generic message in production, real message in dev.
  else if (!isProduction && err.message) {
    message = err.message;
  }

  const body = { success: false, message };
  if (!isProduction && err.stack) body.stack = err.stack;
  res.status(status).json(body);
}

module.exports = errorHandler;

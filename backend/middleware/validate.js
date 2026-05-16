const { validationResult } = require("express-validator");

/**
 * Reusable validation middleware.
 * Place AFTER express-validator check chains in route definitions.
 * Returns 400 with standardized error shape on validation failure.
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg || "Validation error",
    });
  }

  next();
}

module.exports = validate;

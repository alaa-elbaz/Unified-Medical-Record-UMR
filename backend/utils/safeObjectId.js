const mongoose = require("mongoose");

/**
 * Check whether a string is a valid MongoDB ObjectId.
 * @param {string} id
 * @returns {boolean}
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
}

/**
 * Express middleware factory: validates that the named route param is a valid ObjectId.
 * Usage:  router.get('/:id', requireObjectId('id'), handler)
 *
 * @param {string} paramName - The name of the route parameter (default "id")
 */
function requireObjectId(paramName = "id") {
  return (req, res, next) => {
    const value = req.params[paramName];

    if (!value || !isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName}: "${value}" is not a valid ID`,
      });
    }

    next();
  };
}

module.exports = { isValidObjectId, requireObjectId };

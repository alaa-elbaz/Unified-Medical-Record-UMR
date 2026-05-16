// Compat shim: previously this file shipped its own nodemailer transport
// configured with `fake@ethereal.email` — sending real notifications into the
// void in production. Re-export the real service so any lingering imports
// behave identically to the canonical one in `services/emailService.js`.
module.exports = require("../services/emailService");

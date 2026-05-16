const fs = require('fs');
const path = 'backend/controllers/labController.js';
let text = fs.readFileSync(path, 'utf8');
const start = text.split(/exports\.getLabResults/)[0].split(/\r?\n/).length - 1;
const file = 'backend/controllers/labController.js';
const text = fs.readFileSync(file, 'utf8');
const pattern = /exports\\.getLabResults = async \\(req, res\\) =;/s;
const newFunctionLines = [

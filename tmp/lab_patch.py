from pathlib import Path
import re
path = Path('backend/controllers/labController.js')
text = path.read_text()
pattern = re.compile(r'exports\.getLabResults = async \(req, res\) => \{\n    try \{\n        const query = \{\};\n[\s\S]*?const labs = await LabResult\.find\(query\)\n            \.populate\(\'doctorId\', \'fullName specialty\'\)\n            \.sort\(\{ date: -1 }\);', re.MULTILINE)
replacement = '''exports.getLabResults = async (req, res) => {
    try {
        const query = {};
        const userRole = req.user?.role;
        const requestedPatient = req.query.patientId;

        if (userRole === 'patient') {
            query.patientId = req.user.userId;
        } else if (userRole === 'doctor') {
            if (requestedPatient) {
                query.patientId = requestedPatient;
            } else {
                query.doctorId = req.user.userId;
            }
        } else if (userRole === 'admin') {
            if (requestedPatient) {
                query.patientId = requestedPatient;
            }
        } else {
            return res.status(403).json({ message:  Forbidden });
        }

        const labs = await LabResult.find(query)
            .populate('doctorId', 'fullName specialty')
            .sort({ date: -1 });'''
new_text, count = pattern.subn(replacement, text, count=1)
if count != 1:
    raise SystemExit('pattern not found or matched multiple times')
path.write_text(new_text)

# MedCore (Unified Medical Record - UMR) - Deep Project Context

## 1. Project Vision & Business Logic
**MedCore** is a comprehensive, centralized digital healthcare platform for Egypt. It solves the critical problem of fragmented medical records. By assigning each patient a unique "Smart QR Code," the system allows authorized medical personnel to instantly access a unified medical history. This is particularly crucial for emergency life-saving interventions and eliminating redundant medical tests.

## 2. Technical Stack
- **Frontend (Web):** React.js (Vite), Tailwind CSS, Context API for state management.
- **Backend (API):** Node.js, Express.js.
- **Database:** MongoDB (via Mongoose), hosted on MongoDB Atlas.
- **Hosting/Deployment:** Vercel (Frontend), Render (Backend).
- **Security:** JWT Authentication, Role-Based Access Control (RBAC), bcrypt for passwords.

## 3. Database Schema & Models (`backend/models/`)
The database is highly relational (via ObjectIds). Here are the core models and their purposes:
1. **User.js:** The central authentication model. Contains fields for `email`, `password`, `role` (Admin, Patient, Doctor, Lab, Pharmacist), and personal details (National ID, Phone).
2. **MedicalRecord.js:** Tied to a specific Patient. Contains an array of chronic diseases, allergies, blood type, and references to previous visits/diagnoses.
3. **Prescription.js:** Created by a Doctor, assigned to a Patient. Contains an array of medications (name, dosage, frequency) and a boolean `isDispensed` (managed by Pharmacists).
4. **LabResult.js & Radiology.js:** Created by Lab/Radiology Techs. Tied to a Patient and the prescribing Doctor. Contains document/image URLs (uploaded via middleware) and textual reports.
5. **Appointment.js:** Manages scheduling between Patients and Doctors/Organizations.
6. **Organization.js:** Represents Hospitals, Clinics, or Labs. Users belong to Organizations.
7. **ActivityLog.js:** An audit trail model. Records every critical action (e.g., "Doctor X accessed Patient Y's record") for security and compliance.

## 4. Backend Architecture (`backend/`)
- **Controllers & Routes:** Separated by entity (`auth`, `admin`, `patient`, `doctor`, `lab`, `prescription`, `radiology`, `record`, `appointment`).
- **Middleware:** - `auth.js`: Verifies JWT tokens.
  - `role.js`: Ensures the user has the correct role (e.g., `authorize('Doctor', 'Admin')`).
  - `upload.js`: Handles file/image uploads (Multer).
  - `errorHandler.js`: Global error catching.
  - `validate.js`: Request payload validation.
- **Utils:** `activityLogger.js` (for logging events) and `safeObjectId.js` (to prevent DB crash on invalid IDs).

## 5. Frontend Architecture (`frontend/`)
- **Context (`src/context/`):** `AuthContext.jsx` manages the global user state, token storage, and role-based routing.
- **Services (`src/services/`):** `api.js` is the Axios instance with interceptors to attach the JWT token to every request.
- **Pages (`src/pages/`):** Dedicated dashboards for each role:
  - `AdminPage.jsx`: System management.
  - `DoctorPage.jsx`: View patient queue, scan QR, add diagnoses.
  - `PatientPage.jsx` & `PatientProfile.jsx`: View own history, generate QR code.
  - `LabPage.jsx` & `Labs.jsx`: Upload test results.
  - `HospitalPage.jsx`, `Medications.jsx`, `Consents.jsx`: Specialized data views.
- **Components (`src/components/`):** - `ui/`: Reusable Tailwind components (Button, Modal, Input, Table, Loader).
  - `modals/`: Feature-specific popups (`AddPrescriptionModal`, `AddLabResultModal`).
  - `layout/`: `DashboardLayout` for authenticated views, `MainLayout` for public views.

## 6. Core Workflows (How the system operates)
- **The Clinic Visit Flow:** Patient books an Appointment -> Doctor scans Patient's QR code -> System verifies consent/access -> Doctor views MedicalRecord -> Doctor creates a Diagnosis and a Prescription -> System logs the Activity.
- **The Pharmacy Flow:** Patient presents QR or Prescription ID -> Pharmacist scans it -> Pharmacist views the medication list -> Pharmacist clicks "Dispense" -> `isDispensed` becomes `true` (preventing reuse).
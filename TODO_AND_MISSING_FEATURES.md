# MedCore - Comprehensive TODO & Roadmap

This document outlines the exact features missing from the current codebase compared to the project's academic and business requirements (كتاب المشروع). The AI assistant should refer to this list when asked "What should we do next?".

## Phase 1: Completing the Web Workflows
### 1. The Pharmacist Module (Critical Missing Workflow)
- **Backend:** - Need a `pharmacistController` and `pharmacistRoutes`.
  - Endpoint to fetch a prescription by ID or Patient QR.
  - Endpoint to toggle `isDispensed` status in `Prescription.js`.
- **Frontend:**
  - Create a `PharmacistPage.jsx` dashboard.
  - Add QR Code scanner logic (using `react-qr-reader`) to scan a digital prescription.
  - UI button: "Mark as Dispensed" with a confirmation modal.

### 2. Emergency Access View (Zero-Auth Life-Saving Mode)
- **Logic:** Paramedics need to scan a patient's QR code without logging in, but they should only see critical data.
- **Backend:** Create a public/semi-public endpoint `/api/patients/emergency/:qrCodeId`. It must return ONLY: Blood Type, Allergies, Chronic Diseases, and Emergency Contact. It MUST NOT return past diagnoses, lab results, or psychiatric history.
- **Frontend:** Create an `EmergencyView.jsx` page to display this data clearly and quickly.

## Phase 2: AI & Smart Integrations
### 1. Medical AI Chatbot (Virtual Assistant)
- **Integration:** Embed an AI chatbot in the `PatientPage`.
- **Functionality:** - NLP-based symptom checking.
  - Requires connecting the backend to an LLM API (e.g., OpenAI API or Gemini API).
  - Backend must inject the patient's context (age, chronic diseases) into the system prompt securely without exposing PII (Personally Identifiable Information).

### 2. Computer Vision for Legacy Records
- **Integration:** Feature in `PatientProfile` or `LabPage` to "Upload Old Record".
- **Functionality:** Use an OCR service (Optical Character Recognition - like Tesseract.js or a Python microservice) to extract text from old uploaded paper lab results and save them as structured digital data.

### 3. Smart Notifications
- **Task:** Implement automated reminders for patients to take their medications.
- **Backend:** Setup `node-cron` to check active prescriptions and send notifications (via email, SMS, or web push notifications).

## Phase 3: The Mobile Application
- **Task:** Initialize a React Native project (using Expo or bare React Native).
- **Goal:** Share the existing Node.js API.
- **Features needed in Mobile:** - **Patient App:** Generate and display dynamic QR Code, Push Notifications for pills, Chatbot interface.
  - **Doctor App:** Mobile camera integration to scan Patient QR codes instantly in the clinic.

## Phase 4: Security & Audit Hardening
- **Task:** Review `ActivityLog.js` usage. Ensure EVERY `POST`, `PUT`, `DELETE` request across the system automatically creates an Activity Log entry with the `userId`, `action`, `ipAddress`, and `timestamp`.
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Load the Clinical Record Model (aliased for domain consistency)
const ClinicalRecord = require('./models/Prescription');

const app = express();
const PORT = process.env.PORT || 5000;

// Optimized CORS for clinical portal
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Global System Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishiv_clinic';

mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ System Online: Clinical Intelligence Database Connected'))
  .catch(err => console.error('❌ Database connection failure:', err));

// --- HELPER: Unified Response Format ---
const sendSuccess = (res, data, status = 200) => res.status(status).json({ success: true, ...data });
const sendError = (res, message, status = 500) => {
  console.error(`[ERR] ${new Date().toISOString()}: ${message}`);
  res.status(status).json({ success: false, message });
};

// --- PRODUCTION API ENDPOINTS ---

// GET: Single Record Archive
app.get('/api/get-record/:id', async (req, res) => {
  try {
    const record = await ClinicalRecord.findById(req.params.id).lean();
    if (!record) return sendError(res, "Clinical record not found in system archive.", 404);
    sendSuccess(res, record);
  } catch (err) {
    sendError(res, "Internal failure during archival retrieval.");
  }
});

// GET: Historical Audit Ledger (Filtering & Search)
app.get('/api/records', async (req, res) => {
  try {
    const { startDate, endDate, query } = req.query;
    let filter = {};

      filter.registrationDate = {
        $gte: new Date(startDate + "T00:00:00.000Z"),
        $lte: new Date(endDate + "T23:59:59.999Z")
      };

    if (query) {
      const searchRegex = new RegExp(query, 'i');
      filter.$or = [
        { 'patient.name': searchRegex },
        { 'patient.mobile': searchRegex }
      ];
      if (mongoose.Types.ObjectId.isValid(query)) {
        filter.$or.push({ _id: query });
      }
    }

    const records = await ClinicalRecord.find(filter).sort({ registrationDate: -1 });
    sendSuccess(res, { records });
  } catch (err) {
    sendError(res, "Clinical ledger synchronization failed.");
  }
});

// POST: Unified Clinical Data Persistence (Save/Update)
app.post('/api/save-record', async (req, res) => {
  try {
    const { id } = req.query;
    const recordData = req.body;

    if (!recordData.patient || !recordData.patient.name) {
      return sendError(res, "Incomplete Patient Identity Matrix.", 400);
    }

    let savedRecord;
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      savedRecord = await ClinicalRecord.findByIdAndUpdate(id, recordData, { new: true });
      if (!savedRecord) return sendError(res, "Target record purged or inaccessible.", 404);
    } else {
      savedRecord = new ClinicalRecord(recordData);
      await savedRecord.save();
    }

    sendSuccess(res, { id: savedRecord._id, message: "Clinical data successfully persisted." }, 201);
  } catch (err) {
    console.error("[SYS ERR] Record Save Failed:", err);
    sendError(res, "Sync protocol failure during data persistence.");
  }
});

// GET: Executive Analytics Summary
app.get('/api/admin/summary', async (req, res) => {
  try {
    const start = new Date(startDate + "T00:00:00.000Z");
    const end = new Date(endDate + "T23:59:59.999Z");

    const records = await ClinicalRecord.find({
      registrationDate: { $gte: start, $lte: end }
    });

    const summary = {
      totalBills: records.length,
      totalPayment: Math.round(records.reduce((sum, r) => sum + (r.billing?.totalPayable || 0), 0))
    };

    sendSuccess(res, summary);
  } catch (err) {
    sendError(res, "Analytics engine failed to compile dashboard statistics.");
  }
});

// DELETE: Permanent Security Purge
app.delete('/api/delete-record/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return sendError(res, "Invalid clinical record signature.", 400);
    }
    const result = await ClinicalRecord.findByIdAndDelete(req.params.id);
    if (!result) return sendError(res, "Record already purged from system.", 404);
    sendSuccess(res, { message: "Clinical record permanently expunged." });
  } catch (err) {
    sendError(res, "Secure deletion protocol failed.");
  }
});

// Server Initialization
app.listen(PORT, () => {
  console.log(`[SYS] Clinical Backend Active | PORT: ${PORT}`);
  console.log(`📡 Endpoints operational at http://127.0.0.1:${PORT}`);
});

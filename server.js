const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const ClinicalRecord = require("./models/Prescription.js");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- CORS ---------------- */

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* ---------------- LOGGER ---------------- */

app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/* ---------------- ROOT TEST ---------------- */

app.get("/", (req, res) => {
  res.send("✅ Krishiv Clinic Backend API Running");
});


/* ---------------- MONGODB ATLAS CONNECTION ---------------- */

mongoose.connect(
  "mongodb+srv://kukadiyabhargav5_db_user:hL62kjZF6BAqRNFK@clinic-db.7im2ye6.mongodb.net/clinic?retryWrites=true&w=majority"
)
  .then(() => {
    console.log("✅ MongoDB Atlas Connected");
  })
  .catch(err => {
    console.log("❌ MongoDB Connection Error:", err);
  });


/* ---------------- GET SINGLE RECORD ---------------- */

app.get("/api/get-record/:id", async (req, res) => {

  try {

    const record = await ClinicalRecord.findById(req.params.id);

    if (!record) {
      return res.json({
        success: false,
        message: "Record not found"
      });
    }

    // PERMANENT FIX
    if (!record.identity) {
      record.identity = {};
    }

    if (!record.identity.matrix) {
      record.identity.matrix = [];
    }

    res.json({
      success: true,
      ...record.toObject()
    });

  }
  catch (err) {

    console.log("GET RECORD ERROR:", err);

    res.json({
      success: false,
      message: "Failed to fetch record"
    });

  }

});


/* ---------------- GET RECORD LIST ---------------- */

app.get("/api/records", async (req, res) => {

  try {

    const { startDate, endDate, query } = req.query;

    let filter = {};

    if (startDate && endDate) {

      filter.registrationDate = {
        $gte: new Date(startDate + "T00:00:00.000+05:30"),
        $lte: new Date(endDate + "T23:59:59.999+05:30")
      };

    }

    if (query) {

      const regex = new RegExp(query, "i");

      filter.$or = [
        { "patient.name": regex },
        { "patient.mobile": regex }
      ];

    }

    const records = await ClinicalRecord
      .find(filter)
      .sort({ registrationDate: -1 });

    res.json({
      success: true,
      records
    });

  }
  catch (err) {

    console.log("RECORD FETCH ERROR:", err);

    res.json({
      success: false,
      message: "Failed to load records"
    });

  }

});


/* ---------------- SAVE RECORD ---------------- */

app.post("/api/save-record", async (req, res) => {

  try {

    const { id } = req.query;
    const recordData = req.body;

    if (!recordData.identity) {
      recordData.identity = {};
    }

    if (!recordData.identity.matrix) {
      recordData.identity.matrix = [];
    }

    if (!recordData.patient || !recordData.patient.name) {

      return res.json({
        success: false,
        message: "Patient name required"
      });

    }

    let savedRecord;

    if (id && mongoose.Types.ObjectId.isValid(id)) {

      savedRecord = await ClinicalRecord.findByIdAndUpdate(
        id,
        recordData,
        { new: true }
      );

    }
    else {

      savedRecord = new ClinicalRecord(recordData);
      await savedRecord.save();

    }

    res.json({
      success: true,
      id: savedRecord._id,
      message: "Record saved successfully"
    });

  }
  catch (err) {

    console.log("SAVE ERROR:", err);

    res.json({
      success: false,
      message: "Failed to save record"
    });

  }

});


/* ---------------- DELETE RECORD ---------------- */

app.delete("/api/delete-record/:id", async (req, res) => {

  try {

    const result = await ClinicalRecord.findByIdAndDelete(req.params.id);

    if (!result) {

      return res.json({
        success: false,
        message: "Record not found"
      });

    }

    res.json({
      success: true,
      message: "Record deleted"
    });

  }
  catch (err) {

    res.json({
      success: false,
      message: "Delete failed"
    });

  }

});


/* ---------------- SERVER START ---------------- */

app.listen(PORT, () => {
  console.log(`🚀 Server Running on PORT ${PORT}`);
});
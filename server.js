const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const ClinicalRecord = require("./models/Prescription");

const app = express();
const PORT = process.env.PORT || 5000;

/* ---------------- CORS ---------------- */
app.use(cors({
  origin: "*",
  methods: ["GET","POST","PUT","DELETE"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());

/* ---------------- LOGGER ---------------- */
app.use((req,res,next)=>{
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

/* ---------------- ROOT TEST ---------------- */
app.get("/",(req,res)=>{
  res.send("✅ Krishiv Clinic Backend API Running");
});

/* ---------------- MONGODB ---------------- */

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://127.0.0.1:27017/krishiv_clinic";

mongoose
  .connect(MONGODB_URI)
  .then(() =>
    console.log("✅ MongoDB Connected Successfully")
  )
  .catch(err =>
    console.error("❌ MongoDB Connection Error:", err)
  );

/* ---------------- HELPERS ---------------- */

const sendSuccess = (res,data,status=200)=>{
  res.status(status).json({success:true,...data});
};

const sendError = (res,message,status=500)=>{
  console.error("[ERROR]",message);
  res.status(status).json({success:false,message});
};

/* ---------------- GET RECORD ---------------- */

app.get("/api/get-record/:id", async (req,res)=>{
  try{

    const record = await ClinicalRecord
      .findById(req.params.id)
      .lean();

    if(!record){
      return sendError(res,"Record not found",404);
    }

    sendSuccess(res,{record});

  }catch(err){
    sendError(res,"Failed to fetch record");
  }
});

/* ---------------- GET RECORD LIST ---------------- */

app.get("/api/records", async (req,res)=>{
  try{

    const {startDate,endDate,query} = req.query;

    let filter = {};

    if(startDate && endDate){

      filter.registrationDate = {
        $gte:new Date(startDate+"T00:00:00.000Z"),
        $lte:new Date(endDate+"T23:59:59.999Z")
      };

    }

    if(query){

      const regex = new RegExp(query,"i");

      filter.$or = [
        {"patient.name":regex},
        {"patient.mobile":regex}
      ];

      if(mongoose.Types.ObjectId.isValid(query)){
        filter.$or.push({_id:query});
      }

    }

    const records = await ClinicalRecord
      .find(filter)
      .sort({registrationDate:-1});

    sendSuccess(res,{records});

  }catch(err){
    sendError(res,"Failed to load records");
  }
});

/* ---------------- SAVE RECORD ---------------- */

app.post("/api/save-record", async (req,res)=>{
  try{

    const {id} = req.query;
    const recordData = req.body;

    if(!recordData.patient || !recordData.patient.name){
      return sendError(res,"Patient name required",400);
    }

    let savedRecord;

    if(id && mongoose.Types.ObjectId.isValid(id)){

      savedRecord =
        await ClinicalRecord.findByIdAndUpdate(
          id,
          recordData,
          {new:true}
        );

      if(!savedRecord){
        return sendError(res,"Record not found",404);
      }

    }else{

      savedRecord = new ClinicalRecord(recordData);
      await savedRecord.save();

    }

    sendSuccess(
      res,
      {
        id:savedRecord._id,
        message:"Record saved successfully"
      },
      201
    );

  }catch(err){
    console.error(err);
    sendError(res,"Failed to save record");
  }
});

/* ---------------- ADMIN SUMMARY ---------------- */

app.get("/api/admin/summary", async (req,res)=>{
  try{

    const {startDate,endDate} = req.query;

    if(!startDate || !endDate){
      return sendError(res,"Date range required",400);
    }

    const start = new Date(startDate+"T00:00:00.000Z");
    const end = new Date(endDate+"T23:59:59.999Z");

    const records = await ClinicalRecord.find({
      registrationDate:{
        $gte:start,
        $lte:end
      }
    });

    const summary = {

      totalBills:records.length,

      totalPayment:Math.round(
        records.reduce(
          (sum,r)=>sum+(r.billing?.totalPayable || 0),
          0
        )
      )

    };

    sendSuccess(res,summary);

  }catch(err){
    sendError(res,"Summary calculation failed");
  }
});

/* ---------------- DELETE RECORD ---------------- */

app.delete("/api/delete-record/:id", async (req,res)=>{
  try{

    if(!mongoose.Types.ObjectId.isValid(req.params.id)){
      return sendError(res,"Invalid ID",400);
    }

    const result =
      await ClinicalRecord.findByIdAndDelete(
        req.params.id
      );

    if(!result){
      return sendError(res,"Record not found",404);
    }

    sendSuccess(res,{
      message:"Record deleted successfully"
    });

  }catch(err){
    sendError(res,"Delete failed");
  }
});

/* ---------------- SERVER START ---------------- */

app.listen(PORT,()=>{
  console.log(`🚀 Server Running on PORT ${PORT}`);
});
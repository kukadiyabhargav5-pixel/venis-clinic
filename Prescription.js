const mongoose = require('mongoose');

const PrescriptionSchema = new mongoose.Schema({
  patient: {
    name: { type: String, required: true },
    mobile: { type: String, default: "" },
    age: { type: Number, default: 0 },
    gender: { type: String, default: "" }
  },
  medicines: [{
    name: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    unit: { type: Number, required: true },
    quantity: { type: Number, required: true },
    finalItemPrice: { type: Number, required: true }
  }],
  billing: {
    consultationFee: { type: Number, default: 0 },
    itemsTotal: { type: Number, default: 0 },
    discount: { type: String, default: '0' },
    discountValue: { type: Number, default: 0 },
    totalPayable: { type: Number, required: true }
  },
  registrationDate: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Prescription', PrescriptionSchema);

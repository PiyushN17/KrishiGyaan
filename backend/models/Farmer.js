const mongoose = require("mongoose");

const farmerSchema = new mongoose.Schema({

  personal: {
    fullName: { type: String, required: true },
    mobileNumber: { type: String, required: true, unique: true },
    age: Number,
    gender: String,
    state: String,
    district: String,
    village: String,
    preferredLanguage: String
  },

  farm: {
    landSize: String,
    landOwnership: String,
    soilType: String,
    irrigationSource: String,
    location: {
      latitude: Number,
      longitude: Number
    }
  },

  crop: {
    primaryCrops: [String],
    season: String,
    sowingDate: Date,
    fertilizersUsed: [String],
    recentProblem: String,
    expectedHarvest: Date
  },

  access: {
    aadhaarLast4: String,
    bankLinked: String,
    pmKisanStatus: String,
    internetAccess: String
  },

  consent: {
    agreed: { type: Boolean, default: true }
  }

}, { timestamps: true });

module.exports = mongoose.model("Farmer", farmerSchema);
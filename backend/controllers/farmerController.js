const Farmer = require("../models/Farmer");

// CREATE farmer (clean normalization layer)
exports.registerFarmer = async (req, res) => {
  try {
    console.log("🔥 Incoming body:", req.body);

    const data = req.body;

    // ================= FARM NORMALIZATION =================
    if (data.farm) {
      data.farm.landOwnership =
        data.farm.landOwnership || data.farm.ownership;

      data.farm.irrigationSource =
        data.farm.irrigationSource || data.farm.irrigation;
    }

    // ================= CROP NORMALIZATION =================
    if (data.crop) {
      data.crop.fertilizersUsed =
        data.crop.fertilizersUsed ||
        (data.crop.fertilizer ? [data.crop.fertilizer] : []);

      data.crop.recentProblem =
        data.crop.recentProblem || data.crop.problem;

      data.crop.expectedHarvest =
        data.crop.expectedHarvest || data.crop.harvest;
    }

    // ================= SAVE =================
    const farmer = new Farmer(data);
    const savedFarmer = await farmer.save();

    console.log("✅ Saved Farmer ID:", savedFarmer._id);

    return res.status(201).json({
      message: "Farmer registered successfully 🌱",
      data: savedFarmer
    });

  } catch (error) {
    console.error("❌ Register Error:", error.message);

    return res.status(500).json({
      message: "Error saving farmer",
      error: error.message
    });
  }
};

// GET all farmers
exports.getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find();

    return res.status(200).json({
      count: farmers.length,
      data: farmers
    });

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};
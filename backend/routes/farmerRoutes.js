const Farmer = require("../models/Farmer");

const registerFarmer = async (req, res) => {
  try {
    console.log("🔥 Incoming body:", req.body);

    const farmer = new Farmer(req.body);
    const savedFarmer = await farmer.save();

    console.log("✅ Saved:", savedFarmer._id);

    return res.status(201).json({
      message: "Farmer registered successfully",
      data: savedFarmer
    });

  } catch (error) {
    console.error("❌ Register Error:", error.message);

    return res.status(500).json({
      error: error.message
    });
  }
};

const getFarmers = async (req, res) => {
  const farmers = await Farmer.find();
  res.json(farmers);
};

module.exports = {
  registerFarmer,
  getFarmers
};
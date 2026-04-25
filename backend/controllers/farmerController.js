const Farmer = require("../models/Farmer");

// CREATE farmer
exports.registerFarmer = async (req, res) => {
  try {
    const farmer = new Farmer(req.body);
    await farmer.save();
    res.status(201).json({
      message: "Farmer registered successfully 🌱",
      data: farmer
    });
  } catch (error) {
    res.status(500).json({
      message: "Error saving farmer",
      error: error.message
    });
  }
};

// GET all farmers
exports.getFarmers = async (req, res) => {
  try {
    const farmers = await Farmer.find();
    res.json(farmers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
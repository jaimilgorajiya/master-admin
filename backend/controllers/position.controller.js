import Position from "../models/position.model.js";

// CREATE
export const createPosition = async (req, res) => {
  try {
    const { name, departmentId } = req.body;
    if (!name || !departmentId) {
      return res.status(400).json({ success: false, message: "Name and Department are required" });
    }

    const existingPosition = await Position.findOne({ name, departmentId });
    if (existingPosition) {
      return res.status(400).json({ success: false, message: "Position already exists in this department" });
    }

    const position = await Position.create({ name, departmentId });
    const populatedPosition = await Position.findById(position._id).populate("departmentId", "name");
    
    return res.status(201).json({ success: true, message: "Position created successfully", position: populatedPosition });
  } catch (error) {
    console.error("Create position error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL
export const getAllPositions = async (req, res) => {
  try {
    // Optionally filter by department
    const { departmentId } = req.query;
    const query = departmentId ? { departmentId } : {};

    const positions = await Position.find(query).populate("departmentId", "name").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, positions });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
export const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId } = req.body;

    const position = await Position.findByIdAndUpdate(
      id,
      { name, departmentId },
      { new: true, runValidators: true }
    ).populate("departmentId", "name");

    if (!position) {
      return res.status(404).json({ success: false, message: "Position not found" });
    }

    return res.status(200).json({ success: true, message: "Position updated successfully", position });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Position already exists in this department" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// TOGGLE STATUS
export const togglePositionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const position = await Position.findById(id);

    if (!position) {
      return res.status(404).json({ success: false, message: "Position not found" });
    }

    position.isActive = !position.isActive;
    await position.save();

    return res.status(200).json({ success: true, message: "Position status updated", position });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE
export const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const position = await Position.findByIdAndDelete(id);
    if (!position) {
      return res.status(404).json({ success: false, message: "Position not found" });
    }
    return res.status(200).json({ success: true, message: "Position deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

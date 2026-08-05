import Department from "../models/department.model.js";

// CREATE
export const createDepartment = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: "Department name is required" });
    }

    const existingDepartment = await Department.findOne({ name });
    if (existingDepartment) {
      return res.status(400).json({ success: false, message: "Department already exists" });
    }

    const department = await Department.create({ name });
    return res.status(201).json({ success: true, message: "Department created successfully", department });
  } catch (error) {
    console.error("Create department error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// GET ALL
export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.find().sort({ createdAt: -1 });
    return res.status(200).json({ success: true, departments });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// UPDATE
export const updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const department = await Department.findByIdAndUpdate(
      id,
      { name },
      { new: true, runValidators: true }
    );

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    return res.status(200).json({ success: true, message: "Department updated successfully", department });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Department name must be unique" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// TOGGLE STATUS
export const toggleDepartmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }

    department.isActive = !department.isActive;
    await department.save();

    return res.status(200).json({ success: true, message: "Department status updated", department });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// DELETE
export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    // Check if used in any position or staff (optional but good practice)
    // For now, simple delete
    const department = await Department.findByIdAndDelete(id);
    if (!department) {
      return res.status(404).json({ success: false, message: "Department not found" });
    }
    return res.status(200).json({ success: true, message: "Department deleted successfully" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

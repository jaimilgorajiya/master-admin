import Software from "../models/software.model.js";
import { emitEvent } from "../socket/socketHandler.js";

// ✅ Create Software
export const createSoftware = async (req, res) => {
  try {
    const {
      name, description,
      clientsGetApi, packagePostApi, packagePutApi, packageDeleteApi, packageGetApi,
      clientSignupApi, clientToggleStatusApi, clientDeleteApi, clientPackageAssignApi, clientSignupFields
    } = req.body;

    if (!name || !clientsGetApi || !packagePostApi || !packagePutApi || !packageDeleteApi || !packageGetApi) {
      return res.status(400).json({ success: false, message: "All required fields must be filled" });
    }

    const newSoftware = await Software.create({
      name, description,
      clientsGetApi, packagePostApi, packagePutApi, packageDeleteApi, packageGetApi,
      clientSignupApi, clientToggleStatusApi, clientDeleteApi, clientPackageAssignApi,
      clientSignupFields: clientSignupFields || []
    });

    emitEvent("software_data_change", { action: "create", id: newSoftware._id });

    return res.status(201).json({
      success: true,
      message: "Software added successfully",
      software: newSoftware
    });
  } catch (error) {
    console.error("Create software error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get All Softwares
export const getSoftwares = async (req, res) => {
  try {
    const softwares = await Software.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      softwares
    });
  } catch (error) {
    console.error("Get softwares error:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};

// ✅ Update Software
export const updateSoftware = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedSoftware = await Software.findByIdAndUpdate(id, updateData, { new: true });

    if (!updatedSoftware) {
      return res.status(404).json({ success: false, message: "Software not found" });
    }

    emitEvent("software_data_change", { action: "update", id: updatedSoftware._id });

    return res.status(200).json({
      success: true,
      message: "Software updated successfully",
      software: updatedSoftware
    });
  } catch (error) {
    console.error("Update software error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete Software
export const deleteSoftware = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedSoftware = await Software.findByIdAndDelete(id);

    if (!deletedSoftware) {
      return res.status(404).json({ success: false, message: "Software not found" });
    }

    emitEvent("software_data_change", { action: "delete", id });

    return res.status(200).json({
      success: true,
      message: "Software deleted successfully"
    });
  } catch (error) {
    console.error("Delete software error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Toggle Status
export const toggleSoftwareStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ID format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      console.warn(`[Software] Invalid ID format provided: ${id}`);
      return res.status(400).json({ success: false, message: "Invalid ID format" });
    }

    const software = await Software.findById(id);

    if (!software) {
      return res.status(404).json({ success: false, message: "Software not found" });
    }

    software.isActive = !software.isActive;
    await software.save();

    try {
      emitEvent("software_data_change", { action: "toggle_status", id: software._id });
    } catch (socketError) {
      console.error("[Software] Error emitting socket event:", socketError);
    }

    return res.status(200).json({
      success: true,
      message: `Software ${software.isActive ? 'activated' : 'deactivated'} successfully`,
      software
    });
  } catch (error) {
    console.error("[Software] Toggle status critical error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal server error during status toggle" });
  }
};

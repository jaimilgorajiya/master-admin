import Service from "../models/service.model.js";
import { emitEvent } from "../socket/socketHandler.js";

// ✅ CREATE SERVICE
export const createService = async (req, res) => {
  try {
    const { name, description, price, duration, durationUnit } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Service name is required" });
    }

    const newService = await Service.create({
      name,
      description,
      price: price || 0,
      duration: duration || 1,
      durationUnit: durationUnit || 'months'
    });

    emitEvent("service_data_change", { action: "create", id: newService._id });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      service: newService,
    });
  } catch (error) {
    console.error("Create service error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ GET ALL SERVICES
export const getAllServices = async (req, res) => {
  try {
    const services = await Service.find().sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      services,
    });
  } catch (error) {
    console.error("Get services error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ UPDATE SERVICE
export const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, duration, durationUnit } = req.body;

    const updatedService = await Service.findByIdAndUpdate(
      id,
      { name, description, price, duration, durationUnit },
      { new: true }
    );

    if (!updatedService) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    emitEvent("service_data_change", { action: "update", id: updatedService._id });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service: updatedService,
    });
  } catch (error) {
    console.error("Update service error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ TOGGLE SERVICE STATUS
export const toggleServiceStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id);

    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    service.isActive = !service.isActive;
    await service.save();

    emitEvent("service_data_change", { action: "toggle_status", id: service._id });

    return res.status(200).json({
      success: true,
      message: `Service ${service.isActive ? "activated" : "deactivated"} successfully`,
      service,
    });
  } catch (error) {
    console.error("Toggle service status error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ DELETE SERVICE
export const deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedService = await Service.findByIdAndDelete(id);

    if (!deletedService) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }

    emitEvent("service_data_change", { action: "delete", id });

    return res.status(200).json({
      success: true,
      message: "Service deleted successfully",
    });
  } catch (error) {
    console.error("Delete service error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

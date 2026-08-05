import Package from "../models/package.model.js";
import { emitEvent } from "../socket/socketHandler.js";

// ✅ Create a new package
export const createPackage = async (req, res) => {
  try {
    const { name, serviceIds, softwareId, packageType, durationDays, price, description, unit } = req.body;

    const type = packageType || 'service';

    if (!name || !durationDays || !price) {
      return res.status(400).json({ success: false, message: "Name, duration, and price are required" });
    }

    if (type === 'service' && (!serviceIds || serviceIds.length === 0)) {
         return res.status(400).json({ success: false, message: "At least one service is required" });
    }
    
    if (type === 'software' && !softwareId) {
         return res.status(400).json({ success: false, message: "Software is required for software packages" });
    }

    const newPackage = await Package.create({
      name,
      packageType: type,
      serviceIds: serviceIds || [],
      softwareId: type === 'software' ? softwareId : undefined,
      durationDays,
      unit: unit || 'days',
      price,
      description,
    });

    emitEvent("package_data_change", { action: "create", id: newPackage._id });

    return res.status(201).json({
      success: true,
      message: "Package created successfully",
      package: newPackage,
    });
  } catch (error) {
    console.error("Create package error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all packages (Admin View - shows both active and inactive)
export const getPackages = async (req, res) => {
  try {
    const query = {}; // Show ALL packages (active & inactive)
    
    const packages = await Package.find(query)
        .populate("serviceIds", "name")
        .populate("softwareId", "name");
    
    return res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error("Get packages error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Delete/Deactivate package
export const deletePackage = async (req, res) => {
    try {
        const { id } = req.params;
        await Package.findByIdAndDelete(id);
        
        emitEvent("package_data_change", { action: "delete", id });

        return res.status(200).json({ success: true, message: "Package deleted successfully" });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Server error" });
    }
}

// ✅ Toggle Package Status
export const togglePackageStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const pkg = await Package.findById(id);
        
        if (!pkg) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        pkg.isActive = !pkg.isActive;
        await pkg.save();
        
        emitEvent("package_data_change", { action: "toggle_status", id: pkg._id });

        return res.status(200).json({ 
            success: true, 
            message: `Package ${pkg.isActive ? 'activated' : 'deactivated'} successfully` 
        });
    } catch (error) {
        console.error("Toggle status error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// ✅ Update Package
export const updatePackage = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, serviceIds, softwareId, packageType, durationDays, price, description, unit } = req.body;
        
        const type = packageType || 'service';

        if (type === 'service' && (!serviceIds || serviceIds.length === 0)) {
             return res.status(400).json({ success: false, message: "At least one service is required" });
        }

        if (type === 'software' && !softwareId) {
             return res.status(400).json({ success: false, message: "Software is required for software packages" });
        }

        const updatedPackage = await Package.findByIdAndUpdate(
            id,
            { 
                name, 
                packageType: type,
                serviceIds: serviceIds || [],
                softwareId: type === 'software' ? softwareId : undefined,
                durationDays, 
                unit, 
                price, 
                description 
            },
            { new: true }
        );

        if (!updatedPackage) {
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        emitEvent("package_data_change", { action: "update", id: updatedPackage._id });

        return res.status(200).json({
            success: true,
            message: "Package updated successfully",
            package: updatedPackage
        });
    } catch (error) {
        console.error("Update package error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

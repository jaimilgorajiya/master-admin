import Software from "../models/software.model.js";
import { softwareRegistry } from "./softwareRegistry.js";

export const seedSoftwareRegistry = async () => {
  try {
    console.log("[Seeder] Syncing software registry to database...");
    for (const sw of softwareRegistry) {
      await Software.findOneAndUpdate(
        { _id: sw._id },
        {
          name: sw.name,
          description: sw.description,
          clientsGetApi: sw.clientsGetApi,
          packagePostApi: sw.packagePostApi,
          packagePutApi: sw.packagePutApi,
          packageDeleteApi: sw.packageDeleteApi,
          packageGetApi: sw.packageGetApi,
          clientSignupApi: sw.clientSignupApi,
          clientToggleStatusApi: sw.clientToggleStatusApi,
          clientDeleteApi: sw.clientDeleteApi,
          clientSignupFields: sw.clientSignupFields,
          isActive: sw.isActive
        },
        { upsert: true, new: true }
      );
    }
    console.log("✅ [Seeder] Software registry synced to database successfully.");
  } catch (error) {
    console.error("❌ [Seeder] Error syncing software registry to database:", error);
  }
};

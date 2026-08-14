import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import Package from "./models/package.model.js";
import Software from "./models/software.model.js";

async function check() {
  await connectDB();
  
  const softwares = await Software.find({});
  console.log("=== All Softwares in DB ===");
  console.log(softwares.map(s => ({ _id: s._id, name: s.name, key: s.key })));

  const packages = await Package.find({});
  console.log("\n=== All Packages in DB ===");
  console.log(packages.map(p => ({ _id: p._id, name: p.name, softwareId: p.softwareId })));

  process.exit(0);
}

check();

import dotenv from "dotenv";
dotenv.config();

import connectDB from "./config/db.js";
import SoftwareClient from "./models/softwareClient.model.js";
import fs from "fs";

async function inspectClient() {
  await connectDB();

  const id = "6a7c3dd2ed835dd0306d6bb2";
  const client = await SoftwareClient.findById(id).populate("softwareId");

  console.log("Client Record:");
  console.log(JSON.stringify(client, null, 2));
  process.exit(0);
}

inspectClient();

import mongoose from "mongoose";

const signupFieldSchema = new mongoose.Schema({
  fieldName:   { type: String },
  label:       { type: String },
  type:        { type: String, enum: ['text','email','password','number','tel','select','textarea'] },
  required:    { type: Boolean, default: false },
  options:     [{ type: String }],
  placeholder: { type: String }
}, { _id: false });

const softwareSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  clientsGetApi: {
    type: String,
    required: true,
    trim: true
  },
  packagePostApi: {
    type: String,
    required: true,
    trim: true
  },
  packagePutApi: {
    type: String,
    required: true,
    trim: true
  },
  packageDeleteApi: {
    type: String,
    required: true,
    trim: true
  },
  packageGetApi: {
    type: String,
    required: true,
    trim: true
  },
  // New: client registration endpoint on the external software
  clientSignupApi: {
    type: String,
    trim: true
  },
  // New: PATCH endpoint to activate/deactivate a client on the external software (:id = externalClientId)
  clientToggleStatusApi: {
    type: String,
    trim: true
  },
  // New: DELETE endpoint to remove a client from the external software
  clientDeleteApi: {
    type: String,
    trim: true
  },
  // New: extra software-specific fields shown during client signup
  clientSignupFields: [signupFieldSchema],
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

const Software = mongoose.model("Software", softwareSchema);
export default Software;

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "faculty", "student"] },
  department: String,
  semester: Number,
  section: String,
  batch: { type: String, enum: ["Batch-1", "Batch-2"], default: null },
});

export default mongoose.model("User", userSchema);

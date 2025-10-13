import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ["admin", "faculty", "student"] },
  department: String,
  semester: Number,
  section: String
});

export default mongoose.model("User", userSchema);

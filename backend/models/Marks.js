import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  labAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "LabAssignment" },
  date: Date,  // This represents the specific week/lab session date
  marks: Number,  // Single marks value for that week
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, {
  timestamps: true
});

export default mongoose.model("Marks", marksSchema);
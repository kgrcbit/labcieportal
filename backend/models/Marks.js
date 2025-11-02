import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  labAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "LabAssignment" },
  weeklyMarks: [
    {
      date: Date,
      marks: { type: Number, default: null }
    }
  ],
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Marks", marksSchema);
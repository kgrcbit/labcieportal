import mongoose from "mongoose";

const marksSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  labAssignmentId: { type: mongoose.Schema.Types.ObjectId, ref: "LabAssignment" },
  weeklyMarks: [
    {
      date: Date,
      marks: { type: Number, default: null }, // Keep for backward compatibility
      Pr: { type: Number, default: null }, // Preparation (5 marks)
      PE: { type: Number, default: null }, // Program Execution (5 marks)
      P: { type: Number, default: null }, // Viva/Questions (10 marks)
      R: { type: Number, default: null }, // Record/Notes (5 marks)
      C: { type: Number, default: null }, // Class regularity/Copy check (5 marks)
      T: { type: Number, default: null } // Total (30 marks) - auto calculated
    }
  ],
  enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
}, { timestamps: true });

export default mongoose.model("Marks", marksSchema);
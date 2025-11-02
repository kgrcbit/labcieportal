import mongoose from "mongoose";

const labAssignmentSchema = new mongoose.Schema({
  labId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Lab",
    required: true
  },
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  section: {
    type: String,
    required: true
  },
  batch: {
    type: String,
    default: "All"
  },
  academicYear: {
    type: String, // "2025-26"
    required: true
  },
  semesterType: {
    type: String, // "Odd" or "Even"
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  dayOfWeek: {
    type: String, // "Monday", "Tuesday", etc.
    required: true
  },
  generatedDates: {
    type: [Date],
    default: []
  }
});

export default mongoose.model("LabAssignment", labAssignmentSchema);

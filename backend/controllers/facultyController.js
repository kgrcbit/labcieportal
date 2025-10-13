import LabAssignment from "../models/LabAssignment.js";
import Marks from "../models/Marks.js";
import User from "../models/User.js";

// Get assigned labs for faculty
export const getAssignedLabs = async (req, res) => {
  try {
    const assignments = await LabAssignment.find({ facultyId: req.user._id })
      .populate("labId");
    res.json({ labs: assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get students by lab assignment
export const getStudentsByLab = async (req, res) => {
  try {
    const { labId } = req.params;
    const { section } = req.query;
    
    const assignment = await LabAssignment.findById(labId).populate("labId");
    if (!assignment) {
      return res.status(404).json({ message: "Lab assignment not found" });
    }
    
    const students = await User.find({ 
      role: "student", 
      section: section || assignment.section,
      semester: assignment.labId.semester 
    });
    
    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Enter marks for students
export const enterMarks = async (req, res) => {
  try {
    const { labAssignmentId, date, marks } = req.body; // marks is array of {studentId, marks}
    
    const assignment = await LabAssignment.findById(labAssignmentId);
    if (!assignment) {
      return res.status(404).json({ message: "Lab assignment not found" });
    }

    // First, delete existing marks for this lab assignment and date to avoid duplicates
 
    // Create marks records for each student
    const marksRecords = marks.map(mark => ({
      studentId: mark.studentId,
      labAssignmentId,
      date: new Date(date),
      marks: mark.marks || null,
      enteredBy: req.user._id
    }));
    
    const createdMarks = await Marks.insertMany(marksRecords);
    res.status(201).json({
      message: "Marks entered successfully",
      marks: createdMarks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get marks history for a lab
export const getMarksHistory = async (req, res) => {
  try {
    const { labAssignmentId } = req.params;
    
    const marks = await Marks.find({ labAssignmentId })
      .populate("studentId", "name username")
      .sort({ date: 1 }); // Sort by date ascending for proper week order
    
    res.json({ marks });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
import Marks from "../models/Marks.js";
import LabAssignment from "../models/LabAssignment.js";
import User from "../models/User.js";

// Get student marks grouped by lab
export const getStudentMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ studentId: req.user._id })
      .populate({
        path: "labAssignmentId",
        populate: [
          { path: "labId" },
          { path: "facultyId", select: "name" }
        ]
      })
      .populate("enteredBy", "name");
    
    // Group marks by lab
    const groupedMarks = {};
    marks.forEach(mark => {
      const labId = mark.labAssignmentId.labId._id;
      const labName = mark.labAssignmentId.labId.labName;
      const facultyName = mark.labAssignmentId.facultyId?.name || "TBD";
      const dayOfWeek = mark.labAssignmentId.dayOfWeek || "TBD";
      
      if (!groupedMarks[labId]) {
        groupedMarks[labId] = {
          labId: labId,
          labName: labName,
          faculty: facultyName,
          dayOfWeek: dayOfWeek,
          sessions: []
        };
      }
      
      // Process weeklyMarks array
      mark.weeklyMarks.forEach(weeklyMark => {
        groupedMarks[labId].sessions.push({
          date: weeklyMark.date,
          marks: weeklyMark.marks,
          enteredBy: mark.enteredBy ? mark.enteredBy.name : "Unknown"
        });
      });
    });
    
    // Sort sessions by date for each lab
    Object.values(groupedMarks).forEach(lab => {
      lab.sessions.sort((a, b) => new Date(a.date) - new Date(b.date));
    });
    
    res.json({ labs: Object.values(groupedMarks) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get student profile
export const getStudentProfile = async (req, res) => {
  try {
    const student = await User.findById(req.user._id).select("-password");
    res.json({ student });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
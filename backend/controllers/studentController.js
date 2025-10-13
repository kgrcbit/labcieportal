import Marks from "../models/Marks.js";
import LabAssignment from "../models/LabAssignment.js";

// Get student marks grouped by lab
export const getStudentMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ studentId: req.user._id })
      .populate({
        path: "labAssignmentId",
        populate: { path: "labId" }
      })
      .populate("enteredBy", "name")
      .sort({ date: -1 });
    
    // Group marks by lab
    const groupedMarks = {};
    marks.forEach(mark => {
      const labId = mark.labAssignmentId.labId._id;
      const labName = mark.labAssignmentId.labId.labName;
      
      if (!groupedMarks[labId]) {
        groupedMarks[labId] = {
          labId: labId,
          labName: labName,
          sessions: []
        };
      }
      
      groupedMarks[labId].sessions.push({
        date: mark.date,
        marks: mark.marks,
        enteredBy: mark.enteredBy.name
      });
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
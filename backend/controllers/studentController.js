import Marks from "../models/Marks.js";
import LabAssignment from "../models/LabAssignment.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";

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

// Update password
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Verify current password
    const isValid = user.password.startsWith("$2b$")
      ? await bcrypt.compare(currentPassword, user.password)
      : currentPassword === user.password;

    if (!isValid) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
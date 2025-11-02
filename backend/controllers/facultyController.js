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
    const { labAssignmentId, date, marks } = req.body; // marks = [{ studentId, marks }]
    const entryDate = new Date(date);

    for (const mark of marks) {
      const { studentId, marks: obtained } = mark;

      // find existing marks record for this student & lab
      let record = await Marks.findOne({ studentId, labAssignmentId });

      if (!record) {
        // create new record with first week
        record = new Marks({
          studentId,
          labAssignmentId,
          weeklyMarks: [{ date: entryDate, marks: obtained }],
          enteredBy: req.user._id
        });
        await record.save();
      } else {
        // check if week already exists
        const existingWeek = record.weeklyMarks.find(w => 
          w.date.toISOString().slice(0,10) === entryDate.toISOString().slice(0,10)
        );

        if (existingWeek) {
          // update that week’s marks
          existingWeek.marks = obtained;
        } else {
          // push new week
          record.weeklyMarks.push({ date: entryDate, marks: obtained });
        }

        await record.save();
      }
    }

    res.status(200).json({ message: "Marks updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// Get marks history for a lab
// Get marks history for a lab
export const getMarksHistory = async (req, res) => {
  try {
    // Route is defined as /labs/:labId/marks where :labId is the LabAssignment _id
    const { labId } = req.params;
    const labAssignmentId = labId;

    // Fetch all student-lab mark documents
    const marksDocs = await Marks.find({ labAssignmentId })
      .populate("studentId", "name username")
      .lean();

    // Flatten weeklyMarks array into individual records
    const flattened = [];

    marksDocs.forEach(doc => {
      doc.weeklyMarks.forEach(week => {
        flattened.push({
          studentId: doc.studentId._id,
          student: {
            name: doc.studentId.name,
            username: doc.studentId.username
          },
          date: week.date,
          marks: week.marks
        });
      });
    });

    // Sort by date ascending
    flattened.sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({ marks: flattened });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
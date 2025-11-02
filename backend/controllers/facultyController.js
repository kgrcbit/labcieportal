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

export const getStudentsByLab = async (req, res) => {
  try {
    const { labId } = req.params;
    const { section, batch } = req.query;

    const assignment = await LabAssignment.findById(labId).populate("labId");
    if (!assignment) {
      return res.status(404).json({ message: "Lab assignment not found" });
    }

    // base query
    const query = {
      role: "student",
      section: section || assignment.section,
      semester: assignment.labId.semester,
    };

    // apply batch if provided or if assignment has batch
    if (batch && batch !== "All") {
      query.batch = batch;
    } else if (assignment.batch && assignment.batch !== "All") {
      query.batch = assignment.batch;
    }

    const students = await User.find(query).sort({ username: 1 });

    res.json({ students });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Enter marks for students
export const enterMarks = async (req, res) => {
  try {
    const { labAssignmentId, date, marks } = req.body; // marks = [{ studentId, Pr, PE, P, R, C, T }]
    const entryDate = new Date(date);

    for (const mark of marks) {
      const { studentId, Pr, PE, P, R, C, T } = mark;

      // Calculate total if individual marks are provided
      const calculatedTotal = (Pr !== null && Pr !== undefined ? Number(Pr) : 0) +
                              (PE !== null && PE !== undefined ? Number(PE) : 0) +
                              (P !== null && P !== undefined ? Number(P) : 0) +
                              (R !== null && R !== undefined ? Number(R) : 0) +
                              (C !== null && C !== undefined ? Number(C) : 0);
      
      const finalTotal = T !== null && T !== undefined ? Number(T) : calculatedTotal;

      // find existing marks record for this student & lab
      let record = await Marks.findOne({ studentId, labAssignmentId });

      const weekData = {
        date: entryDate,
        Pr: Pr !== null && Pr !== undefined ? Number(Pr) : null,
        PE: PE !== null && PE !== undefined ? Number(PE) : null,
        P: P !== null && P !== undefined ? Number(P) : null,
        R: R !== null && R !== undefined ? Number(R) : null,
        C: C !== null && C !== undefined ? Number(C) : null,
        T: finalTotal,
        marks: finalTotal // Keep for backward compatibility
      };

      if (!record) {
        // create new record with first week
        record = new Marks({
          studentId,
          labAssignmentId,
          weeklyMarks: [weekData],
          enteredBy: req.user._id
        });
        await record.save();
      } else {
        // check if week already exists
        const existingWeek = record.weeklyMarks.find(w => 
          w.date.toISOString().slice(0,10) === entryDate.toISOString().slice(0,10)
        );

        if (existingWeek) {
          // update that week's marks
          existingWeek.Pr = weekData.Pr;
          existingWeek.PE = weekData.PE;
          existingWeek.P = weekData.P;
          existingWeek.R = weekData.R;
          existingWeek.C = weekData.C;
          existingWeek.T = weekData.T;
          existingWeek.marks = weekData.marks; // Keep for backward compatibility
        } else {
          // push new week
          record.weeklyMarks.push(weekData);
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
          marks: week.marks || week.T, // Backward compatibility
          Pr: week.Pr !== null && week.Pr !== undefined ? week.Pr : null,
          PE: week.PE !== null && week.PE !== undefined ? week.PE : null,
          P: week.P !== null && week.P !== undefined ? week.P : null,
          R: week.R !== null && week.R !== undefined ? week.R : null,
          C: week.C !== null && week.C !== undefined ? week.C : null,
          T: week.T !== null && week.T !== undefined ? week.T : (week.marks || null)
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
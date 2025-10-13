import User from "../models/User.js";
import Lab from "../models/Lab.js";
import LabAssignment from "../models/LabAssignment.js";
import bcrypt from "bcryptjs";

// Helper to generate lab dates
const generateDates = (startDate, endDate, dayOfWeek) => {
  const dayIndex = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(dayOfWeek);
  let current = new Date(startDate);
  const dates = [];

  while (current <= new Date(endDate)) {
    if (current.getDay() === dayIndex) dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

// Add student or faculty
export const addUser = async (req, res) => {
  try {
    const { name, username, password, role, department, semester, section } = req.body;

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name,
      username,
      password: hash,
      role,
      department,
      semester,
      section
    });

    res.status(201).json({
      message: `${role} added successfully`,
      user: newUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Add lab
export const addLab = async (req, res) => {
  try {
    const { labCode, labName, semester, department } = req.body;
    const newLab = await Lab.create({ labCode, labName, semester, department });
    res.status(201).json({
      message: "Lab added successfully",
      lab: newLab
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Assign lab to faculty + auto-generate schedule
export const assignLab = async (req, res) => {
  try {
    const { labId, facultyId, section, academicYear, semesterType, startDate, endDate, dayOfWeek } = req.body;

    const lab = await Lab.findById(labId);
    const faculty = await User.findById(facultyId);
    if (!lab || !faculty) {
      return res.status(404).json({ message: "Invalid lab or faculty" });
    }

    const generatedDates = generateDates(startDate, endDate, dayOfWeek);

    const assignment = await LabAssignment.create({
      labId,
      facultyId,
      section,
      academicYear,
      semesterType,
      startDate,
      endDate,
      dayOfWeek,
      generatedDates
    });

    res.status(201).json({
      message: "Lab assigned successfully",
      assignment
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};


// Get all users
export const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all labs (with optional semester filter)
export const getLabs = async (req, res) => {
  try {
    const { semester } = req.query;
    const filter = semester ? { semester: Number(semester) } : {};
    const labs = await Lab.find(filter);
    res.json({ labs });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Get all lab assignments
export const getLabAssignments = async (req, res) => {
  try {
    const assignments = await LabAssignment.find()
      .populate("labId")
      .populate("facultyId", "name username");
    res.json({ assignments });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Bulk import users from CSV
export const bulkImportUsers = async (req, res) => {
  try {
    const { users } = req.body; // Array of user objects
    
    const hashedUsers = await Promise.all(
      users.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );
    
    const createdUsers = await User.insertMany(hashedUsers);
    res.status(201).json({
      message: `${createdUsers.length} users imported successfully`,
      users: createdUsers
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

// Bulk import labs from CSV
export const bulkImportLabs = async (req, res) => {
  try {
    const { labs } = req.body; // Array of lab objects
    const createdLabs = await Lab.insertMany(labs);
    res.status(201).json({
      message: `${createdLabs.length} labs imported successfully`,
      labs: createdLabs
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};
// Delete user
export const deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Prevent admin from deleting themselves
    if (userId === req.user._id.toString()) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }
    
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
};

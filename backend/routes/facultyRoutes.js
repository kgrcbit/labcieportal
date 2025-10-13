import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { 
  getAssignedLabs, 
  getStudentsByLab, 
  enterMarks,
  getMarksHistory
} from "../controllers/facultyController.js";

const router = express.Router();

router.get("/labs", protect, authorizeRoles("faculty"), getAssignedLabs);
router.get("/labs/:labId/students", protect, authorizeRoles("faculty"), getStudentsByLab);
router.post("/labs/enter-marks", protect, authorizeRoles("faculty"), enterMarks);
router.get("/labs/:labId/marks", protect, authorizeRoles("faculty"), getMarksHistory);

export default router;
import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { getStudentMarks, getStudentProfile } from "../controllers/studentController.js";

const router = express.Router();

router.get("/me/marks", protect, authorizeRoles("student"), getStudentMarks);
router.get("/me/profile", protect, authorizeRoles("student"), getStudentProfile);

export default router;
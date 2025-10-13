import express from "express";
import { protect, authorizeRoles } from "../middleware/authMiddleware.js";
import { 
  addUser, 
  addLab, 
  assignLab, 
  getUsers, 
  getLabs, 
  getLabAssignments,
  bulkImportUsers,
  bulkImportLabs,
  deleteUser
} from "../controllers/adminController.js";

const router = express.Router();

// User management
router.post("/addUser", protect, authorizeRoles("admin"), addUser);
router.delete("/users/:userId", protect, authorizeRoles("admin"), deleteUser);
router.get("/users", protect, authorizeRoles("admin"), getUsers);
router.post("/bulk-import-users", protect, authorizeRoles("admin"), bulkImportUsers);

// Lab management
router.post("/addLab", protect, authorizeRoles("admin"), addLab);
router.get("/labs", protect, authorizeRoles("admin"), getLabs);
router.post("/bulk-import-labs", protect, authorizeRoles("admin"), bulkImportLabs);

// Lab assignments
router.post("/assignLab", protect, authorizeRoles("admin"), assignLab);
router.get("/assignments", protect, authorizeRoles("admin"), getLabAssignments);

export default router;
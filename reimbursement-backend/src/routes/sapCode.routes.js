import express from "express";
import { 
  getAllSapCodes, 
  createSapCode, 
  updateSapCode, 
  deleteSapCode,
  getActiveSapCodes,
} from "../controllers/sapCode.controller.js";

const router = express.Router();

// ✅ Get only Active SAP Codes (for dropdowns in Manage Users)
router.get("/active", getActiveSapCodes);

// ✅ Get ALL SAP Codes (Admin Panel)
router.get("/", getAllSapCodes);

// ✅ Create new SAP code
router.post("/", createSapCode);

// ✅ Update SAP code
router.put("/:id", updateSapCode);

// ✅ Delete SAP code
router.delete("/:id", deleteSapCode);

export default router;

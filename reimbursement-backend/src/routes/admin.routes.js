import express from "express";
import { filterReports } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/reports", filterReports);

export default router;

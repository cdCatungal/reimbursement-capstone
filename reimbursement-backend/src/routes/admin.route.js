import express from "express";
import { getReport } from "../controllers/admin.controller.js";

const router = express.Router();

router.post("/reports", getReport);

export default router;

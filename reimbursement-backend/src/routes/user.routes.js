import express from "express";
import { userSettings } from "../controllers/user.controller.js";

const router = express.Router();

router.get("/settings", userSettings);

export default router;

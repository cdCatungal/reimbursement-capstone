// src/controllers/reportController.js
import { Reimbursement, User, Approval } from "../models/index.js";
import { Op } from "sequelize";

export const getReport = async (req, res) => {
  try {
    console.log("Request dates: ", req.body);
    const { start: startDate, end: endDate } = req.body;

    let whereClause = {};

    // Handle date filtering
    if (startDate && endDate) {
      // Both dates provided - get range from start of startDate to end of endDate
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      whereClause.submitted_at = {
        [Op.between]: [start, end],
      };
    } else if (startDate && !endDate) {
      // Only start date provided - get from start of startDate to present
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      whereClause.submitted_at = {
        [Op.gte]: start,
      };
    } else if (!startDate && endDate) {
      // ONLY end date provided - get ONLY that specific day (no future/past dates)
      const startOfDay = new Date(endDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);

      whereClause.submitted_at = {
        [Op.between]: [startOfDay, endOfDay],
      };
    }
    // If no dates provided, get ALL past and present data (no future)
    else {
      whereClause.submitted_at = {
        [Op.lte]: new Date(), // Only past and present, no future
      };
    }

    // Fetch all reimbursement data with related tables
    const reimbursements = await Reimbursement.findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "name", "email", "role"],
        },
        {
          model: Approval,
          as: "approvals",
          include: [
            {
              model: User,
              as: "approver",
              attributes: ["id", "name", "email", "role"],
            },
          ],
          order: [["approval_level", "ASC"]],
        },
      ],
      order: [["submitted_at", "DESC"]],
    });

    // Debug logging
    console.log("Request dates - startDate:", startDate, "endDate:", endDate);
    console.log("Date range filter:", whereClause.submitted_at);
    console.log("Found records:", reimbursements.length);

    // Return all raw data - let frontend handle everything
    res.status(200).json({
      success: true,
      reports: reimbursements,
      message: "Data fetched successfully",
    });
  } catch (error) {
    console.log("Server error in getReport: ", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching data",
    });
  }
};

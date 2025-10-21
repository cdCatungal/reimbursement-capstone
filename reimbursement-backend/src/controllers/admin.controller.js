import { Op } from "sequelize";
import { Reimbursement } from "../models/index.js";
import User from "../models/User.js";

export const filterReports = async (req, res) => {
  try {
    const { start, end } = req.body;
    const where = {};

    if (start && end) {
      where.createdAt = { [Op.between]: [new Date(start), new Date(end)] };
    } else if (start && !end) {
      where.createdAt = { [Op.between]: [new Date(start), new Date()] };
    } else if (!start && end) {
      where.createdAt = { [Op.lte]: new Date(end) };
    } else {
      return res.status(400).json({
        message: "Please provide at least a start or end date.",
      });
    }

    const reports = await Reimbursement.findAll({
      where,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: User,
          as: "user", // ✅ Must match your alias in Reimbursement.belongsTo
          attributes: ["id", "name", "email"],
        },
      ],
    });

    return res.status(200).json({ reports });
  } catch (error) {
    console.error("Error from filter controller:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

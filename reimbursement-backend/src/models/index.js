import sequelize from "../config/db.js"
import User from "./User.js";
import Reimbursement from "./Reimbursement.js";
import Approval from "./Approval.js";

// Relationships
User.hasMany(Reimbursement, { foreignKey: "user_id", as: "reimbursements" });
Reimbursement.belongsTo(User, { foreignKey: "user_id", as: "user" });

User.hasMany(Approval, { foreignKey: "approver_id", as: "approvals" });
Approval.belongsTo(User, { foreignKey: "approver_id", as: "approver" });

Reimbursement.hasMany(Approval, { foreignKey: "reimbursement_id", as: "approvals" });
Approval.belongsTo(Reimbursement, { foreignKey: "reimbursement_id" });

export { sequelize, User, Reimbursement, Approval };
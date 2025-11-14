import sequelize from "../config/db.js";
import User from "./User.js";
import Reimbursement from "./Reimbursement.js";
import Approval from "./Approval.js";
import SapCode from "./SapCode.js";
import UserSapCode from "./UserSapCode.js";

// ✅ User ↔ Reimbursement
User.hasMany(Reimbursement, { foreignKey: "user_id", as: "reimbursements" });
Reimbursement.belongsTo(User, { foreignKey: "user_id", as: "user" });

// ✅ User ↔ Approval
User.hasMany(Approval, { foreignKey: "approver_id", as: "approvals" });
Approval.belongsTo(User, { foreignKey: "approver_id", as: "approver" });

// ✅ Reimbursement ↔ Approval
Reimbursement.hasMany(Approval, {
  foreignKey: "reimbursement_id",
  as: "approvals",
});
Approval.belongsTo(Reimbursement, { foreignKey: "reimbursement_id" });

// ✅ NEW: Many-to-Many User ↔ SapCode (for Employees with multiple SAP codes)
User.belongsToMany(SapCode, {
  through: UserSapCode,
  foreignKey: "user_id",
  otherKey: "sap_code_id",
  as: "sapCodes",
});

SapCode.belongsToMany(User, {
  through: UserSapCode,
  foreignKey: "sap_code_id",
  otherKey: "user_id",
  as: "employees",
});

// ✅ NEW: SapCode ↔ Account Manager (One-to-Many)
SapCode.belongsTo(User, {
  foreignKey: "account_manager_id",
  as: "accountManager",
});

User.hasMany(SapCode, {
  foreignKey: "account_manager_id",
  as: "managedSapCodes",
});

// ✅ User self-referencing for SUL assignment (already defined in User.js)

export { sequelize, User, Reimbursement, Approval, SapCode, UserSapCode };

// src/models/Approval.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Approval = sequelize.define('Approval', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  reimbursement_id: { type: DataTypes.INTEGER, allowNull: false },
  approver_id: { type: DataTypes.INTEGER, allowNull: false },
  approved: { type: DataTypes.BOOLEAN, allowNull: false },
  remarks: { type: DataTypes.TEXT },
  approved_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});


export default Approval;

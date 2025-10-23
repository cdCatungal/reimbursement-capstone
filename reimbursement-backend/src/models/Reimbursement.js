// src/models/Reimbursement.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Reimbursement = sequelize.define('Reimbursement', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: false },
  category: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  items: { type: DataTypes.TEXT },
  merchant: { type: DataTypes.STRING },
  total: { type: DataTypes.DECIMAL(10,2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('Pending','Manager Approved','Michelle Approved','Approved','Rejected'), defaultValue: 'Pending' },
  current_approver: { type: DataTypes.STRING }, // role string like 'Manager' / 'Michelle' / 'Grace'
  receipt_url: { type: DataTypes.STRING }, // optional
  submitted_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  approved_at: { type: DataTypes.DATE, allowNull: true }
});

// Define association with User
Reimbursement.associate = (models) => {
  Reimbursement.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

export default Reimbursement;
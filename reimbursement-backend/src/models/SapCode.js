import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SapCode = sequelize.define('SapCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      is: /^E-\d{5}-\d{4}$/i,
    },
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: 'Project or department name'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Detailed description of what this code is for'
  },
  status: {
    type: DataTypes.ENUM('Active', 'Inactive'),
    defaultValue: 'Active',
  },
  
  // ✅ NEW: Each SAP Code has ONE assigned Account Manager
  account_manager_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'Account Manager assigned to this SAP Code'
  }
});

SapCode.addScope("active", {
  where: { status: "Active" }
});

export default SapCode;
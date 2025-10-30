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
      is: /^E-\d{5}-\d{4}$/i, // Format: E-00000-0000
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
});

  SapCode.addScope("active", {
    where: { status: "active" }
  });

export default SapCode;
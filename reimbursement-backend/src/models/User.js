// src/models/User.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  role: {
    type: DataTypes.ENUM(
      'Employee',
      'SUL',
      'Account Manager',
      'Invoice Specialist',
      'Finance Officer',
      'Sales Director',
      'Admin'
    ),
    defaultValue: 'Employee',
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'microsoft'),
    defaultValue: 'local',
    allowNull: false,
  },
  microsoftId: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
  },
  profilePicture: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // NEW: SAP Code fields
  sap_code_1: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^E-\d{5}-\d{4}$/i, // Format: E-00000-0000
    },
    comment: 'Primary SAP code (format: E-00000-0000)'
  },
  sap_code_2: {
    type: DataTypes.STRING(20),
    allowNull: true,
    validate: {
      is: /^E-\d{5}-\d{4}$/i,
    },
    comment: 'Secondary SAP code (only for Employees, format: E-00000-0000)'
  },
});

// Add validation to ensure only Employees can have 2 SAP codes
User.beforeValidate((user) => {
  if (user.sap_code_2 && !['Employee'].includes(user.role)) {
    user.sap_code_2 = null; // Clear second SAP code for non-Employees
  }
  
  // Ensure Sales Director, Invoice Specialist, Finance Officer have no SAP codes
  if (['Sales Director', 'Invoice Specialist', 'Finance Officer', 'Admin'].includes(user.role)) {
    user.sap_code_1 = null;
    user.sap_code_2 = null;
  }
});

export default User;
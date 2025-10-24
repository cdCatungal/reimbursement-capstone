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
      'Admin',           // SuperAdmin - highest level
      'Employee',        // Regular employee
      'SUL',            // Service Unit Leader
      'Account Manager',
      'Invoice Specialist',
      'Finance Officer'
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
    type: DataTypes.TEXT,  // Using TEXT to store base64 or URL
    allowNull: true,
  },
});

export default User;
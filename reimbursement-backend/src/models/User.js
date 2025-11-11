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
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: 'Whether the user account is active or inactive'
  },
  
  // ✅ NEW: Manual SUL assignment (for Employees only)
  assigned_sul_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: 'SUL manually assigned to this Employee by Sales Director'
  },
  
  // ❌ DEPRECATED: Remove old SAP code fields (keep for migration, will drop later)
  sap_code_1: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  sap_code_2: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
});

// ✅ NEW: Self-referencing relationship for SUL assignment
User.belongsTo(User, {
  foreignKey: 'assigned_sul_id',
  as: 'assignedSUL'
});

User.hasMany(User, {
  foreignKey: 'assigned_sul_id',
  as: 'managedEmployees'
});

export default User;
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
    allowNull: true, // ⬅️ Changed from false to true (allow null for OAuth users)
  },
  role: {
    type: DataTypes.ENUM('Admin', 'Employee', 'Manager'),
    defaultValue: 'Employee',
  },
  authProvider: {
    type: DataTypes.ENUM('local', 'microsoft'), // ⬅️ Add this field
    defaultValue: 'local',
    allowNull: false,
  },
  microsoftId: {
    type: DataTypes.STRING, // ⬅️ Add this to store Microsoft OID
    allowNull: true,
    unique: true,
  },
});

export default User;
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const UserSapCode = sequelize.define('UserSapCode', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  sap_code_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'sap_codes',
      key: 'id'
    },
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'user_sap_codes',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'sap_code_id']
    }
  ]
});

export default UserSapCode;
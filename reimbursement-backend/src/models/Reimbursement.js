// first-test/src/models/Reimbursement.js
import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Reimbursement = sequelize.define('Reimbursement', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING
  },
  type: {
    type: DataTypes.STRING
  },
  description: {
    type: DataTypes.TEXT
  },
  items: {
    type: DataTypes.TEXT
  },
  merchant: {
    type: DataTypes.STRING
  },
  total: {
    type: DataTypes.DECIMAL(10,2),
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
    defaultValue: 'Pending'
  },
  current_approver: {
    type: DataTypes.STRING
  },
  
  // NEW: SAP Code tracking
  sap_code: {
    type: DataTypes.STRING(20),
    allowNull: false,
    validate: {
      is: /^E-\d{5}-\d{4}$/i,
    },
    comment: 'SAP code used for this reimbursement submission'
  },
  
  // Store receipt image data directly in database
  receipt_data: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
    comment: 'Base64 encoded image data'
  },
  receipt_mimetype: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Image MIME type (e.g., image/jpeg, image/png)'
  },
  receipt_filename: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original filename'
  },
  
  // ✅ FIX: Add date_of_expense field
  date_of_expense: {
    type: DataTypes.DATEONLY, // DATEONLY stores date without time
    allowNull: true,
    comment: 'Date when the expense occurred'
  },
  
  submitted_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  approved_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'reimbursements',
  timestamps: true,
  // ✅ Add getters for consistent date formatting
  getterMethods: {
    dateOfExpenseFormatted() {
      if (!this.date_of_expense) return null;
      return new Date(this.date_of_expense).toISOString().split('T')[0];
    },
    submittedAtFormatted() {
      if (!this.submitted_at) return null;
      return new Date(this.submitted_at).toISOString().split('T')[0];
    }
  }
});

// Define association with User
Reimbursement.associate = (models) => {
  Reimbursement.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  Reimbursement.hasMany(models.Approval, {
    foreignKey: 'reimbursement_id',
    as: 'approvals'
  });
};

export default Reimbursement;
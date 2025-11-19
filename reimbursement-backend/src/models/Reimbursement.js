// reimbursement-backend/src/models/Reimbursement.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

<<<<<<< HEAD
const Reimbursement = sequelize.define(
  "Reimbursement",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    items: {
      type: DataTypes.TEXT,
    },
    merchant: {
      type: DataTypes.STRING,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0,
    },
    status: {
      type: DataTypes.ENUM("Pending", "Approved", "Rejected"),
      defaultValue: "Pending",
    },
    current_approver: {
      type: DataTypes.STRING,
    },

    // ✅ UPDATED: SAP Code tracking with special values for Invoice Specialist and SUL
    sap_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        isValidSapCode(value) {
          // Allow special values for Invoice Specialists and SULs
          const specialCodes = ["INVOICE_SPECIALIST", "SUL_DIRECT"];
          if (specialCodes.includes(value)) {
            return true;
          }
          // Otherwise, validate standard SAP code format
          if (!/^E-\d{5}-\d{4}$/i.test(value)) {
            throw new Error(
              "SAP code must be in format E-XXXXX-YYYY, INVOICE_SPECIALIST, or SUL_DIRECT"
            );
          }
        },
      },
      comment:
        "SAP code used for this reimbursement submission (or special code for Invoice Specialist/SUL)",
    },

    // Store receipt image data directly in database
    receipt_data: {
      type: DataTypes.TEXT("long"),
      allowNull: true,
      comment: "Base64 encoded image data",
    },
    receipt_mimetype: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Image MIME type (e.g., image/jpeg, image/png)",
    },
    receipt_filename: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "Original filename",
    },

    // ✅ Date of expense field
    date_of_expense: {
      type: DataTypes.DATEONLY, // DATEONLY stores date without time
      allowNull: true,
      comment: "Date when the expense occurred",
    },

    number_of_people: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 1,
      validate: {
        min: 1,
      },
      comment: "Number of people for Meal with Client category",
    },

    number_of_days: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },

    reimbursable_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },

    submitted_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    approved_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "reimbursements",
    timestamps: true,
    // ✅ Add getters for consistent date formatting
    getterMethods: {
      dateOfExpenseFormatted() {
        if (!this.date_of_expense) return null;
        return new Date(this.date_of_expense).toISOString().split("T")[0];
      },
      submittedAtFormatted() {
        if (!this.submitted_at) return null;
        return new Date(this.submitted_at).toISOString().split("T")[0];
      },
=======
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
  
  sap_code: {
    type: DataTypes.STRING(30),
    allowNull: false,
    validate: {
      isValidSapCode(value) {
        const specialCodes = ['INVOICE_SPECIALIST', 'SUL_DIRECT'];
        if (specialCodes.includes(value)) {
          return true;
        }
        if (!/^E-\d{5}-\d{4}$/i.test(value)) {
          throw new Error('SAP code must be in format E-XXXXX-YYYY, INVOICE_SPECIALIST, or SUL_DIRECT');
        }
      }
    },
    comment: 'SAP code used for this reimbursement submission'
  },
  
  // ✅ UPDATED: Store Cloudinary URL instead of base64
  receipt_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Cloudinary URL for the receipt image/PDF'
  },
  
  // ✅ UPDATED: Store Cloudinary public_id for deletion
  receipt_public_id: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: 'Cloudinary public_id for deletion'
  },
  
  receipt_mimetype: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'File MIME type (e.g., image/jpeg, application/pdf)'
  },
  receipt_filename: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Original filename'
  },
  
  date_of_expense: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    comment: 'Date when the expense occurred'
  },
  
  number_of_people: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 1,
    validate: {
      min: 1
    },
    comment: 'Number of people for Meal with Client category'
  },

  number_of_days: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },

  reimbursable_amount: {
    type: DataTypes.DECIMAL(10,2),
    allowNull: true
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
  getterMethods: {
    dateOfExpenseFormatted() {
      if (!this.date_of_expense) return null;
      return new Date(this.date_of_expense).toISOString().split('T')[0];
>>>>>>> origin/main
    },
  }
);

Reimbursement.associate = (models) => {
  Reimbursement.belongsTo(models.User, {
    foreignKey: "user_id",
    as: "user",
  });

  Reimbursement.hasMany(models.Approval, {
    foreignKey: "reimbursement_id",
    as: "approvals",
  });
};

export default Reimbursement;

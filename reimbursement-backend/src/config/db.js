// import { Sequelize } from 'sequelize';
// import dotenv from 'dotenv';
// dotenv.config();

// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
//   host: process.env.DB_HOST,
//   dialect: 'postgres',
//   logging: false,
//   define: { timestamps: true, underscored: true },
//   dialectOptions: {
//       ssl: process.env.DB_SSL === "true" ? { require: true, rejectUnauthorized: false } : false,
//     },
// });

// export default sequelize;

import { Sequelize } from "sequelize";
import dotenv from "dotenv";
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: "postgres",
    logging: false,

    // ✅ FIXED: Reduced pool size for Render PostgreSQL
    pool: {
      max: 5, // Reduced from 10 to 5
      min: 0, // Changed from 2 to 0 - don't keep connections open
      acquire: 30000, // Reduced from 60000
      idle: 10000, // Keep it short
    },

    define: {
      timestamps: true,
      underscored: true,
    },

    dialectOptions: {
      ssl:
        process.env.DB_SSL === "true"
          ? { require: true, rejectUnauthorized: false }
          : false,

      // These help with connection stability
      connectTimeout: 60000,
      keepAlive: true,
    },
  }
);

// ✅ Add connection testing
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connection established successfully.");
  })
  .catch((err) => {
    console.error("❌ Unable to connect to the database:", err);
  });

export default sequelize;

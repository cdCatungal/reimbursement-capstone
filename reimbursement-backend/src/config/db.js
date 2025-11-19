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

// config/db.js - THIS is what needs fixing
import { Sequelize } from "sequelize";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "postgres",
    // ✅ ADD THIS SSL CONFIGURATION:
    dialectOptions: {
      ssl: {
        require: true, // ← REQUIRED for Supabase
        rejectUnauthorized: false, // ← REQUIRED for production
      },
    },
    logging: console.log, // Temporary for debugging
  }
);

export default sequelize;

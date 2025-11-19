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

    // Connection pooling - fixes "connection terminated unexpectedly"
    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000,
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

export default sequelize;

//src/utils/createInitialUsers.js

import bcrypt from "bcryptjs";
import sequelize from "../config/db.js";
import User from "../models/User.js";

(async () => {
  try {
    await sequelize.sync(); // Ensure DB is connected

    // 🔐 Hash a default password for seeded users
    const hashedPassword = await bcrypt.hash("Password123!", 10);

    const users = [
      { name: "Line Manager", email: "manager@yourcompany.com", role: "Manager", password: hashedPassword },
      { name: "Ms. Michelle", email: "michelle@yourcompany.com", role: "Michelle", password: hashedPassword },
      { name: "Ms. Grace", email: "grace@yourcompany.com", role: "Grace", password: hashedPassword },
    ];

    for (const u of users) {
      const [user, created] = await User.findOrCreate({
        where: { email: u.email },
        defaults: u,
      });
      console.log("Ensured user:", user.email);
    }

    console.log("✅ Initial users created successfully!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating users:", err);
    process.exit(1);
  }
})();

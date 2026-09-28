const bcrypt = require("bcryptjs");
const User = require("../models/user.model");

/**
 * Auto-seeds the initial Super Admin / Central Authority account
 * if no administrator exists in the database.
 */
async function seedAdmin() {
  try {
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@resqtech.gov.in";
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Admin@12345";
    const adminName = process.env.DEFAULT_ADMIN_NAME || "National Command Admin";

    // 1. Check if specific adminEmail exists
    let existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });

    // 2. Hash default admin password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    if (existingAdmin) {
      existingAdmin.password = hashedPassword;
      existingAdmin.role = "admin";
      existingAdmin.authorityLevel = "central";
      existingAdmin.jurisdictionId = null;
      await existingAdmin.save();
      console.log(`[Admin Seeder] Super Admin updated with current .env credentials: ${existingAdmin.email}`);
      return existingAdmin;
    }

    // 3. Create Super Admin with Central / All-India jurisdiction
    const newAdmin = await User.create({
      name: adminName,
      email: adminEmail.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      authorityLevel: "central",
      jurisdictionId: null, // null denotes central / nationwide command scope
      state: null,
      district: null,
      department: "National Disaster Management Authority (NDMA)",
      isAvailable: true,
    });

    console.log("=======================================================");
    console.log(" [Admin Seeder] Initial Super Admin Created Successfully!");
    console.log(`   Email:    ${newAdmin.email}`);
    console.log(`   Role:     ${newAdmin.role} (${newAdmin.authorityLevel})`);
    console.log("=======================================================");

    return newAdmin;
  } catch (error) {
    console.error("[Admin Seeder Error]:", error.message);
  }
}

module.exports = { seedAdmin };

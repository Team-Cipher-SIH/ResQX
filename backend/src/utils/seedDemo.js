require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const User = require("../models/user.model");
const Incident = require("../models/incident.model");
const ResponseTeam = require("../models/responseteam.model");
const Shelter = require("../models/shelter.model");
const Dispatch = require("../models/dispatch.model");
const Alert = require("../models/alert.model");
const ActivityLog = require("../models/activitylog.model");

async function seedDemoData() {
  console.log("==================================================");
  console.log("      ResQtech SIH 2026 - Demo Data Seeder        ");
  console.log("==================================================");

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error("ERROR: MONGO_URI is not defined in environment variables.");
    process.exit(1);
  }

  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoUri);
  console.log("Connected to MongoDB successfully.\n");

  try {
    const salt = await bcrypt.genSalt(10);

    // -------------------------------------------------------------
    // 1. Seed Users (Roles: Central Admin, Pune District Admin, Mumbai District Admin, Field Responder, Citizen)
    // -------------------------------------------------------------
    console.log("Seeding Users...");

    const usersToSeed = [
      {
        name: "National Command Super Admin",
        email: "admin@resqtech.gov.in",
        password: await bcrypt.hash("Admin@12345", salt),
        role: "admin",
        authorityLevel: "central",
        phone: "+91-9876543210",
      },
      {
        name: "Pune District Authority Admin",
        email: "pune.admin@resqtech.gov.in",
        password: await bcrypt.hash("Pune@12345", salt),
        role: "authority",
        authorityLevel: "district_admin",
        state: "Maharashtra",
        district: "Pune",
        jurisdictionId: "MAHARASHTRA_PUNE",
        phone: "+91-9822012345",
      },
      {
        name: "Mumbai District Authority Admin",
        email: "mumbai.admin@resqtech.gov.in",
        password: await bcrypt.hash("Mumbai@12345", salt),
        role: "authority",
        authorityLevel: "district_admin",
        state: "Maharashtra",
        district: "Mumbai",
        jurisdictionId: "MAHARASHTRA_MUMBAI",
        phone: "+91-9822099999",
      },
      {
        name: "Inspector Vikram Rane (Field Responder)",
        email: "responder.pune@resqtech.gov.in",
        password: await bcrypt.hash("Responder@12345", salt),
        role: "authority",
        authorityLevel: "field_responder",
        state: "Maharashtra",
        district: "Pune",
        jurisdictionId: "MAHARASHTRA_PUNE",
        phone: "+91-9822088888",
      },
      {
        name: "Aarav Sharma (Citizen)",
        email: "citizen@gmail.com",
        password: await bcrypt.hash("Citizen@12345", salt),
        role: "citizen",
        phone: "+91-9988776655",
      },
    ];

    const usersMap = {};
    for (const u of usersToSeed) {
      const user = await User.findOneAndUpdate({ email: u.email }, u, {
        upsert: true,
        new: true,
      });
      usersMap[u.email] = user;
      console.log(` -> User: ${u.name} [${u.email}] (${u.role}${u.authorityLevel ? ` / ${u.authorityLevel}` : ""})`);
    }

    // -------------------------------------------------------------
    // 2. Seed Response Teams
    // -------------------------------------------------------------
    console.log("\nSeeding Response Teams with 2dsphere GPS coordinates...");

    const teamsToSeed = [
      {
        name: "NDRF Pune Alpha Rescue Unit",
        type: "flood",
        state: "Maharashtra",
        district: "Pune",
        status: "available",
        capabilities: ["flood", "water rescue", "boat rescue", "evacuation", "rescue"],
        leader: usersMap["responder.pune@resqtech.gov.in"]._id,
        members: [usersMap["responder.pune@resqtech.gov.in"]._id],
        currentLocation: {
          type: "Point",
          coordinates: [73.8567, 18.5204], // Pune City Center
        },
        createdBy: usersMap["pune.admin@resqtech.gov.in"]._id,
      },
      {
        name: "Pune Fire & Hazmat Rapid Response",
        type: "fire",
        state: "Maharashtra",
        district: "Pune",
        status: "available",
        capabilities: ["fire", "firefighting", "hazmat", "smoke rescue", "rescue"],
        leader: usersMap["responder.pune@resqtech.gov.in"]._id,
        members: [usersMap["responder.pune@resqtech.gov.in"]._id],
        currentLocation: {
          type: "Point",
          coordinates: [73.8650, 18.5300], // 1.5 km away
        },
        createdBy: usersMap["pune.admin@resqtech.gov.in"]._id,
      },
      {
        name: "SDRF Mumbai Coastal Rescue Unit",
        type: "flood",
        state: "Maharashtra",
        district: "Mumbai",
        status: "available",
        capabilities: ["flood", "cyclone", "water rescue", "rescue"],
        currentLocation: {
          type: "Point",
          coordinates: [72.8777, 19.0760], // Mumbai Center
        },
        createdBy: usersMap["mumbai.admin@resqtech.gov.in"]._id,
      },
    ];

    const teamsMap = {};
    for (const t of teamsToSeed) {
      const team = await ResponseTeam.findOneAndUpdate({ name: t.name }, t, {
        upsert: true,
        new: true,
      });
      teamsMap[t.name] = team;
      console.log(` -> Team: ${t.name} (${t.district}, ${t.state}) [Status: ${t.status}]`);
    }

    // -------------------------------------------------------------
    // 3. Seed Shelters
    // -------------------------------------------------------------
    console.log("\nSeeding Relief Shelters...");

    const sheltersToSeed = [
      {
        name: "Pune Central Multi-purpose Relief Shelter",
        address: "Near Deccan Gymkhana, Pune",
        state: "Maharashtra",
        district: "Pune",
        capacity: 500,
        currentOccupancy: 140,
        contactNumber: "020-26123456",
        coordinates: [73.8450, 18.5160],
        location: { type: "Point", coordinates: [73.8450, 18.5160] },
        isActive: true,
      },
      {
        name: "Shivaji Nagar Community Evacuation Camp",
        address: "Shivaji Nagar Sports Complex, Pune",
        state: "Maharashtra",
        district: "Pune",
        capacity: 350,
        currentOccupancy: 85,
        contactNumber: "020-25501234",
        coordinates: [73.8500, 18.5310],
        location: { type: "Point", coordinates: [73.8500, 18.5310] },
        isActive: true,
      },
    ];

    for (const s of sheltersToSeed) {
      const shelter = await Shelter.findOneAndUpdate({ name: s.name }, s, {
        upsert: true,
        new: true,
      });
      console.log(` -> Shelter: ${s.name} [Occupancy: ${s.currentOccupancy}/${s.capacity}]`);
    }

    // -------------------------------------------------------------
    // 4. Seed Incidents (Ready for Dispatch Demo & In-Progress Dispatch)
    // -------------------------------------------------------------
    console.log("\nSeeding Incidents...");

    // Incident 1: Verified flood incident ready for recommendation & dispatch demo
    const floodIncident = await Incident.findOneAndUpdate(
      { title: "Severe Waterlogging & Flood in Low-Lying Area" },
      {
        title: "Severe Waterlogging & Flood in Low-Lying Area",
        description: "River water overflowed into residential slums near riverside road. 25 citizens trapped on roofs.",
        type: "flood",
        severity: "high",
        status: "verified",
        state: "Maharashtra",
        district: "Pune",
        location: {
          type: "Point",
          coordinates: [73.8520, 18.5210],
        },
        address: "Riverside Road, Pune, Maharashtra",
        priorityScore: 82,
        reportedBy: usersMap["citizen@gmail.com"]._id,
        verifiedBy: usersMap["pune.admin@resqtech.gov.in"]._id,
        verifiedAt: new Date(),
        aiAnalysis: {
          status: "completed",
          isEmergency: true,
          classifiedType: "flood",
          predictedType: "flood",
          aiSeverity: "HIGH",
          predictedSeverity: "HIGH",
          aiPriority: "P1",
          confidence: 0.96,
          recommendedTeam: "NDRF Flood Rescue Team",
          aiSummary: "High-priority flood triage: rapid water rise reported. Immediate boat evacuation recommended.",
          authenticity: "LIKELY_GENUINE",
          credibilityScore: 92,
          analyzedAt: new Date(),
        },
        statusHistory: [
          {
            status: "reported",
            timestamp: new Date(Date.now() - 3600000),
            updatedBy: usersMap["citizen@gmail.com"]._id,
            note: "Reported by citizen with photo evidence",
          },
          {
            status: "verified",
            timestamp: new Date(Date.now() - 1800000),
            updatedBy: usersMap["pune.admin@resqtech.gov.in"]._id,
            note: "Verified by Pune Command Center officer",
          },
        ],
      },
      { upsert: true, new: true }
    );
    console.log(` -> Incident: ${floodIncident.title} [Status: ${floodIncident.status}] (Ready for Recommendation demo)`);

    // -------------------------------------------------------------
    // 5. Seed Advisory Alert
    // -------------------------------------------------------------
    console.log("\nSeeding Civic & Disaster Alerts...");
    await Alert.findOneAndUpdate(
      { title: "Red Alert: Heavy Monsoon Inflow in Mutha Basin" },
      {
        title: "Red Alert: Heavy Monsoon Inflow in Mutha Basin",
        message: "Dam discharge increased to 25,000 cusecs. Residents along riverbanks are advised to move to designated relief shelters immediately.",
        type: "disaster",
        severity: "critical",
        affectedStates: ["Maharashtra"],
        affectedDistricts: ["Pune"],
        issuedBy: usersMap["pune.admin@resqtech.gov.in"]._id,
        isActive: true,
      },
      { upsert: true, new: true }
    );
    console.log(" -> Alert: Red Alert: Heavy Monsoon Inflow in Mutha Basin [Active]");

    // -------------------------------------------------------------
    // 6. Seed Sample Audit Trail Entries
    // -------------------------------------------------------------
    console.log("\nSeeding Initial ActivityLog Audit Trail...");

    const auditEntries = [
      {
        action: "user_login",
        targetType: "auth",
        targetId: usersMap["pune.admin@resqtech.gov.in"]._id,
        description: "Authority Admin logged in: Pune District Authority Admin",
        performedBy: usersMap["pune.admin@resqtech.gov.in"]._id,
        state: "Maharashtra",
        district: "Pune",
      },
      {
        action: "incident_reported",
        targetType: "incident",
        targetId: floodIncident._id,
        description: `Incident reported: ${floodIncident.title}`,
        performedBy: usersMap["citizen@gmail.com"]._id,
        incident: floodIncident._id,
        state: "Maharashtra",
        district: "Pune",
      },
      {
        action: "incident_verified",
        targetType: "incident",
        targetId: floodIncident._id,
        description: `Incident verified: ${floodIncident.title}`,
        performedBy: usersMap["pune.admin@resqtech.gov.in"]._id,
        incident: floodIncident._id,
        state: "Maharashtra",
        district: "Pune",
      },
    ];

    for (const a of auditEntries) {
      await ActivityLog.create(a);
    }
    console.log(` -> Created ${auditEntries.length} initial audit log entries.`);

    console.log("\n==================================================");
    console.log("       DEMO DATA SEEDED SUCCESSFULLY!             ");
    console.log("==================================================");
    console.log("\nDemo Credentials to Present to Judges:");
    console.log("--------------------------------------------------");
    console.log("1. Central Super Admin:");
    console.log("   Email:    admin@resqtech.gov.in");
    console.log("   Password: Admin@12345");
    console.log("2. Pune District Authority (Host Jurisdiction):");
    console.log("   Email:    pune.admin@resqtech.gov.in");
    console.log("   Password: Pune@12345");
    console.log("3. Mumbai District Authority (Isolation Proof):");
    console.log("   Email:    mumbai.admin@resqtech.gov.in");
    console.log("   Password: Mumbai@12345");
    console.log("4. Field Responder (Mobile/Field View):");
    console.log("   Email:    responder.pune@resqtech.gov.in");
    console.log("   Password: Responder@12345");
    console.log("5. Citizen (SOS & Reporting):");
    console.log("   Email:    citizen@gmail.com");
    console.log("   Password: Citizen@12345");
    console.log("--------------------------------------------------\n");
  } catch (err) {
    console.error("Error seeding demo data:", err);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };

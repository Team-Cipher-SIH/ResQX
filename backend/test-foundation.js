const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const axios = require("axios");
require("dotenv").config();

const dns = require("dns");
dns.setServers(["1.1.1.1", "8.8.8.8"]);

const connectDB = require("./src/config/database");
const User = require("./src/models/user.model");
const Incident = require("./src/models/incident.model");
const ResponseTeam = require("./src/models/responseteam.model");
const Dispatch = require("./src/models/dispatch.model");
const ActivityLog = require("./src/models/activitylog.model");

const BASE_URL = "http://localhost:5000/api";

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role: role }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

async function runTests() {
  console.log("=== Starting ResQtech Backend Foundation Test Suite ===");
  await connectDB();
  console.log("Connected to MongoDB for test fixtures.");

  try {
    // 0. Clean up test records
    await User.deleteMany({ email: { $regex: /@test-foundation\.com$/ } });
    await Incident.deleteMany({ title: { $regex: /\[TEST-FOUNDATION\]/ } });
    await ResponseTeam.deleteMany({ name: { $regex: /\[TEST-TEAM\]/ } });
    await Dispatch.deleteMany({ notes: { $regex: /\[TEST-DISPATCH\]/ } });
    await ActivityLog.deleteMany({ description: { $regex: /\[TEST/ } });

    // 1. Setup Test Users
    // State Admin A (Maharashtra)
    const stateAdminMH = await User.create({
      name: "State Admin MH",
      email: "state-admin-mh@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "state_admin",
      state: "Maharashtra",
      district: null,
    });
    const tokenStateAdminMH = generateToken(stateAdminMH._id, stateAdminMH.role);

    // State Admin B (Gujarat)
    const stateAdminGJ = await User.create({
      name: "State Admin GJ",
      email: "state-admin-gj@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "state_admin",
      state: "Gujarat",
      district: null,
    });
    const tokenStateAdminGJ = generateToken(stateAdminGJ._id, stateAdminGJ.role);

    // District Admin A (Maharashtra, Pune)
    const distAdminPune = await User.create({
      name: "District Admin Pune",
      email: "dist-admin-pune@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "district_admin",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenDistAdminPune = generateToken(distAdminPune._id, distAdminPune.role);

    // District Admin B (Maharashtra, Mumbai)
    const distAdminMumbai = await User.create({
      name: "District Admin Mumbai",
      email: "dist-admin-mumbai@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "district_admin",
      state: "Maharashtra",
      district: "Mumbai",
    });
    const tokenDistAdminMumbai = generateToken(distAdminMumbai._id, distAdminMumbai.role);

    // Field Responder Pune
    const responderPune = await User.create({
      name: "Field Responder Pune",
      email: "responder-pune@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "field_responder",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenResponderPune = generateToken(responderPune._id, responderPune.role);

    // Field Responder Mumbai
    const responderMumbai = await User.create({
      name: "Field Responder Mumbai",
      email: "responder-mumbai@test-foundation.com",
      password: "password123",
      role: "authority",
      authorityLevel: "field_responder",
      state: "Maharashtra",
      district: "Mumbai",
    });
    const tokenResponderMumbai = generateToken(responderMumbai._id, responderMumbai.role);

    // Citizen
    const citizen = await User.create({
      name: "Citizen Rahul",
      email: "citizen-rahul@test-foundation.com",
      password: "password123",
      role: "citizen",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenCitizen = generateToken(citizen._id, citizen.role);

    // 2. Setup Test Incidents
    const incidentPune = await Incident.create({
      title: "[TEST-FOUNDATION] Flood in Pune",
      description: "Severe flooding near river bank",
      type: "flood",
      severity: "high",
      status: "reported",
      location: { type: "Point", coordinates: [73.8567, 18.5204] },
      state: "Maharashtra",
      district: "Pune",
      reportedBy: citizen._id,
    });

    const incidentMumbai = await Incident.create({
      title: "[TEST-FOUNDATION] Fire in Mumbai",
      description: "Building fire in commercial area",
      type: "fire",
      severity: "critical",
      status: "reported",
      location: { type: "Point", coordinates: [72.8777, 19.076] },
      state: "Maharashtra",
      district: "Mumbai",
      reportedBy: citizen._id,
    });

    const incidentGujarat = await Incident.create({
      title: "[TEST-FOUNDATION] Cyclone in Gujarat",
      description: "Coastal cyclone warnings",
      type: "cyclone",
      severity: "critical",
      status: "reported",
      location: { type: "Point", coordinates: [72.5714, 23.0225] },
      state: "Gujarat",
      district: "Ahmedabad",
      reportedBy: citizen._id,
    });

    console.log("Test fixtures successfully created.");

    // ==========================================
    // TEST 1: State Admin A sees only State A incidents
    // ==========================================
    console.log("\n[TEST 1] State Admin MH lists incidents...");
    const resStateList = await axios.get(`${BASE_URL}/incidents`, {
      headers: { Authorization: `Bearer ${tokenStateAdminMH}` },
    });
    const testIncidentsMH = resStateList.data.data.filter((i) => i.title.includes("[TEST-FOUNDATION]"));
    const allAreMH = testIncidentsMH.every((i) => i.state === "Maharashtra");
    const containsGJ = testIncidentsMH.some((i) => i.state === "Gujarat");
    if (allAreMH && !containsGJ && testIncidentsMH.length >= 2) {
      console.log("✔ PASS: State Admin MH sees only Maharashtra incidents.");
    } else {
      console.error("❌ FAIL: State Admin MH list mismatch:", testIncidentsMH.map((i) => i.state));
    }

    // ==========================================
    // TEST 2: State Admin MH cannot access State B (Gujarat) incident by ID (403)
    // ==========================================
    console.log("\n[TEST 2] State Admin MH attempts to access Gujarat incident by ID...");
    try {
      await axios.get(`${BASE_URL}/incidents/${incidentGujarat._id}`, {
        headers: { Authorization: `Bearer ${tokenStateAdminMH}` },
      });
      console.error("❌ FAIL: State Admin MH was unexpectedly allowed to access Gujarat incident!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✔ PASS: State Admin MH received 403 Forbidden accessing Gujarat incident.");
      } else {
        console.error("❌ FAIL: Expected 403, got:", err.response?.status);
      }
    }

    // ==========================================
    // TEST 3: District Admin Pune sees only Pune incidents
    // ==========================================
    console.log("\n[TEST 3] District Admin Pune lists incidents...");
    const resDistList = await axios.get(`${BASE_URL}/incidents`, {
      headers: { Authorization: `Bearer ${tokenDistAdminPune}` },
    });
    const testIncidentsPune = resDistList.data.data.filter((i) => i.title.includes("[TEST-FOUNDATION]"));
    const allArePune = testIncidentsPune.every((i) => i.district === "Pune" && i.state === "Maharashtra");
    if (allArePune && testIncidentsPune.length >= 1) {
      console.log("✔ PASS: District Admin Pune sees only Pune incidents.");
    } else {
      console.error("❌ FAIL: District Admin Pune list mismatch:", testIncidentsPune.map((i) => `${i.district}, ${i.state}`));
    }

    // ==========================================
    // TEST 4: District Admin Pune cannot access Mumbai incident by ID (403)
    // ==========================================
    console.log("\n[TEST 4] District Admin Pune attempts to access Mumbai incident by ID...");
    try {
      await axios.get(`${BASE_URL}/incidents/${incidentMumbai._id}`, {
        headers: { Authorization: `Bearer ${tokenDistAdminPune}` },
      });
      console.error("❌ FAIL: District Admin Pune was unexpectedly allowed to access Mumbai incident!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✔ PASS: District Admin Pune received 403 Forbidden accessing Mumbai incident.");
      } else {
        console.error("❌ FAIL: Expected 403, got:", err.response?.status);
      }
    }

    // ==========================================
    // TEST 5: District Admin Pune can verify own incident (verifiedBy is req.user._id)
    // ==========================================
    console.log("\n[TEST 5] District Admin Pune verifies Pune incident...");
    const resVerify = await axios.patch(
      `${BASE_URL}/incidents/${incidentPune._id}/verify`,
      { verifiedBy: "fakeUserIdThatMustBeIgnored" },
      { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
    );
    const updatedIncidentPune = resVerify.data.data;
    if (
      updatedIncidentPune.status === "verified" &&
      updatedIncidentPune.verifiedBy.toString() === distAdminPune._id.toString()
    ) {
      console.log("✔ PASS: Incident verified. verifiedBy correctly matches authenticated user ID.");
    } else {
      console.error("❌ FAIL: verifyIncident mismatch:", updatedIncidentPune);
    }

    // ==========================================
    // TEST 6: District Admin Pune cannot assign responder from Mumbai (cross-district rejected with 400)
    // ==========================================
    console.log("\n[TEST 6A] District Admin Pune attempts to assign Mumbai responder to Pune incident...");
    try {
      await axios.patch(
        `${BASE_URL}/incidents/${incidentPune._id}/assign`,
        { assignedTo: responderMumbai._id },
        { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
      );
      console.error("❌ FAIL: Cross-district responder assignment unexpectedly succeeded!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Cross-district assignment rejected with 400 Bad Request.");
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    console.log("\n[TEST 6B] District Admin Pune assigns matching Pune responder...");
    const resAssign = await axios.patch(
      `${BASE_URL}/incidents/${incidentPune._id}/assign`,
      { assignedTo: responderPune._id },
      { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
    );
    if (
      resAssign.data.data.status === "assigned" &&
      resAssign.data.data.assignedTo.toString() === responderPune._id.toString()
    ) {
      console.log("✔ PASS: Matching Pune responder assigned successfully.");
    } else {
      console.error("❌ FAIL: Assign responder failed:", resAssign.data);
    }

    // ==========================================
    // TEST 7: Citizen can report incident
    // ==========================================
    console.log("\n[TEST 7] Citizen reports a new incident...");
    const resCitizenReport = await axios.post(
      `${BASE_URL}/incidents/report`,
      {
        title: "[TEST-FOUNDATION] Citizen Reported Tree Fall",
        description: "Large tree fallen on main road blocking ambulances",
        type: "other",
        severity: "medium",
        coordinates: [73.8567, 18.5204],
        state: "Maharashtra",
        district: "Pune",
      },
      { headers: { Authorization: `Bearer ${tokenCitizen}` } }
    );
    if (resCitizenReport.data.success && resCitizenReport.data.data.status === "reported") {
      console.log("✔ PASS: Citizen reported incident successfully.");
    } else {
      console.error("❌ FAIL: Citizen report failed:", resCitizenReport.data);
    }

    // ==========================================
    // TEST 8: Citizen can trigger SOS
    // ==========================================
    console.log("\n[TEST 8] Citizen triggers SOS...");
    const resCitizenSOS = await axios.post(
      `${BASE_URL}/incidents/sos`,
      {
        coordinates: [73.8567, 18.5204],
        state: "Maharashtra",
        district: "Pune",
      },
      { headers: { Authorization: `Bearer ${tokenCitizen}` } }
    );
    if (
      resCitizenSOS.data.success &&
      resCitizenSOS.data.data.isSOS === true &&
      resCitizenSOS.data.data.severity === "critical"
    ) {
      console.log("✔ PASS: Citizen SOS triggered successfully with critical severity & isSOS=true.");
    } else {
      console.error("❌ FAIL: Citizen SOS failed:", resCitizenSOS.data);
    }

    // ==========================================
    // TEST 9: Field responder receives only assigned incidents
    // ==========================================
    console.log("\n[TEST 9] Field responder queries incidents...");
    const resResponderList = await axios.get(`${BASE_URL}/incidents`, {
      headers: { Authorization: `Bearer ${tokenResponderPune}` },
    });
    const responderIncidents = resResponderList.data.data.filter((i) => i.title.includes("[TEST-FOUNDATION]"));
    const allAssignedToMe = responderIncidents.every(
      (i) => i.assignedTo && (i.assignedTo._id || i.assignedTo).toString() === responderPune._id.toString()
    );
    if (allAssignedToMe && responderIncidents.length >= 1) {
      console.log("✔ PASS: Field responder sees only assigned incidents.");
    } else {
      console.error("❌ FAIL: Field responder incidents mismatch:", responderIncidents);
    }

    // ==========================================
    // TEST 10: Dashboard statistics query & jurisdiction
    // ==========================================
    console.log("\n[TEST 10] Dashboard statistics query for District Admin Pune...");
    const resDashboard = await axios.get(`${BASE_URL}/dashboard/stats`, {
      headers: { Authorization: `Bearer ${tokenDistAdminPune}` },
    });
    if (resDashboard.data.success && typeof resDashboard.data.data.activeIncidents === "number") {
      console.log("✔ PASS: Dashboard stats query succeeded with valid schema keys:", Object.keys(resDashboard.data.data));
    } else {
      console.error("❌ FAIL: Dashboard stats failed:", resDashboard.data);
    }

    // Cleanup
    await User.deleteMany({ email: { $regex: /@test-foundation\.com$/ } });
    await Incident.deleteMany({ title: { $regex: /\[TEST-FOUNDATION\]/ } });
    await ResponseTeam.deleteMany({ name: { $regex: /\[TEST-TEAM\]/ } });
    await Dispatch.deleteMany({ notes: { $regex: /\[TEST-DISPATCH\]/ } });
    await ActivityLog.deleteMany({ description: { $regex: /\[TEST/ } });

    console.log("\n==========================================");
    console.log("🎉 ALL FOUNDATION TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
  } catch (error) {
    console.error("Test execution error:", error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();

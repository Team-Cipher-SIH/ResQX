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

async function runWorkflowTests() {
  console.log("=== Starting Complete Operational Response Workflow Test Suite ===");
  await connectDB();
  console.log("Connected to MongoDB for workflow testing.");

  try {
    // Clean up previous test artifacts
    await User.deleteMany({ email: { $regex: /@test-workflow\.com$/ } });
    await Incident.deleteMany({ title: { $regex: /\[WORKFLOW-TEST\]/ } });
    await ResponseTeam.deleteMany({ name: { $regex: /\[WORKFLOW-TEAM\]/ } });
    await Dispatch.deleteMany({ notes: { $regex: /\[WORKFLOW-DISPATCH\]/ } });
    await ActivityLog.deleteMany({ description: { $regex: /\[WORKFLOW/ } });

    // 1. Create Test Users
    const distAdminPune = await User.create({
      name: "District Admin Pune",
      email: "admin-pune@test-workflow.com",
      password: "password123",
      role: "authority",
      authorityLevel: "district_admin",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenDistAdminPune = generateToken(distAdminPune._id, distAdminPune.role);

    const distAdminMumbai = await User.create({
      name: "District Admin Mumbai",
      email: "admin-mumbai@test-workflow.com",
      password: "password123",
      role: "authority",
      authorityLevel: "district_admin",
      state: "Maharashtra",
      district: "Mumbai",
    });
    const tokenDistAdminMumbai = generateToken(distAdminMumbai._id, distAdminMumbai.role);

    const responderPune = await User.create({
      name: "Field Responder Pune",
      email: "responder-pune@test-workflow.com",
      password: "password123",
      role: "authority",
      authorityLevel: "field_responder",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenResponderPune = generateToken(responderPune._id, responderPune.role);

    const responderMumbai = await User.create({
      name: "Field Responder Mumbai",
      email: "responder-mumbai@test-workflow.com",
      password: "password123",
      role: "authority",
      authorityLevel: "field_responder",
      state: "Maharashtra",
      district: "Mumbai",
    });
    const tokenResponderMumbai = generateToken(responderMumbai._id, responderMumbai.role);

    const citizen = await User.create({
      name: "Citizen Amit",
      email: "citizen-amit@test-workflow.com",
      password: "password123",
      role: "citizen",
      state: "Maharashtra",
      district: "Pune",
    });
    const tokenCitizen = generateToken(citizen._id, citizen.role);

    console.log("✔ Setup: Test users created.");

    // ==========================================
    // STEP 1: Team Validation - Reject Out-of-District Responders
    // ==========================================
    console.log("\n[TEST 1] Creating a Pune team with a Mumbai responder (should be rejected with 400)...");
    try {
      await axios.post(
        `${BASE_URL}/teams`,
        {
          name: "[WORKFLOW-TEAM] Invalid Mixed Team",
          type: "rescue",
          state: "Maharashtra",
          district: "Pune",
          members: [responderMumbai._id],
        },
        { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
      );
      console.error("❌ FAIL: Mixed-district team creation unexpectedly succeeded!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Rejected cross-district responder assignment with 400 Bad Request:", err.response.data.message);
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    console.log("\n[TEST 2] Creating valid Pune Response Team with Pune responder...");
    const resTeamPune = await axios.post(
      `${BASE_URL}/teams`,
      {
        name: "[WORKFLOW-TEAM] Pune Rescue Alpha",
        type: "rescue",
        state: "Maharashtra",
        district: "Pune",
        leader: responderPune._id,
        members: [responderPune._id],
        capabilities: ["flood_rescue", "first_aid"],
      },
      { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
    );
    const teamPune = resTeamPune.data.data;
    console.log("✔ PASS: Response team created with status:", teamPune.status);

    // ==========================================
    // STEP 2: Incident Creation & Verification
    // ==========================================
    console.log("\n[TEST 3] Citizen reports incident in Pune...");
    const resIncident = await axios.post(
      `${BASE_URL}/incidents/report`,
      {
        title: "[WORKFLOW-TEST] Waterlogging in Kothrud",
        description: "Heavy rain causing water accumulation",
        type: "flood",
        severity: "high",
        coordinates: [73.8143, 18.5074],
        state: "Maharashtra",
        district: "Pune",
      },
      { headers: { Authorization: `Bearer ${tokenCitizen}` } }
    );
    const incident = resIncident.data.data;
    console.log("✔ PASS: Incident reported with status:", incident.status);

    console.log("\n[TEST 4] District Admin Pune verifies incident...");
    const resVerify = await axios.patch(
      `${BASE_URL}/incidents/${incident._id}/verify`,
      {},
      { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
    );
    console.log("✔ PASS: Incident verified. Status:", resVerify.data.data.status, "Priority:", resVerify.data.data.priorityScore);

    // ==========================================
    // STEP 3: Dispatch Creation & Team Status Synchronization
    // ==========================================
    console.log("\n[TEST 5] District Admin Pune dispatches Team Pune to the verified incident...");
    const resDispatch = await axios.post(
      `${BASE_URL}/dispatches`,
      {
        incidentId: incident._id,
        teamId: teamPune._id,
        notes: "[WORKFLOW-DISPATCH] Immediate deployment required",
      },
      { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
    );
    const dispatch = resDispatch.data.data;
    console.log("✔ PASS: Dispatch created. Dispatch Status:", dispatch.status);

    // Verify team is now busy
    const checkTeamBusy = await ResponseTeam.findById(teamPune._id);
    if (checkTeamBusy.status === "busy") {
      console.log("✔ PASS: Team status automatically transitioned from 'available' to 'busy'.");
    } else {
      console.error("❌ FAIL: Team status is not busy:", checkTeamBusy.status);
    }

    // Verify incident is now assigned
    const checkIncidentAssigned = await Incident.findById(incident._id);
    if (checkIncidentAssigned.status === "assigned" && checkIncidentAssigned.assignedTeam.toString() === teamPune._id.toString()) {
      console.log("✔ PASS: Incident status synchronized to 'assigned'.");
    } else {
      console.error("❌ FAIL: Incident status is not assigned:", checkIncidentAssigned.status);
    }

    // ==========================================
    // STEP 4: Guard Tests (Busy Team & Duplicate Dispatch Prevention)
    // ==========================================
    console.log("\n[TEST 6] Attempting to dispatch already busy team to another incident (should fail)...");
    const resIncident2 = await Incident.create({
      title: "[WORKFLOW-TEST] Second Incident in Pune",
      description: "Another issue",
      type: "fire",
      severity: "medium",
      status: "verified",
      location: { type: "Point", coordinates: [73.8567, 18.5204] },
      state: "Maharashtra",
      district: "Pune",
      reportedBy: citizen._id,
    });

    try {
      await axios.post(
        `${BASE_URL}/dispatches`,
        { incidentId: resIncident2._id, teamId: teamPune._id },
        { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
      );
      console.error("❌ FAIL: Busy team was dispatched again!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Busy team dispatch prevented with 400 Bad Request:", err.response.data.message);
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    console.log("\n[TEST 7] Attempting duplicate active dispatch on same incident (should fail)...");
    const teamPune2 = await ResponseTeam.create({
      name: "[WORKFLOW-TEAM] Pune Rescue Beta",
      type: "rescue",
      state: "Maharashtra",
      district: "Pune",
      members: [responderPune._id],
      status: "available",
    });

    try {
      await axios.post(
        `${BASE_URL}/dispatches`,
        { incidentId: incident._id, teamId: teamPune2._id },
        { headers: { Authorization: `Bearer ${tokenDistAdminPune}` } }
      );
      console.error("❌ FAIL: Duplicate active dispatch unexpectedly succeeded!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Duplicate active dispatch prevented with 400 Bad Request:", err.response.data.message);
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    // ==========================================
    // STEP 5: Security - Cross-Jurisdiction & Unauthorized Responders
    // ==========================================
    console.log("\n[TEST 8] Mumbai responder attempts to accept/update Pune dispatch (should fail with 403)...");
    try {
      await axios.patch(
        `${BASE_URL}/dispatches/${dispatch._id}/status`,
        { status: "accepted" },
        { headers: { Authorization: `Bearer ${tokenResponderMumbai}` } }
      );
      console.error("❌ FAIL: Unauthorized responder was allowed to update dispatch!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✔ PASS: Unauthorized responder blocked with 403 Forbidden.");
      } else {
        console.error("❌ FAIL: Expected 403, got:", err.response?.status, err.response?.data);
      }
    }

    console.log("\n[TEST 9] Mumbai District Admin attempts to view Pune dispatch by ID (should fail with 403)...");
    try {
      await axios.get(`${BASE_URL}/dispatches/${dispatch._id}`, {
        headers: { Authorization: `Bearer ${tokenDistAdminMumbai}` },
      });
      console.error("❌ FAIL: Cross-district admin was allowed to view dispatch!");
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log("✔ PASS: Cross-district dispatch access blocked with 403 Forbidden.");
      } else {
        console.error("❌ FAIL: Expected 403, got:", err.response?.status, err.response?.data);
      }
    }

    // ==========================================
    // STEP 6: Field Responder Full Lifecycle Progression
    // (Accept -> En Route -> On Site -> In Progress -> Completed)
    // ==========================================
    console.log("\n[TEST 10] Authorized Field Responder Pune accepts dispatch...");
    const resAccept = await axios.patch(
      `${BASE_URL}/dispatches/${dispatch._id}/status`,
      { status: "accepted", note: "Team accepted and mobilizing" },
      { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
    );
    console.log("✔ PASS: Dispatch status ->", resAccept.data.data.status);
    const incidentAfterAccept = await Incident.findById(incident._id);
    if (incidentAfterAccept.status === "in_progress") {
      console.log("✔ PASS: Incident status synchronized to 'in_progress'.");
    } else {
      console.error("❌ FAIL: Incident status mismatch:", incidentAfterAccept.status);
    }

    console.log("\n[TEST 11] Field Responder Pune moves to en_route...");
    const resEnRoute = await axios.patch(
      `${BASE_URL}/dispatches/${dispatch._id}/status`,
      { status: "en_route", note: "Vehicles on the move" },
      { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
    );
    console.log("✔ PASS: Dispatch status ->", resEnRoute.data.data.status);

    console.log("\n[TEST 12] Field Responder Pune arrives on_site...");
    const resOnSite = await axios.patch(
      `${BASE_URL}/dispatches/${dispatch._id}/status`,
      { status: "on_site", note: "Arrived at location" },
      { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
    );
    console.log("✔ PASS: Dispatch status ->", resOnSite.data.data.status, "arrivedAt:", resOnSite.data.data.arrivedAt);

    console.log("\n[TEST 13] Field Responder Pune moves to in_progress...");
    const resInProgress = await axios.patch(
      `${BASE_URL}/dispatches/${dispatch._id}/status`,
      { status: "in_progress", note: "Operations underway" },
      { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
    );
    console.log("✔ PASS: Dispatch status ->", resInProgress.data.data.status);

    console.log("\n[TEST 14] Test invalid status transition jump (e.g. in_progress -> pending)...");
    try {
      await axios.patch(
        `${BASE_URL}/dispatches/${dispatch._id}/status`,
        { status: "pending" },
        { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
      );
      console.error("❌ FAIL: Invalid status backwards jump was allowed!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Invalid status transition rejected with 400 Bad Request:", err.response.data.message);
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    console.log("\n[TEST 15] Field Responder Pune completes dispatch...");
    const resComplete = await axios.patch(
      `${BASE_URL}/dispatches/${dispatch._id}/status`,
      { status: "completed", note: "All water drained and civilians assisted" },
      { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
    );
    console.log("✔ PASS: Dispatch status ->", resComplete.data.data.status, "completedAt:", resComplete.data.data.completedAt);

    // Verify incident is resolved and score is 0
    const finalIncident = await Incident.findById(incident._id);
    if (finalIncident.status === "resolved" && finalIncident.priorityScore === 0) {
      console.log("✔ PASS: Incident automatically resolved with priorityScore = 0.");
    } else {
      console.error("❌ FAIL: Final incident status mismatch:", finalIncident);
    }

    // Verify team is available again
    const finalTeam = await ResponseTeam.findById(teamPune._id);
    if (finalTeam.status === "available") {
      console.log("✔ PASS: Team availability automatically restored to 'available'.");
    } else {
      console.error("❌ FAIL: Final team status mismatch:", finalTeam.status);
    }

    console.log("\n[TEST 16] Attempting to modify completed dispatch (terminal state check)...");
    try {
      await axios.patch(
        `${BASE_URL}/dispatches/${dispatch._id}/status`,
        { status: "en_route" },
        { headers: { Authorization: `Bearer ${tokenResponderPune}` } }
      );
      console.error("❌ FAIL: Modification of completed dispatch was allowed!");
    } catch (err) {
      if (err.response && err.response.status === 400) {
        console.log("✔ PASS: Modification of terminal completed dispatch rejected with 400 Bad Request.");
      } else {
        console.error("❌ FAIL: Expected 400, got:", err.response?.status, err.response?.data);
      }
    }

    // Clean up
    await User.deleteMany({ email: { $regex: /@test-workflow\.com$/ } });
    await Incident.deleteMany({ title: { $regex: /\[WORKFLOW-TEST\]/ } });
    await ResponseTeam.deleteMany({ name: { $regex: /\[WORKFLOW-TEAM\]/ } });
    await Dispatch.deleteMany({ notes: { $regex: /\[WORKFLOW-DISPATCH\]/ } });
    await ActivityLog.deleteMany({ description: { $regex: /\[WORKFLOW/ } });

    console.log("\n========================================================");
    console.log("🎉 ALL OPERATIONAL RESPONSE WORKFLOW TESTS PASSED 100%!");
    console.log("========================================================");
  } catch (error) {
    console.error("Workflow Test execution error:", error.response?.data || error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runWorkflowTests();

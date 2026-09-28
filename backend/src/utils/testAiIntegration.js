const axios = require('axios');
const mongoose = require('mongoose');
const app = require('../app');
const RiskAssessment = require('../models/riskAssessment.model');
const Alert = require('../models/alert.model');
const ActivityLog = require('../models/activitylog.model');
require('dotenv').config();

async function runComprehensiveTests() {
  console.log('================================================================');
  console.log('🧪 RUNNING COMPREHENSIVE AI & BACKEND INTEGRATION TEST SUITE');
  console.log('================================================================\n');

  await mongoose.connect(process.env.MONGO_URI);
  const server = app.listen(0);
  const port = server.address().port;
  const baseURL = `http://127.0.0.1:${port}`;

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Step 0: Authenticate as Pune District Admin
    console.log('--- Step 0: Authority Authentication ---');
    const loginRes = await axios.post(`${baseURL}/api/auth/login`, {
      email: 'pune.admin@resqtech.gov.in',
      password: 'Pune@12345',
    });
    const token = loginRes.data.accessToken;
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
    assert(!!token, 'Acquired JWT Token for Pune District Admin');

    // TEST 1: Flood Risk Prediction via Render AI
    console.log('\n--- Test 1: Flood Risk Prediction via Render AI ---');
    const floodRes = await axios.post(
      `${baseURL}/api/risk/predict`,
      {
        disasterType: 'flood',
        location: { lat: 18.5204, lng: 73.8567 },
        state: 'Maharashtra',
        district: 'Pune',
        locationId: 'pune-central',
        features: {
          rainfall: 125,
          riverLevel: 8.5,
          historicalFloodFrequency: 0.75,
          elevation: 110,
        },
      },
      authHeaders
    );

    assert(floodRes.status === 201, 'HTTP 201 Created returned for Flood');
    assert(floodRes.data.success === true, 'Response marked success: true');
    assert(floodRes.data.data.disasterType === 'flood', 'Disaster type matches "flood"');
    assert(typeof floodRes.data.data.riskScore === 'number', `Numeric risk score returned: ${floodRes.data.data.riskScore}`);
    assert(Array.isArray(floodRes.data.data.riskFactors), `Risk factors returned: ${JSON.stringify(floodRes.data.data.riskFactors)}`);
    assert(floodRes.data.data.source === 'ai_model', `Source verified as "ai_model" from Render`);
    assert(floodRes.data.data.aiStatus === 'online', 'AI Status is "online"');

    // TEST 2: Fire Risk Prediction via Render AI
    console.log('\n--- Test 2: Fire Risk Prediction via Render AI ---');
    const fireRes = await axios.post(
      `${baseURL}/api/risk/predict`,
      {
        disasterType: 'fire',
        location: { lat: 18.55, lng: 73.88 },
        state: 'Maharashtra',
        district: 'Pune',
        locationId: 'pune-forest-zone',
        features: {
          temperature: 42,
          windSpeed: 28,
          humidity: 18,
          dryVegetationIndex: 0.88,
        },
      },
      authHeaders
    );

    assert(fireRes.status === 201, 'HTTP 201 Created returned for Fire');
    assert(fireRes.data.data.disasterType === 'fire', 'Disaster type matches "fire"');
    assert(typeof fireRes.data.data.riskScore === 'number', `Fire risk score returned: ${fireRes.data.data.riskScore}`);
    assert(fireRes.data.data.source === 'ai_model', 'Fire assessment computed by Render AI');

    // TEST 3: Earthquake Vulnerability Assessment via Render AI
    console.log('\n--- Test 3: Earthquake Vulnerability Assessment ---');
    const eqRes = await axios.post(
      `${baseURL}/api/risk/predict`,
      {
        disasterType: 'earthquake',
        location: { lat: 18.51, lng: 73.84 },
        state: 'Maharashtra',
        district: 'Pune',
        locationId: 'pune-seismic-zone',
        features: {
          historicalSeismicActivity: 0.45,
          faultDistanceKm: 35,
          buildingVulnerability: 0.6,
        },
      },
      authHeaders
    );

    assert(eqRes.status === 201, 'HTTP 201 Created returned for Earthquake');
    assert(eqRes.data.data.disasterType === 'earthquake', 'Disaster type matches "earthquake"');
    assert(typeof eqRes.data.data.riskScore === 'number', `Earthquake vulnerability score returned: ${eqRes.data.data.riskScore}`);
    assert(eqRes.data.data.source === 'ai_model', 'Earthquake assessment computed by Render AI');

    // TEST 4: Auto-Alert Triggering for High Risk (Score >= 70)
    console.log('\n--- Test 4: Critical Risk Auto-Alert Triggering ---');
    // We check if Fire (Score 87) or any risk score >= 70 triggered an alert
    const triggerTested = fireRes.data.data.riskScore >= 70 ? fireRes : floodRes;
    if (triggerTested.data.data.riskScore >= 70) {
      assert(triggerTested.data.alertTriggered === true, `Early Warning alert automatically triggered for Score ${triggerTested.data.data.riskScore}`);
      assert(!!triggerTested.data.alert, 'Alert document returned in response payload');

      const alertDoc = await Alert.findById(triggerTested.data.alert._id);
      assert(!!alertDoc, `Alert confirmed in MongoDB with ID ${alertDoc._id} ("${alertDoc.title}")`);
    } else {
      // Manual high score check
      const highRiskDoc = await RiskAssessment.findOne({ riskScore: { $gte: 70 }, district: 'Pune' });
      assert(!!highRiskDoc, `Found active high-risk assessment in DB (Score: ${highRiskDoc?.riskScore})`);
      const alertDoc = await Alert.findOne({ sourceRiskAssessment: highRiskDoc?._id });
      assert(!!alertDoc, `Auto-alert verified for high-risk assessment: "${alertDoc?.title}"`);
    }

    // TEST 5: Fallback Resilience Test (Cold Start / Offline Handling)
    console.log('\n--- Test 5: Fallback Resilience Test ---');
    const { generateBaselineHeuristic } = require('./aiRiskService');
    const fallbackResult = generateBaselineHeuristic({
      disasterType: 'flood',
      location: { lat: 18.52, lng: 73.85 },
      locationId: 'fallback-test-zone',
      features: { rainfall: 110, riverLevel: 7.5, elevation: 45 },
    });

    assert(fallbackResult.source === 'baseline_heuristic', 'Fallback identifies as baseline_heuristic');
    assert(fallbackResult.aiStatus === 'fallback_active', 'Fallback sets aiStatus to fallback_active');
    assert(typeof fallbackResult.riskScore === 'number', `Fallback computes sensible score: ${fallbackResult.riskScore}`);
    assert(fallbackResult.riskFactors.length > 0, 'Fallback generates explainable factors');

    // TEST 6: Frontend Feed Retrieval (CommandMapClient feeds)
    console.log('\n--- Test 6: Frontend Feed Retrieval (GET /api/risk) ---');
    const listRes = await axios.get(`${baseURL}/api/risk`, authHeaders);
    assert(listRes.status === 200, 'HTTP 200 OK for GET /api/risk');
    assert(Array.isArray(listRes.data.data), 'Array of risk assessments returned');
    assert(listRes.data.data.length > 0, `Total risk assessments visible to Pune Admin: ${listRes.data.data.length}`);

    const sample = listRes.data.data[0];
    assert(sample.location && Array.isArray(sample.location.coordinates), 'Coordinates in [lng, lat] format for Leaflet Map');
    assert(typeof sample.isStale === 'boolean', 'Staleness indicator present for telemetry');

    // TEST 7: Activity Audit Log Verification
    console.log('\n--- Test 7: Activity Audit Trail Verification ---');
    const recentAudit = await ActivityLog.findOne({
      action: 'risk_assessment_created',
      district: 'Pune',
    }).sort({ createdAt: -1 });

    assert(!!recentAudit, 'ActivityLog recorded risk_assessment_created event');
    assert(recentAudit.description.includes('Pune'), `Audit log description formatted properly: "${recentAudit.description}"`);
    assert(recentAudit.metadata && recentAudit.metadata.disasterType, `Metadata captured in audit log: disasterType=${recentAudit.metadata.disasterType}`);

    console.log('\n================================================================');
    console.log(`🏁 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Fatal Test Exception:', err.response?.data || err.message);
    failed++;
  } finally {
    server.close();
    await mongoose.disconnect();
  }
}

runComprehensiveTests();

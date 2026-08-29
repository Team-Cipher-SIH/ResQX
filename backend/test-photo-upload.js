const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const AUTHORITY_EMAIL = process.env.AUTHORITY_EMAIL || "";
const AUTHORITY_PASSWORD = process.env.AUTHORITY_PASSWORD || "";
const TEMP_IMAGE_PATH = path.join(__dirname, "test-image.jpg");
const results = [];

// A tiny 1x1 JPEG. It is embedded so the test does not depend on the network.
const JPEG_BASE64 = "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/AX//xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/AX//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Aqf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8Qf//EABQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8Qf//EABQQAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8Qf//Z";

async function request(method, urlPath, body, token, formData = false) {
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (formData) Object.assign(headers, body.getHeaders());
    const response = await axios({
      method,
      url: `${BASE_URL}${urlPath}`,
      data: body,
      headers,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
    return { status: response.status, body: response.data };
  } catch (error) {
    return { status: 0, body: { error: error.message } };
  }
}

function check(step, description, expectedStatus, response, condition = true) {
  const passed = response.status === expectedStatus && condition;
  results.push({ step, description, expected: expectedStatus, actual: response.status, result: passed ? "PASS" : "FAIL", body: response.body });
  console.log(`Step ${step}: ${passed ? "PASS" : "FAIL"} | ${description} | expected ${expectedStatus}, actual ${response.status}`);
  if (!passed) console.log("Response:", JSON.stringify(response.body, null, 2));
  return passed;
}

function makeForm(includePhoto, coordinates = "[80.3319,26.4499]") {
  const form = new FormData();
  form.append("title", "Test flood report");
  form.append("description", "Testing photo upload");
  form.append("type", "flood");
  if (coordinates !== undefined) form.append("coordinates", coordinates);
  form.append("state", "Uttar Pradesh");
  form.append("district", "Kanpur");
  if (includePhoto) form.append("photo", fs.createReadStream(TEMP_IMAGE_PATH), { filename: "test-image.jpg", contentType: "image/jpeg" });
  return form;
}

function hasUploadedUrl(response) {
  const urls = response.body && response.body.data && response.body.data.mediaUrls;
  return Array.isArray(urls) && urls.length > 0 && typeof urls[0] === "string" && (urls[0].includes("cloudinary.com") || urls[0].startsWith("http"));
}

async function main() {
  if (!AUTHORITY_EMAIL || !AUTHORITY_PASSWORD) {
    console.error("Set AUTHORITY_EMAIL and AUTHORITY_PASSWORD before running this test.");
    process.exitCode = 1;
    return;
  }

  fs.writeFileSync(TEMP_IMAGE_PATH, Buffer.from(JPEG_BASE64, "base64"));
  try {
    const email = `photo-test-${Date.now()}@test.com`;
    const password = "TestPassword123!";

    const registration = await request("POST", "/api/auth/register", { name: "Photo Test Citizen", email, password });
    check(1, "Register fresh citizen", 201, registration, Boolean(registration.body && (registration.body.accessToken || registration.body.token)));

    const login = await request("POST", "/api/auth/login", { email, password });
    const citizenToken = login.body && (login.body.accessToken || login.body.token);
    check(2, "Login citizen and receive access token", 200, login, Boolean(citizenToken));

    const authorityLogin = await request("POST", "/api/auth/login", {
      email: AUTHORITY_EMAIL,
      password: AUTHORITY_PASSWORD,
    });
    check(3, "Login authority and receive access token", 200, authorityLogin,
      Boolean(authorityLogin.body && (authorityLogin.body.accessToken || authorityLogin.body.token)));

    const withPhoto = await request("POST", "/api/incidents/report", makeForm(true), citizenToken, true);
    const photoIncident = withPhoto.body && withPhoto.body.data;
    check(4, "Create incident with photo and Cloudinary URL", 201, withPhoto, Boolean(photoIncident && hasUploadedUrl(withPhoto)));

    const withoutPhoto = await request("POST", "/api/incidents/report", makeForm(false), citizenToken, true);
    const noPhotoIncident = withoutPhoto.body && withoutPhoto.body.data;
    check(5, "Create incident without optional photo", 201, withoutPhoto, Boolean(noPhotoIncident && Array.isArray(noPhotoIncident.mediaUrls) && noPhotoIncident.mediaUrls.length === 0));

    const missingCoordinates = makeForm(false, undefined);
    const missing = await request("POST", "/api/incidents/report", missingCoordinates, citizenToken, true);
    check(6, "Reject report without coordinates", 400, missing);

    const invalidCoordinates = makeForm(false, "not-json");
    const invalid = await request("POST", "/api/incidents/report", invalidCoordinates, citizenToken, true);
    check(7, "Reject report with invalid coordinates JSON", 400, invalid);

    const noAuth = await request("POST", "/api/incidents/report", makeForm(false), null, true);
    check(8, "Reject multipart report without authorization", 401, noAuth);

    console.log("\n====================================");
    console.log("PHOTO UPLOAD API TEST RESULTS");
    console.log("====================================");
    console.table(results.map(({ step, description, expected, actual, result }) => ({ step, description, expected, actual, result })));
    const failed = results.filter((result) => result.result === "FAIL");
    console.log("====================================");
    console.log(`TOTAL: ${results.length - failed.length} PASSED / ${results.length} TESTS`);
    console.log(`FAILED: ${failed.length}`);
    console.log("====================================");
    process.exitCode = failed.length ? 1 : 0;
  } finally {
    if (fs.existsSync(TEMP_IMAGE_PATH)) fs.unlinkSync(TEMP_IMAGE_PATH);
  }
}

main().catch((error) => {
  console.error("Test runner failed:", error);
  if (fs.existsSync(TEMP_IMAGE_PATH)) fs.unlinkSync(TEMP_IMAGE_PATH);
  process.exitCode = 1;
});

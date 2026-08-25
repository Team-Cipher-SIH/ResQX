const axios = require("axios");

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";
const results = [];

async function request(method, path, body, token) {
  try {
    const response = await axios({
      method,
      url: `${BASE_URL}${path}`,
      data: body,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      validateStatus: () => true,
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

function tokenFrom(body) {
  return body && (body.accessToken || body.token);
}

function dataFrom(response) {
  return response.body && response.body.data;
}

function idsFrom(response) {
  return Array.isArray(response.body && response.body.data)
    ? response.body.data.map((post) => String(post._id))
    : [];
}

async function main() {
  const timestamp = Date.now();
  const password = "TestPassword123!";
  const emailA = `help-a-${timestamp}@test.com`;
  const emailB = `help-b-${timestamp}@test.com`;

  const registerA = await request("POST", "/api/auth/register", {
    name: "Help Test Citizen A",
    email: emailA,
    password,
  });
  check(1, "Register citizen A", 201, registerA, Boolean(tokenFrom(registerA.body)));

  const loginA = await request("POST", "/api/auth/login", { email: emailA, password });
  const tokenA = tokenFrom(loginA.body);
  check(2, "Login citizen A", 200, loginA, Boolean(tokenA));

  const registerB = await request("POST", "/api/auth/register", {
    name: "Help Test Citizen B",
    email: emailB,
    password,
  });
  check(3, "Register citizen B", 201, registerB, Boolean(tokenFrom(registerB.body)));

  const loginB = await request("POST", "/api/auth/login", { email: emailB, password });
  const tokenB = tokenFrom(loginB.body);
  check(4, "Login citizen B", 200, loginB, Boolean(tokenB));

  const postAResponse = await request("POST", "/api/help-posts", {
    type: "offer",
    title: "Blankets available",
    description: "Have 10 spare blankets",
    category: "clothing",
    state: "Uttar Pradesh",
    district: "Kanpur",
    contactNumber: "9999999999",
  }, tokenA);
  const postA = dataFrom(postAResponse);
  const postAId = postA && postA._id;
  check(5, "Citizen A creates offer post", 201, postAResponse, Boolean(postAId));

  const postBResponse = await request("POST", "/api/help-posts", {
    type: "request",
    title: "Need medicine",
    description: "Urgent need for insulin",
    category: "medical",
    state: "Uttar Pradesh",
    district: "Lucknow",
    contactNumber: "8888888888",
  }, tokenB);
  const postB = dataFrom(postBResponse);
  const postBId = postB && postB._id;
  check(6, "Citizen B creates request post", 201, postBResponse, Boolean(postBId));

  const missingType = await request("POST", "/api/help-posts", {
    title: "Missing type test",
    description: "This should fail",
    state: "Uttar Pradesh",
    district: "Kanpur",
    contactNumber: "9999999999",
  }, tokenA);
  check(7, "Reject post missing type", 400, missingType);

  const invalidType = await request("POST", "/api/help-posts", {
    type: "banana",
    title: "Invalid type test",
    description: "This should fail",
    state: "Uttar Pradesh",
    district: "Kanpur",
    contactNumber: "9999999999",
  }, tokenA);
  check(8, "Reject post with invalid type", 400, invalidType);

  const publicAll = await request("GET", "/api/help-posts");
  const publicIds = idsFrom(publicAll);
  check(9, "Public help-post list includes both open posts", 200, publicAll,
    publicAll.body && publicAll.body.count >= 2 && publicIds.includes(String(postAId)) && publicIds.includes(String(postBId)));

  const kanpurPosts = await request("GET", "/api/help-posts?district=Kanpur");
  const kanpurIds = idsFrom(kanpurPosts);
  check(10, "District filter returns Kanpur post only", 200, kanpurPosts,
    kanpurIds.includes(String(postAId)) && !kanpurIds.includes(String(postBId)));

  const requestPosts = await request("GET", "/api/help-posts?type=request");
  const requestIds = idsFrom(requestPosts);
  check(11, "Type filter returns request post only", 200, requestPosts,
    requestIds.includes(String(postBId)) && !requestIds.includes(String(postAId)));

  const myPostsA = await request("GET", "/api/help-posts/my-posts", null, tokenA);
  const myAIds = idsFrom(myPostsA);
  check(12, "Citizen A sees only own post with count 1", 200, myPostsA,
    myPostsA.body && myPostsA.body.count === 1 && myAIds.length === 1 && myAIds[0] === String(postAId));

  const wrongOwnerFulfill = await request("PATCH", `/api/help-posts/${postAId}/fulfill`, {}, tokenB);
  check(13, "Citizen B cannot fulfill citizen A post", 403, wrongOwnerFulfill);

  const fulfill = await request("PATCH", `/api/help-posts/${postAId}/fulfill`, {}, tokenA);
  check(14, "Citizen A fulfills own post", 200, fulfill,
    Boolean(fulfill.body && fulfill.body.data && fulfill.body.data.status === "fulfilled"));

  const fulfillAgain = await request("PATCH", `/api/help-posts/${postAId}/fulfill`, {}, tokenA);
  check(15, "Reject fulfilling an already fulfilled post", 400, fulfillAgain);

  const openAfterFulfill = await request("GET", "/api/help-posts");
  const openAfterIds = idsFrom(openAfterFulfill);
  check(16, "Default open list excludes A and keeps B", 200, openAfterFulfill,
    !openAfterIds.includes(String(postAId)) && openAfterIds.includes(String(postBId)));

  const fulfilledPosts = await request("GET", "/api/help-posts?status=fulfilled");
  const fulfilledIds = idsFrom(fulfilledPosts);
  check(17, "Fulfilled filter includes post A", 200, fulfilledPosts,
    fulfilledIds.includes(String(postAId)));

  const nonexistentId = "000000000000000000000000";
  const notFound = await request("PATCH", `/api/help-posts/${nonexistentId}/fulfill`, {}, tokenA);
  check(18, "Reject fulfilling a nonexistent post", 404, notFound);

  console.log("\n====================================");
  console.log("COMMUNITY HELP BOARD TEST RESULTS");
  console.log("====================================");
  console.table(results.map(({ step, description, expected, actual, result }) => ({ step, description, expected, actual, result })));
  const failed = results.filter((result) => result.result === "FAIL");
  console.log("====================================");
  console.log(`TOTAL: ${results.length - failed.length} PASSED / ${results.length} TESTS`);
  console.log(`FAILED: ${failed.length}`);
  console.log("====================================");
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((error) => {
  console.error("Test runner failed:", error);
  process.exitCode = 1;
});

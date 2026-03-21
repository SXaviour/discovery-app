// Authentication Endpoint Tests
// Run with: node tests/testAuth.js
//
// This script tests all 4 auth endpoints in sequence:
//   1. Register a new user
//   2. Try registering the same email again (should fail)
//   3. Log in with correct credentials
//   4. Get current user (/me) — should return user since we're logged in
//   5. Log out
//   6. Get current user (/me) again — should return 401 since we logged out
//
// The cookie variable is used to carry the session cookie between requests,
// simulating what a browser does automatically.

const BASE_URL = 'http://localhost:5000/api/auth';

// A unique email so re-running the tests doesn't fail on "already registered"
const TEST_EMAIL = `testuser_${Date.now()}@example.com`;
const TEST_PASSWORD = 'password123';
const TEST_USERNAME = 'testuser';

let sessionCookie = '';  // Stores the session cookie after login
let passed = 0;
let failed = 0;


// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Makes an HTTP request and returns { status, body, headers }
async function request(method, path, body = null, cookie = '') {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(cookie ? { Cookie: cookie } : {})
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${path}`, options);
  const data = await response.json();

  return {
    status: response.status,
    body: data,
    headers: response.headers
  };
}

// Logs a test result with a pass/fail indicator
function check(testName, condition, details = '') {
  if (condition) {
    console.log(`  PASS  ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL  ${testName}${details ? ` — ${details}` : ''}`);
    failed++;
  }
}


// ─── TESTS ────────────────────────────────────────────────────────────────────

async function testRegister() {
  console.log('\n--- Test: Register ---');

  const res = await request('POST', '/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    username: TEST_USERNAME
  });

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 201', res.status === 201, `got ${res.status}`);
  check('success is true', res.body.success === true);
  check('Returns user object', res.body.user !== undefined);
  check('Returns user email', res.body.user?.email === TEST_EMAIL);
  check('Does NOT return password', res.body.user?.password === undefined);
  check('Does NOT return password_hash', res.body.user?.password_hash === undefined);
}


async function testRegisterDuplicate() {
  console.log('\n--- Test: Register (duplicate email) ---');

  const res = await request('POST', '/register', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 400', res.status === 400, `got ${res.status}`);
  check('success is false', res.body.success === false);
  check('Returns "already registered" error', res.body.error?.includes('already'));
}


async function testRegisterValidation() {
  console.log('\n--- Test: Register (validation errors) ---');

  // Missing password
  const res1 = await request('POST', '/register', { email: 'test@test.com' });
  check('Missing password → 400', res1.status === 400, `got ${res1.status}`);

  // Invalid email
  const res2 = await request('POST', '/register', { email: 'notanemail', password: '123456' });
  check('Invalid email → 400', res2.status === 400, `got ${res2.status}`);

  // Short password
  const res3 = await request('POST', '/register', { email: 'new@test.com', password: '123' });
  check('Short password → 400', res3.status === 400, `got ${res3.status}`);
}


async function testLogin() {
  console.log('\n--- Test: Login ---');

  const res = await request('POST', '/login', {
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  // Extract the session cookie from the response so we can use it in later requests
  const setCookieHeader = res.headers.get('set-cookie');
  if (setCookieHeader) {
    sessionCookie = setCookieHeader.split(';')[0];
    console.log('  Session cookie received:', sessionCookie ? 'YES' : 'NO');
  }

  check('Status is 200', res.status === 200, `got ${res.status}`);
  check('success is true', res.body.success === true);
  check('Returns user object', res.body.user !== undefined);
  check('Session cookie set', setCookieHeader !== null, 'no set-cookie header');
}


async function testLoginWrongPassword() {
  console.log('\n--- Test: Login (wrong password) ---');

  const res = await request('POST', '/login', {
    email: TEST_EMAIL,
    password: 'wrongpassword'
  });

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 401', res.status === 401, `got ${res.status}`);
  check('success is false', res.body.success === false);
}


async function testGetMe() {
  console.log('\n--- Test: GET /me (while logged in) ---');

  const res = await request('GET', '/me', null, sessionCookie);

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 200', res.status === 200, `got ${res.status}`);
  check('success is true', res.body.success === true);
  check('Returns correct user', res.body.user?.email === TEST_EMAIL);
}


async function testGetMeUnauthenticated() {
  console.log('\n--- Test: GET /me (no session cookie) ---');

  const res = await request('GET', '/me');  // No cookie passed

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 401', res.status === 401, `got ${res.status}`);
  check('success is false', res.body.success === false);
}


async function testLogout() {
  console.log('\n--- Test: Logout ---');

  const res = await request('POST', '/logout', null, sessionCookie);

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 200', res.status === 200, `got ${res.status}`);
  check('success is true', res.body.success === true);
}


async function testGetMeAfterLogout() {
  console.log('\n--- Test: GET /me (after logout) ---');

  // Use the same cookie — but the session has been destroyed server-side
  const res = await request('GET', '/me', null, sessionCookie);

  console.log('  Response:', JSON.stringify(res.body, null, 2));

  check('Status is 401', res.status === 401, `got ${res.status}`);
  check('success is false', res.body.success === false);
}


// ─── RUN ALL TESTS ────────────────────────────────────────────────────────────

async function runTests() {
  console.log('='.repeat(50));
  console.log(' Authentication API Tests');
  console.log(' Testing against:', BASE_URL);
  console.log(' Test email:', TEST_EMAIL);
  console.log('='.repeat(50));

  try {
    await testRegister();
    await testRegisterDuplicate();
    await testRegisterValidation();
    await testLogin();
    await testLoginWrongPassword();
    await testGetMe();
    await testGetMeUnauthenticated();
    await testLogout();
    await testGetMeAfterLogout();

    console.log('\n' + '='.repeat(50));
    console.log(` Results: ${passed} passed, ${failed} failed`);
    console.log('='.repeat(50));

    if (failed > 0) {
      process.exit(1);
    }

  } catch (err) {
    console.error('\nFATAL ERROR - Is the server running?');
    console.error('Start it with: npm run dev');
    console.error('\nError details:', err.message);
    process.exit(1);
  }
}

runTests();

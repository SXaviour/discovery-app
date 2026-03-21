const db = require('../config/database');

async function testDatabaseConnection() {
  console.log('\n🔍 Testing Database Connection...\n');
  
  try {
    // Test 1: Basic connection
    console.log('Test 1: Basic Connection');
    const timeResult = await db.query('SELECT NOW() as current_time');
    console.log('✅ Connected! Current time:', timeResult.rows[0].current_time);
    
    // Test 2: Check if users table exists
    console.log('\nTest 2: Users Table');
    const usersCheck = await db.query(
      "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
    );
    console.log('✅ Users table exists:', usersCheck.rows[0].exists);
    
    // Test 3: Count users
    console.log('\nTest 3: User Count');
    const userCount = await db.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Total users:', userCount.rows[0].count);
    
    // Test 4: Check all tables
    console.log('\nTest 4: All Tables');
    const tablesResult = await db.query(
      `SELECT table_name 
       FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name`
    );
    console.log('✅ Tables in database:');
    tablesResult.rows.forEach(row => {
      console.log('   -', row.table_name);
    });
    
    console.log('\n✅ All tests passed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error.message);
    process.exit(1);
  }
}

testDatabaseConnection();
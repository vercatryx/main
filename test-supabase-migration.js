/**
 * Test script to verify Supabase migration
 * Run with: node test-supabase-migration.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // Test 1: Check meetings table
    console.log('1. Testing meetings table...');
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('count');

    if (meetingsError) {
      console.error('   ❌ Meetings table error:', meetingsError.message);
    } else {
      console.log('   ✅ Meetings table accessible');
    }

    // Test 2: Check chat_messages table
    console.log('2. Testing chat_messages table...');
    const { data: chatMessages, error: chatError } = await supabase
      .from('chat_messages')
      .select('count');

    if (chatError) {
      console.error('   ❌ Chat messages table error:', chatError.message);
    } else {
      console.log('   ✅ Chat messages table accessible');
    }

    // Test 3: Check projects table
    console.log('3. Testing projects table...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('count');

    if (projectsError) {
      console.error('   ❌ Projects table error:', projectsError.message);
    } else {
      console.log('   ✅ Projects table accessible');
    }

    // Test 4: Check availability_requests table
    console.log('4. Testing availability_requests table...');
    const { data: availability, error: availabilityError } = await supabase
      .from('availability_requests')
      .select('count');

    if (availabilityError) {
      console.error('   ❌ Availability requests table error:', availabilityError.message);
    } else {
      console.log('   ✅ Availability requests table accessible');
    }

    console.log('\n✨ All table tests completed!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

testConnection();

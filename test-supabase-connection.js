const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Function to parse .env file
const parseEnv = (filePath) => {
  const envFile = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(envFile)) {
    console.log(`Info: .env.local file not found at ${envFile}. Falling back to process.env.`);
    return {};
  }
  try {
    const data = fs.readFileSync(envFile, 'utf8');
    const envConfig = {};
    data.split('\n').forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envConfig[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    return envConfig;
  } catch (err) {
    console.error(`Error reading .env.local file: ${err.message}`);
    return {};
  }
};

// Load environment variables from .env.local
const env = parseEnv('.env.local');

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env.local file or as environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabase() {
  console.log('Connecting to Supabase...');

  try {
    // 1. Fetch tables from 'public' schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_public_tables');


    if (tablesError) {
      console.error('\nError fetching tables:', tablesError.message);
      console.log('This might indicate a connection or authentication problem. Please check your Supabase URL and service role key.');
      return;
    }

    console.log('\nSuccessfully connected to Supabase.');
    const tableNames = tables ? tables.map(t => t.tablename) : [];
    console.log('Found tables in "public" schema:', tableNames.length > 0 ? tableNames.join(', ') : 'No tables found.');

    // 2. Check if 'users' table exists
    if (tableNames.includes('users')) {
      console.log("\n✅ The 'users' table exists.");

      // 3. Try to query the 'users' table
      console.log("Attempting to query the 'users' table...");
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);

      if (usersError) {
        console.error("\nError querying 'users' table:", usersError.message);
        console.log("Hint: The error code is", usersError.code);
        console.log("This could be a row-level security (RLS) policy issue, or a problem with the service role key permissions.");
      } else {
        console.log("\n✅ Successfully queried the 'users' table.");
        console.log(`Found ${users.length} user(s) in the first result.`);
        if (users.length > 0) {
            console.log('Sample user data:', users);
        }
      }
    } else {
      console.error("\n❌ The 'users' table does not exist in the 'public' schema.");
      console.log("This is the cause of the 'PGRST205' error.");
      console.log("\nRECOMMENDATION: Please run your database migrations to create the 'users' table.");
      console.log("You can find instructions in the `MIGRATION-INSTRUCTIONS.md` file in your project root.");
    }

  } catch (e) {
    console.error('\nAn unexpected error occurred during the test:', e.message);
  }
}

async function createHelperFunction() {
    console.log('\nCreating helper function in Supabase to list tables...');
    const { error } = await supabase.rpc('sql', {
        sql: ""
            + "create or replace function get_public_tables()\n"
            + "returns table(tablename text) as $$"
            + "begin\n"
            + "    return query select tablename from pg_tables where schemaname = 'public';\n"
            + "end;\n"
            + "$$ language plpgsql;"
    });

    if (error) {
        console.error('Failed to create helper function. This might be a permissions issue.');
        console.error(error.message);
        return false;
    }
    console.log('Helper function created successfully.');
    return true;
}

async function run() {
    // Supabase JS v2 doesn't have a simple way to list tables, so we create a helper function.
    // Let's first try to create it. It might fail if it already exists or due to permissions, which is fine.
    await createHelperFunction();
    await testSupabase();
}

run();

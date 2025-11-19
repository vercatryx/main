/**
 * Migration Script: Clerk Users to Company-Based System
 *
 * This script migrates existing Clerk users to the new company-based structure:
 * 1. Fetches all Clerk users
 * 2. Creates user records in the new users table
 * 3. Updates projects to belong to default company
 * 4. Updates chat messages to link to new user IDs
 * 5. Updates meetings to link to new user IDs
 */

import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT_COMPANY_ID = '00000000-0000-0000-0000-000000000001';

interface ClerkUser {
  id: string;
  emailAddresses: Array<{ emailAddress: string }>;
  firstName: string | null;
  lastName: string | null;
  phoneNumbers: Array<{ phoneNumber: string }>;
  publicMetadata: {
    role?: string;
  };
}

async function migrateUsers() {
  console.log('Starting migration to company-based system...\n');

  try {
    // Step 1: Fetch all Clerk users
    console.log('Step 1: Fetching Clerk users...');
    const client = await clerkClient();
    const clerkUsersResponse = await client.users.getUserList({ limit: 100 });
    const clerkUsers = clerkUsersResponse.data;
    console.log(`Found ${clerkUsers.length} Clerk users\n`);

    // Step 2: Create users in the new users table
    console.log('Step 2: Creating users in database...');
    const userMappings: Map<string, string> = new Map(); // Clerk ID -> New User ID

    for (const clerkUser of clerkUsers) {
      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        console.log(`Skipping user ${clerkUser.id} - no email`);
        continue;
      }

      // Determine role (check if they have superuser role in Clerk)
      const isAdmin = clerkUser.publicMetadata?.role === 'superuser';

      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          company_id: DEFAULT_COMPANY_ID,
          clerk_user_id: clerkUser.id,
          email: email,
          first_name: clerkUser.firstName,
          last_name: clerkUser.lastName,
          phone: clerkUser.phoneNumbers[0]?.phoneNumber || null,
          role: isAdmin ? 'admin' : 'member',
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating user for ${email}:`, error.message);
        continue;
      }

      userMappings.set(clerkUser.id, newUser.id);
      console.log(`✓ Created user: ${email} (${isAdmin ? 'admin' : 'member'})`);
    }

    console.log(`\nCreated ${userMappings.size} users\n`);

    // Step 3: Update all projects to belong to default company
    console.log('Step 3: Updating projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .update({ company_id: DEFAULT_COMPANY_ID })
      .is('company_id', null)
      .select();

    if (projectsError) {
      console.error('Error updating projects:', projectsError.message);
    } else {
      console.log(`✓ Updated ${projects?.length || 0} projects\n`);
    }

    // Step 4: Update chat messages to link to new user IDs
    console.log('Step 4: Updating chat messages...');
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, userId')
      .is('user_id', null);

    if (messagesError) {
      console.error('Error fetching messages:', messagesError.message);
    } else {
      let updatedCount = 0;
      for (const message of messages || []) {
        const newUserId = userMappings.get(message.userId);
        if (newUserId) {
          const { error: updateError } = await supabase
            .from('chat_messages')
            .update({ user_id: newUserId })
            .eq('id', message.id);

          if (!updateError) {
            updatedCount++;
          }
        }
      }
      console.log(`✓ Updated ${updatedCount} chat messages\n`);
    }

    // Step 5: Update meetings to link to new user IDs
    console.log('Step 5: Updating meetings...');
    const { data: meetings, error: meetingsError } = await supabase
      .from('meetings')
      .select('id, host_user_id_old, participant_user_ids_old')
      .is('company_id', null);

    if (meetingsError) {
      console.error('Error fetching meetings:', meetingsError.message);
    } else {
      let updatedMeetings = 0;
      for (const meeting of meetings || []) {
        const newHostUserId = userMappings.get(meeting.host_user_id_old);
        const newParticipantIds = (meeting.participant_user_ids_old || [])
          .map((clerkId: string) => userMappings.get(clerkId))
          .filter((id): id is string => id !== undefined);

        if (newHostUserId) {
          const { error: updateError } = await supabase
            .from('meetings')
            .update({
              company_id: DEFAULT_COMPANY_ID,
              host_user_id: newHostUserId,
              participant_user_ids: newParticipantIds,
            })
            .eq('id', meeting.id);

          if (!updateError) {
            updatedMeetings++;
          }
        }
      }
      console.log(`✓ Updated ${updatedMeetings} meetings\n`);
    }

    console.log('Migration completed successfully! ✓\n');
    console.log('Summary:');
    console.log(`- Users created: ${userMappings.size}`);
    console.log(`- Projects updated: ${projects?.length || 0}`);
    console.log(`- Default company ID: ${DEFAULT_COMPANY_ID}`);
    console.log('\nNext steps:');
    console.log('1. Verify data in Supabase dashboard');
    console.log('2. Test admin portal company management');
    console.log('3. Test client portal with company context');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateUsers()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

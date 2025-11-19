/**
 * Clerk Webhook Handler
 * Handles user.created events to link Clerk accounts with database users
 * and activate pending users
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';
import { getUserByEmail, updateUser } from '@/lib/users';

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: 'Missing svix headers' },
      { status: 400 }
    );
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Get the Webhook secret from environment
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('CLERK_WEBHOOK_SECRET is not set');
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  // Create a new Svix instance with the webhook secret
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the webhook signature
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  // Handle the webhook event
  const eventType = evt.type;

  if (eventType === 'user.created') {
    const { id, email_addresses, first_name, last_name } = evt.data;

    // Get the primary email
    const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id);

    if (!primaryEmail) {
      console.error('No primary email found for user:', id);
      return NextResponse.json(
        { error: 'No primary email found' },
        { status: 400 }
      );
    }

    const email = primaryEmail.email_address;

    try {
      // Find the user in our database by email
      const dbUser = await getUserByEmail(email);

      if (!dbUser) {
        console.log(`No database user found for email: ${email}`);
        // This is okay - user might have signed up directly without invitation
        return NextResponse.json({
          success: true,
          message: 'User not found in database (direct signup)'
        });
      }

      // Update the database user with Clerk ID and activate them
      await updateUser(dbUser.id, {
        clerk_user_id: id,
        status: 'active',
        first_name: first_name || dbUser.first_name,
        last_name: last_name || dbUser.last_name,
      });

      console.log(`Successfully linked Clerk user ${id} to database user ${dbUser.id} and activated`);

      return NextResponse.json({
        success: true,
        message: 'User linked and activated',
        userId: dbUser.id
      });
    } catch (error) {
      console.error('Error processing user.created webhook:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to process webhook' },
        { status: 500 }
      );
    }
  }

  // Return success for other event types
  return NextResponse.json({ success: true, eventType });
}

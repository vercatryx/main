import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';
import { getServerSupabaseClient, getClientSupabaseClient } from '@/lib/supabase';

/**
 * Debug endpoint to test chat messages access
 * Tests both server-side and client-side Supabase clients
 * GET /api/debug/chat-test?projectId=xxx
 */
export async function GET(req: Request) {
  try {
    await requireSuperAdmin();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'projectId query parameter required' },
        { status: 400 }
      );
    }

    const results: Record<string, any> = {
      projectId,
      timestamp: new Date().toISOString(),
    };

    // Test server-side client
    try {
      const serverClient = getServerSupabaseClient();
      const { data: serverData, error: serverError } = await serverClient
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .limit(5);

      results.serverSide = {
        success: !serverError,
        error: serverError ? {
          message: serverError.message,
          code: serverError.code,
          details: serverError.details,
          hint: serverError.hint,
        } : null,
        messageCount: serverData?.length || 0,
        sampleMessage: serverData?.[0] || null,
      };
    } catch (error) {
      results.serverSide = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Test client-side client (simulating what the browser would do)
    try {
      const clientClient = getClientSupabaseClient();
      const { data: clientData, error: clientError } = await clientClient
        .from('chat_messages')
        .select('*')
        .eq('project_id', projectId)
        .limit(5);

      results.clientSide = {
        success: !clientError,
        error: clientError ? {
          message: clientError.message,
          code: clientError.code,
          details: clientError.details,
          hint: clientError.hint,
        } : null,
        messageCount: clientData?.length || 0,
        sampleMessage: clientData?.[0] || null,
      };
    } catch (error) {
      results.clientSide = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }

    // Check environment variables
    results.env = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL.substring(0, 30)}...` 
        : 'NOT SET',
      verca_SUPABASE_URL: process.env.verca_SUPABASE_URL 
        ? `${process.env.verca_SUPABASE_URL.substring(0, 30)}...` 
        : 'NOT SET',
      actualServerUrl: process.env.verca_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    };

    return NextResponse.json(results, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Error in chat test endpoint:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to test chat',
        hint: error instanceof Error && error.message.includes('Forbidden')
          ? 'This endpoint requires super admin access'
          : undefined,
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}


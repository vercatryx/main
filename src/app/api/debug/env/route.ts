import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/permissions';

/**
 * Debug endpoint to download environment variables
 * Only accessible to super admins
 * GET /api/debug/env
 */
export async function GET() {
  try {
    // Require super admin authentication
    await requireSuperAdmin();

    // Determine which URL getServerSupabaseClient() will actually use
    const actualUrl = process.env.verca_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
    const actualServiceKey = process.env.verca_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'NOT SET';

    // Collect all relevant environment variables
    const envVars: Record<string, string> = {};
    
    // Supabase variables
    envVars['NEXT_PUBLIC_SUPABASE_URL'] = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET';
    envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...` 
      : 'NOT SET';
    envVars['verca_SUPABASE_URL'] = process.env.verca_SUPABASE_URL || 'NOT SET';
    envVars['verca_SUPABASE_SERVICE_ROLE_KEY'] = process.env.verca_SUPABASE_SERVICE_ROLE_KEY 
      ? `${process.env.verca_SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` 
      : 'NOT SET';
    envVars['SUPABASE_SERVICE_ROLE_KEY'] = process.env.SUPABASE_SERVICE_ROLE_KEY 
      ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` 
      : 'NOT SET';
    
    // Actual values being used by getServerSupabaseClient
    envVars['ACTUAL_SERVER_SUPABASE_URL'] = actualUrl;
    envVars['ACTUAL_SERVER_SERVICE_KEY_SOURCE'] = process.env.verca_SUPABASE_SERVICE_ROLE_KEY 
      ? 'verca_SUPABASE_SERVICE_ROLE_KEY' 
      : (process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 'NOT SET');
    
    // Other important variables (redact sensitive ones)
    const otherVars = [
      'NODE_ENV',
      'VERCEL',
      'VERCEL_ENV',
      'VERCEL_URL',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
      'NEXT_PUBLIC_CLERK_SIGN_UP_URL',
      'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
      'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
    ];

    otherVars.forEach(key => {
      const value = process.env[key];
      if (value) {
        // Redact keys/secrets
        if (key.includes('KEY') || key.includes('SECRET')) {
          envVars[key] = `${value.substring(0, 20)}...`;
        } else {
          envVars[key] = value;
        }
      } else {
        envVars[key] = 'NOT SET';
      }
    });

    // Build the text file content
    const timestamp = new Date().toISOString();
    let content = `Environment Variables Debug Report\n`;
    content += `Generated: ${timestamp}\n`;
    content += `Environment: ${process.env.NODE_ENV || 'unknown'}\n`;
    content += `Vercel: ${process.env.VERCEL ? 'Yes' : 'No'}\n`;
    if (process.env.VERCEL_URL) {
      content += `Vercel URL: ${process.env.VERCEL_URL}\n`;
    }
    content += `\n${'='.repeat(80)}\n\n`;

    content += `SUPABASE CONFIGURATION:\n`;
    content += `${'-'.repeat(80)}\n`;
    content += `NEXT_PUBLIC_SUPABASE_URL: ${envVars['NEXT_PUBLIC_SUPABASE_URL']}\n`;
    content += `NEXT_PUBLIC_SUPABASE_ANON_KEY: ${envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']}\n`;
    content += `\n`;
    content += `verca_SUPABASE_URL: ${envVars['verca_SUPABASE_URL']}\n`;
    content += `verca_SUPABASE_SERVICE_ROLE_KEY: ${envVars['verca_SUPABASE_SERVICE_ROLE_KEY']}\n`;
    content += `SUPABASE_SERVICE_ROLE_KEY: ${envVars['SUPABASE_SERVICE_ROLE_KEY']}\n`;
    content += `\n`;
    content += `ACTUAL VALUES USED BY getServerSupabaseClient():\n`;
    content += `  URL: ${envVars['ACTUAL_SERVER_SUPABASE_URL']}\n`;
    content += `  URL Source: ${actualUrl === process.env.verca_SUPABASE_URL ? 'verca_SUPABASE_URL' : 'NEXT_PUBLIC_SUPABASE_URL'}\n`;
    content += `  Service Key Source: ${envVars['ACTUAL_SERVER_SERVICE_KEY_SOURCE']}\n`;
    content += `\n`;

    content += `OTHER ENVIRONMENT VARIABLES:\n`;
    content += `${'-'.repeat(80)}\n`;
    Object.entries(envVars)
      .filter(([key]) => !key.startsWith('NEXT_PUBLIC_SUPABASE') && 
                         key !== 'verca_SUPABASE_URL' && 
                         key !== 'verca_SUPABASE_SERVICE_ROLE_KEY' &&
                         key !== 'SUPABASE_SERVICE_ROLE_KEY' &&
                         key !== 'ACTUAL_SERVER_SUPABASE_URL' &&
                         key !== 'ACTUAL_SERVER_SERVICE_KEY_SOURCE')
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([key, value]) => {
        content += `${key}: ${value}\n`;
      });

    content += `\n${'='.repeat(80)}\n\n`;
    content += `NOTES:\n`;
    content += `- Keys ending with "..." are redacted for security\n`;
    content += `- ACTUAL_SERVER_SUPABASE_URL shows which URL getServerSupabaseClient() will use\n`;
    content += `- URL Priority: verca_SUPABASE_URL > NEXT_PUBLIC_SUPABASE_URL\n`;
    content += `- Service Key Priority: verca_SUPABASE_SERVICE_ROLE_KEY > SUPABASE_SERVICE_ROLE_KEY\n`;
    content += `- Check if URLs start with "https://" - missing protocol causes DNS errors\n`;

    // Return as downloadable text file
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="env-debug-${timestamp.replace(/:/g, '-').split('.')[0]}.txt"`,
      },
    });
  } catch (error) {
    console.error('Error generating env debug file:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to generate debug file',
        hint: error instanceof Error && error.message.includes('Forbidden') 
          ? 'This endpoint requires super admin access' 
          : undefined
      },
      { status: error instanceof Error && error.message.includes('Forbidden') ? 403 : 500 }
    );
  }
}


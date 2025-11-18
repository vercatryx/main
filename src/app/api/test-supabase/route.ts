import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '@/lib/supabase';

export async function GET() {
  try {
    const result = await testSupabaseConnection();

    if (result.success) {
      return NextResponse.json({
        status: 'success',
        message: result.message,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        {
          status: 'error',
          message: result.message,
          error: result.error,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Test Supabase error:', error);
    return NextResponse.json(
      {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

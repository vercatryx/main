import { createClient } from '@supabase/supabase-js';

// Create a single supabase client for interacting with your database
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Test Supabase connection
 */
export async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase.from('_test').select('*').limit(1);

    if (error) {
      // If table doesn't exist, that's fine - connection works
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        return { success: true, message: 'Supabase connected successfully!' };
      }
      throw error;
    }

    return { success: true, message: 'Supabase connected successfully!', data };
  } catch (error) {
    console.error('Supabase connection error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error
    };
  }
}

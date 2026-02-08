// Extended Supabase client that allows querying tables not yet in the generated types
// This is needed because some tables exist in the database but haven't been added to types.ts yet
import { supabase } from './client';

// Cast to any for tables not in the generated schema
export const supabaseExtended = supabase as any;

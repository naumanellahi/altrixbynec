// Type augmentation for Supabase tables and RPCs that exist in the database
// but are not yet reflected in the auto-generated types.ts file.
// This prevents TypeScript errors when querying these tables.

import type { SupabaseClient } from '@supabase/supabase-js';

// Extend the supabase client's from() and rpc() to accept any string
// This is a temporary workaround until the types are regenerated
declare module '@supabase/supabase-js' {
  interface SupabaseClient<
    Database = any,
    SchemaName extends string & keyof Database = 'public' extends keyof Database
      ? 'public' & keyof Database
      : string & keyof Database,
    Schema extends Record<string, any> = Database[SchemaName] extends Record<string, any>
      ? Database[SchemaName]
      : any
  > {
    from(relation: string): any;
    rpc(fn: string, args?: Record<string, any>, options?: any): any;
  }
}

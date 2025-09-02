import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabase() {
    console.log('🔍 Checking Database State...\n');
    
    // Check what tables exist
    const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public');
    
    if (tablesError) {
        // Try RPC function approach
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_public_tables', {});
        
        if (rpcError) {
            console.log('❌ Cannot query tables directly. Checking known tables...\n');
            
            // Test known tables
            const knownTables = [
                'profiles',
                'events', 
                'challenges',
                'social_posts',
                'direct_messages',
                'loyalty_transactions',
                'rewards_catalog',
                'organizations',
                'organization_members',
                'invites'
            ];
            
            for (const table of knownTables) {
                try {
                    const { count, error } = await supabase
                        .from(table)
                        .select('*', { count: 'exact', head: true });
                    
                    if (!error) {
                        console.log(`✅ Table exists: ${table} (${count || 0} rows)`);
                    } else {
                        console.log(`❌ Table missing: ${table}`);
                    }
                } catch (e) {
                    console.log(`❌ Table missing: ${table}`);
                }
            }
        }
    } else {
        console.log(`📊 Found ${tables?.length || 0} tables in public schema:\n`);
        tables?.forEach(t => console.log(`  - ${t.table_name}`));
    }
    
    console.log('\n🔍 Checking RPC Functions...\n');
    
    // Test critical RPC functions
    const rpcFunctions = [
        'is_admin',
        'is_organization_admin',
        'is_platform_admin',
        'get_user_available_points',
        'get_dashboard_data_v2',
        'increment_event_capacity'
    ];
    
    for (const func of rpcFunctions) {
        try {
            // Try to call with minimal params
            const { error } = await supabase.rpc(func, {});
            if (!error || error.message.includes('required')) {
                console.log(`✅ Function exists: ${func}`);
            } else {
                console.log(`❌ Function missing: ${func}`);
            }
        } catch (e) {
            console.log(`❌ Function missing: ${func}`);
        }
    }
    
    console.log('\n🔍 Checking Storage Buckets...\n');
    
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
        console.log('❌ Cannot list storage buckets');
    } else {
        console.log(`📦 Found ${buckets?.length || 0} storage buckets:`);
        buckets?.forEach(b => console.log(`  - ${b.name}`));
    }
    
    console.log('\n✅ Database check complete!');
}

checkDatabase().catch(console.error);

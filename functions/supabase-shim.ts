import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export function createClientFromRequest(req: Request) {
    const supabaseUrl = Deno.env.get("RDSN_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL") ?? "";
    // For edge functions, usually we use service_role to bypass RLS, or anon_key with user's token
    // Let's use service_role for 'asServiceRole' fallback and ANON_KEY for standard.
    const supabaseAnonKey = Deno.env.get("RDSN_SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("RDSN_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? supabaseAnonKey;

    // Client with user's auth token
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader || '' } }
    });

    // Client with Service Role bypass
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    const isStandardColumn = (key: string) => ['id', 'created_at'].includes(key);

    const packData = (payload: any) => {
        const std: any = {};
        const dyn: any = {};
        for (const [key, value] of Object.entries(payload)) {
            if (isStandardColumn(key)) {
                std[key] = value;
            } else {
                dyn[key] = value;
            }
        }
        if (Object.keys(dyn).length > 0) {
            std.j_data = dyn;
        }
        return std;
    };

    const unpackData = (row: any) => {
        if (!row) return row;
        const { j_data, ...rest } = row;
        return { ...rest, ...(j_data || {}) };
    };

    const createEntityAdapter = (client) => (entityName) => ({
        list: async () => {
            const { data, error } = await client.from(entityName).select('*');
            if (error) throw error;
            return data ? data.map(unpackData) : [];
        },
        filter: async (filters: any) => {
            let query = client.from(entityName).select('*');
            for (const [key, value] of Object.entries(filters)) {
                const colName = isStandardColumn(key) ? key : `j_data->>${key}`;

                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    if ((value as any).$in) {
                        query = query.in(colName, (value as any).$in);
                    } else if ((value as any).$nin) {
                        query = query.not(colName, 'in', `(${(value as any).$nin.join(',')})`);
                    } else if ((value as any).$ne) {
                        query = query.neq(colName, (value as any).$ne);
                    }
                } else {
                    if (typeof value === 'boolean') {
                        query = query.eq(isStandardColumn(key) ? key : `j_data->${key}`, value);
                    } else {
                        query = query.eq(colName, value);
                    }
                }
            }
            const { data, error } = await query;
            if (error) throw error;
            return data ? data.map(unpackData) : [];
        },
        create: async (payload) => {
            const { data, error } = await client.from(entityName).insert(packData(payload)).select().single();
            if (error) throw error;
            return unpackData(data);
        },
        update: async (id, payload) => {
            const { data: current } = await client.from(entityName).select('j_data').eq('id', id).single();
            const mevcutDyn = (current && current.j_data) ? current.j_data : {};

            const updateData = packData(payload);
            if (updateData.j_data) {
                updateData.j_data = { ...mevcutDyn, ...updateData.j_data };
            }

            const { data, error } = await client.from(entityName).update(updateData).eq('id', id).select().single();
            if (error) throw error;
            return unpackData(data);
        },
        delete: async (id) => {
            const { error } = await client.from(entityName).delete().eq('id', id);
            if (error) throw error;
            return true;
        },
        bulkCreate: async (payloads: any[]) => {
            if (!Array.isArray(payloads)) throw new Error('Payload must be an array for bulkCreate');
            const packed = payloads.map(packData);
            const { data, error } = await client.from(entityName).insert(packed).select();
            if (error) throw error;
            return data ? data.map(unpackData) : [];
        }
    });

    const stdAdapter = createEntityAdapter(supabase);
    const srvAdapter = createEntityAdapter(supabaseService);

    return {
        auth: supabase.auth,
        entities: new Proxy({}, {
            get: (target, prop) => {
                if (!target[prop]) target[prop] = stdAdapter(prop);
                return target[prop];
            }
        }),
        asServiceRole: {
            entities: new Proxy({}, {
                get: (target, prop) => {
                    if (!target[prop]) target[prop] = srvAdapter(prop);
                    return target[prop];
                }
            })
        }
    };
}

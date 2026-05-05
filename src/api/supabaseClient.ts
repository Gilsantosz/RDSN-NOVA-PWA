import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnvConfig } from '../utils/hybridContext';
import SessionManager, { User } from '../lib/sessionManager';

const { supabaseUrl, supabaseAnonKey } = getEnvConfig();

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storageKey: 'rdsn-auth-token'
    }
});

const isStandardColumn = (key: string) => ['id', 'created_at'].includes(key);

const packData = (payload: Record<string, any>) => {
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

export interface EntityAdapter<T = any> {
    list: (sort?: string, limit?: number) => Promise<T[]>;
    filter: (filters: Record<string, any>, sort?: string) => Promise<T[]>;
    create: (payload: Partial<T>) => Promise<T>;
    update: (id: string | number, payload: Partial<T>) => Promise<T>;
    delete: (id: string | number) => Promise<boolean>;
    bulkCreate: (payloads: Partial<T>[]) => Promise<T[]>;
    subscribe: (callback: (payload: any) => void) => () => void;
}

const createEntityAdapter = (entityName: string): EntityAdapter => ({
    list: async (sort, limitCount) => {
        let query = supabase.from(entityName).select('*');
        if (sort) {
            const isDesc = sort.startsWith('-');
            const column = isDesc ? sort.substring(1) : sort;
            const sortColumn = isStandardColumn(column) ? column : `j_data->>${column}`;
            query = query.order(sortColumn, { ascending: !isDesc });
        }
        if (limitCount) {
            query = query.limit(limitCount);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data ? data.map(unpackData) : [];
    },
    filter: async (filters, sort) => {
        let query = supabase.from(entityName).select('*');
        for (const [key, value] of Object.entries(filters)) {
            const isStd = isStandardColumn(key);
            // ->> extrai como text; -> extrai como JSONB (incompatível com .eq() direto)
            const colName = isStd ? key : `j_data->>${key}`;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Operadores especiais: $in, $nin, $ne, $null
                if (value.$in) {
                    query = query.in(colName, value.$in);
                } else if (value.$nin) {
                    query = (query as any).not(colName, 'in', `(${value.$nin.join(',')})`);
                } else if (value.$ne) {
                    query = query.neq(colName, value.$ne);
                } else if (value.$null === true) {
                    query = query.is(colName, null);
                } else if (value.$null === false) {
                    query = (query as any).not(colName, 'is', null);
                }
            } else if (typeof value === 'boolean') {
                // Booleanos em JSONB: ->> retorna "true"/"false" como texto
                query = query.eq(colName, value.toString());
            } else {
                query = query.eq(colName, value);
            }
        }
        if (sort) {
            const isDesc = sort.startsWith('-');
            const column = isDesc ? sort.substring(1) : sort;
            const sortColumn = isStandardColumn(column) ? column : `j_data->>${column}`;
            query = query.order(sortColumn, { ascending: !isDesc });
        }
        const { data, error } = await query;
        if (error) throw error;
        return data ? data.map(unpackData) : [];
    },
    create: async (payload) => {
        const { data, error } = await supabase.from(entityName).insert(packData(payload)).select().single();
        if (error) throw error;
        return unpackData(data);
    },
    update: async (id, payload) => {
        // Obter os dados dinâmicos atuais para não sobrescrever
        const { data: current } = await supabase.from(entityName).select('j_data').eq('id', id).single();
        const mevcutDyn = (current && current.j_data) ? current.j_data : {};

        const updateData = packData(payload);
        if (updateData.j_data) {
            updateData.j_data = { ...mevcutDyn, ...updateData.j_data };
        }

        const { data, error } = await supabase.from(entityName).update(updateData).eq('id', id).select().single();
        if (error) throw error;
        return unpackData(data);
    },
    delete: async (id) => {
        const { error } = await supabase.from(entityName).delete().eq('id', id);
        if (error) throw error;
        return true;
    },
    bulkCreate: async (payloads) => {
        if (!Array.isArray(payloads)) throw new Error('Payload must be an array for bulkCreate');
        const packed = payloads.map(packData);
        const { data, error } = await supabase.from(entityName).insert(packed).select();
        if (error) throw error;
        return data ? data.map(unpackData) : [];
    },
    subscribe: (callback) => {
        const channel = supabase
            .channel(`${entityName}_changes`)
            .on('postgres_changes', { event: '*', schema: 'public', table: entityName } as any, (payload: any) => {
                const newRec = payload.new ? unpackData(payload.new) : null;
                const oldRec = payload.old ? unpackData(payload.old) : null;
                callback({ ...payload, new: newRec, old: oldRec });
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }
});

interface IRDSNClient {
    auth: any;
    functions: any;
    entities: Record<string, EntityAdapter>;
    asServiceRole: {
        entities: Record<string, EntityAdapter>;
    };
    appLogs?: any;
}

// Mock rdsn client to Supabase bridge
export const rdsn: IRDSNClient = {
    auth: {
        ...supabase.auth,
        me: async () => {
            console.log('[AUTH] Recuperando sessão do usuário...');
            // Tenta Supabase Nativo
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                console.log('[AUTH] Sessão Supabase ok, buscando perfil estendido:', user.id);
                const { data: profile } = await supabase.from('usuarios').select('*').eq('id', user.id).single();
                console.log('[AUTH] Perfil carregado:', profile?.id);
                const finalUser = { ...user, ...(profile || {}) } as any;
                // Normaliza role para o Shim
                if (finalUser.role_custom) finalUser.role = finalUser.role_custom.toLowerCase();
                return finalUser;
            }

            // Fallback para SessionManager (Local)
            console.log('[AUTH] Nenhuma sessão ativa no Supabase, tentando SessionManager...');
            try {
                const sessionUser = SessionManager.getUser();
                if (sessionUser) {
                    console.log('[AUTH] Sessão local encontrada:', (sessionUser as any).username);
                    // Normaliza para o Shim (espera 'role' em minúsculo)
                    return {
                        ...sessionUser,
                        role: sessionUser.role_custom?.toLowerCase() || 'user'
                    };
                }
            } catch (e) {
                console.error('[AUTH] Erro ao ler sessão local:', e);
            }

            console.log('[AUTH] Nenhuma sessão ativa encontrada');
            return null;
        },
        logout: async () => {
            return await supabase.auth.signOut();
        }
    },
    functions: {
        invoke: async (functionName: string, payloadOrOptions: any = {}) => {
            let body = payloadOrOptions;
            if (payloadOrOptions && payloadOrOptions.body) {
                body = payloadOrOptions.body;
            }

            // SIMULADOR LOCAL PARA EDGE FUNCTIONS COMPLEXAS SEM DOCKER/CLI
            try {
                if (functionName === 'alocarNumerosAutomatico') {
                    const module = await import('./alocarNumerosAutomatico.js' as any);
                    return await module.alocarNumerosAutomatico(body, rdsn as any);
                }

                if (functionName === 'sincronizarBaixasComPCP') {
                    const module = await import('./sincronizarBaixasComPCP.js' as any);
                    return await module.sincronizarBaixasComPCP(body, rdsn as any);
                }

                if (functionName === 'registrarEtiqueta') {
                    const module = await import('./registrarEtiqueta.js' as any);
                    return await module.registrarEtiqueta(body, rdsn as any);
                }

                if (functionName === 'enviarWebhook') {
                    const module = await import('./enviarWebhook.js' as any);
                    return await module.enviarWebhook(body, rdsn as any);
                }

                if (functionName === 'validarIntervalosNumeracao') {
                    const module = await import('./validarIntervalosNumeracao.js' as any);
                    return await module.validarIntervalosNumeracao(body, rdsn as any);
                }

                if (functionName === 'redefinirParaCopia') {
                    const module = await import('./redefinirParaCopia.js' as any);
                    return await module.redefinirParaCopia(body, rdsn as any);
                }

                if (functionName === 'backupDados') {
                    const module = await import('./backupDados.js' as any);
                    return await module.backupDados(body, rdsn as any);
                }

                if (functionName === 'restaurarBackup') {
                    const module = await import('./restaurarBackup.js' as any);
                    return await module.restaurarBackup(body, rdsn as any);
                }

                const { data, error } = await supabase.functions.invoke(functionName, {
                    body: body,
                });
                if (error) throw error;

                if (data && data.success !== undefined) {
                    return { data: data };
                }
                return { data };
            } catch (err) {
                console.error(`Error invoking function ${functionName}:`, err);
                throw err;
            }
        }
    },
    entities: new Proxy({}, {
        get: (target: any, prop: string) => {
            if (!target[prop]) {
                target[prop] = createEntityAdapter(prop);
            }
            return target[prop];
        }
    }) as any,
    asServiceRole: {
        entities: new Proxy({}, {
            get: (target: any, prop: string) => {
                if (!target[prop]) {
                    target[prop] = createEntityAdapter(prop);
                }
                return target[prop];
            }
        }) as any
    },
    appLogs: {
        logUserInApp: async (page: string) => {
             // Mock para log de atividades se necessário
             console.log(`[APP-LOG] Usuario na pagina: ${page}`);
        }
    }
};

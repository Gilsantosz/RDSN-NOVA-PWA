import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isStandardColumn = (key) => ['id', 'created_at'].includes(key);

const packData = (payload) => {
    const std = {};
    const dyn = {};
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

const unpackData = (row) => {
    if (!row) return row;
    const { j_data, ...rest } = row;
    return { ...rest, ...(j_data || {}) };
};

const createEntityAdapter = (entityName) => ({
    list: async () => {
        const { data, error } = await supabase.from(entityName).select('*');
        if (error) throw error;
        return data ? data.map(unpackData) : [];
    },
    filter: async (filters) => {
        let query = supabase.from(entityName).select('*');
        for (const [key, value] of Object.entries(filters)) {
            const colName = isStandardColumn(key) ? key : `j_data->>${key}`;

            if (value && typeof value === 'object' && !Array.isArray(value)) {
                // Tratamento para operadores como $in, $nin
                if (value.$in) {
                    query = query.in(colName, value.$in);
                } else if (value.$nin) {
                    query = query.not(colName, 'in', `(${value.$nin.join(',')})`);
                } else if (value.$ne) {
                    query = query.neq(colName, value.$ne);
                }
            } else {
                if (typeof value === 'boolean') {
                    const isStd = isStandardColumn(key);
                    query = query.eq(isStd ? key : `j_data->${key}`, value);
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
            .on('postgres_changes', { event: '*', schema: 'public', table: entityName }, payload => {
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

// Mock rdsn client to Supabase bridge
export const rdsn = {
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
                const finalUser = { ...user, ...(profile || {}) };
                // Normaliza role para o Shim
                if (finalUser.role_custom) finalUser.role = finalUser.role_custom.toLowerCase();
                return finalUser;
            }

            // Fallback para SessionManager (Local)
            console.log('[AUTH] Nenhuma sessão ativa no Supabase, tentando SessionManager...');
            try {
                const localData = localStorage.getItem('internalUser');
                if (localData) {
                    const payload = JSON.parse(localData);
                    const sessionUser = payload?.user || payload;
                    if (sessionUser) {
                        console.log('[AUTH] Sessão local encontrada:', sessionUser.username);
                        // Normaliza para o Shim (espera 'role' em minúsculo)
                        return {
                            ...sessionUser,
                            role: sessionUser.role_custom?.toLowerCase() || 'user'
                        };
                    }
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
        invoke: async (functionName, payloadOrOptions = {}) => {
            let body = payloadOrOptions;
            if (payloadOrOptions && payloadOrOptions.body) {
                body = payloadOrOptions.body;
            }

            // SIMULADOR LOCAL PARA EDGE FUNCTIONS COMPLEXAS SEM DOCKER/CLI
            // Se a função estiver na lista de mocks offline (criados devido ao problema de deploy)
            // ele rodará localmente consumindo a mesma API nativa
            try {
                if (functionName === 'alocarNumerosAutomatico') {
                    const module = await import('./alocarNumerosAutomatico.js');
                    return await module.alocarNumerosAutomatico(body);
                }

                if (functionName === 'sincronizarBaixasComPCP') {
                    const module = await import('./sincronizarBaixasComPCP.js');
                    return await module.sincronizarBaixasComPCP(body);
                }

                if (functionName === 'registrarEtiqueta') {
                    const module = await import('./registrarEtiqueta.js');
                    return await module.registrarEtiqueta(body);
                }

                if (functionName === 'enviarWebhook') {
                    const module = await import('./enviarWebhook.js');
                    return await module.enviarWebhook(body);
                }

                if (functionName === 'validarIntervalosNumeracao') {
                    const module = await import('./validarIntervalosNumeracao.js');
                    return await module.validarIntervalosNumeracao(body);
                }

                if (functionName === 'redefinirParaCopia') {
                    const module = await import('./redefinirParaCopia.js');
                    return await module.redefinirParaCopia(body, rdsn);
                }

                if (functionName === 'backupDados') {
                    const module = await import('./backupDados.js');
                    return await module.backupDados(body, rdsn);
                }

                if (functionName === 'restaurarBackup') {
                    const module = await import('./restaurarBackup.js');
                    return await module.restaurarBackup(body, rdsn);
                }

                // Exemplo fallback se falhar (mantém o envio via network se for as outras que não mapeamos ainda)
                const { data, error } = await supabase.functions.invoke(functionName, {
                    body: body,
                });
                if (error) throw error;

                // RDSN usually returned an object containing { data: { success: true, ... } }
                // Some code might expect the outer response to have `.data`
                // and the inner payload to be the actual function response.
                // Edge functions usually return JSON directly.
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
    /** @type {Record<string, any>} */
    entities: new Proxy({}, {
        get: (target, prop) => {
            if (!target[prop]) {
                target[prop] = createEntityAdapter(prop);
            }
            return target[prop];
        }
    }),
    asServiceRole: {
        /** @type {Record<string, any>} */
        entities: new Proxy({}, {
            get: (target, prop) => {
                if (!target[prop]) {
                    target[prop] = createEntityAdapter(prop);
                }
                return target[prop];
            }
        })
    }
};

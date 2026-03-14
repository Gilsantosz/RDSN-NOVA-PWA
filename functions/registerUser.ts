import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const { full_name, username, password, email, setores_permitidos } = await req.json();

    // Validações
    if (!full_name?.trim()) {
      return buildCorsResponse({ error: 'Nome completo é obrigatório' }, { status: 400 });
    }
    if (!username?.trim() || username.length < 3) {
      return buildCorsResponse({ error: 'Nome de usuário deve ter no mínimo 3 caracteres' }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return buildCorsResponse({ error: 'Senha deve ter no mínimo 4 caracteres' }, { status: 400 });
    }

    // Verificar se username já existe
    const existingUsers = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ 
      username: username.toLowerCase() 
    });
    
    if (existingUsers.length > 0) {
      return buildCorsResponse({ error: 'Nome de usuário já existe' }, { status: 409 });
    }

    // Criar usuário
    const passwordHash = btoa(password);
    const newUser = await rdsn.asServiceRole.entities.UsuarioInterno.create({
      full_name: full_name.trim(),
      username: username.toLowerCase(),
      password_hash: passwordHash,
      email: email?.trim() || '',
      role_custom: 'Operador',
      setores_permitidos: setores_permitidos || [],
      ativo: true
    });

    // Registrar auditoria
    await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
      usuario_admin_id: 'SISTEMA',
      usuario_admin_nome: 'Sistema de Registro',
      usuario_afetado_id: newUser.id,
      usuario_afetado_nome: newUser.full_name,
      tipo_acao: 'CRIACAO_USUARIO',
      descricao: `Novo usuário registrado: ${newUser.username}`,
      dados_depois: JSON.stringify({
        username: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email,
        role_custom: newUser.role_custom
      })
    });

    return buildCorsResponse({ 
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        full_name: newUser.full_name,
        email: newUser.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});
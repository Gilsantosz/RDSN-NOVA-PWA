import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);
    const { action, data, internalUser } = await req.json();

    // Validar usuário interno
    if (!internalUser || internalUser.role_custom !== 'Admin') {
      return buildCorsResponse({ error: 'Acesso negado. Apenas administradores.' }, { status: 403 });
    }

    switch (action) {
      case 'create': {
        // Verificar se username já existe
        const existing = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ username: data.username });
        if (existing.length > 0) {
          return buildCorsResponse({ error: 'Nome de usuário já existe' }, { status: 400 });
        }

        // Hash da senha
        const passwordHash = btoa(data.password);

        // Criar usuário
        const newUser = await rdsn.asServiceRole.entities.UsuarioInterno.create({
          username: data.username,
          password_hash: passwordHash,
          full_name: data.full_name,
          email: data.email || '',
          role_custom: data.role_custom,
          celula: data.celula || '',
          telefone: data.telefone || '',
          setores_permitidos: data.setores_permitidos || [],
          permissoes_customizadas: data.permissoes_customizadas || {},
          ativo: true
        });

        // Registrar auditoria
        await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
          usuario_admin_id: internalUser.id,
          usuario_admin_nome: internalUser.full_name,
          usuario_afetado_id: newUser.id,
          usuario_afetado_nome: newUser.full_name,
          tipo_acao: 'CRIACAO_USUARIO',
          descricao: `Novo usuário ${newUser.full_name} (${newUser.username}) criado com função ${newUser.role_custom}`,
          dados_depois: JSON.stringify({
            username: newUser.username,
            full_name: newUser.full_name,
            role_custom: newUser.role_custom,
            setores_permitidos: newUser.setores_permitidos
          })
        });

        return buildCorsResponse({ success: true, user: newUser });
      }

      case 'update': {
        const userBefore = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ id: data.id });
        await rdsn.asServiceRole.entities.UsuarioInterno.update(data.id, data.updates);
        
        // Registrar auditoria
        if (userBefore.length > 0) {
          await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
            usuario_admin_id: internalUser.id,
            usuario_admin_nome: internalUser.full_name,
            usuario_afetado_id: data.id,
            usuario_afetado_nome: userBefore[0].full_name,
            tipo_acao: 'EDICAO_USUARIO',
            descricao: `Dados do usuário ${userBefore[0].full_name} foram atualizados`,
            dados_antes: JSON.stringify({
              full_name: userBefore[0].full_name,
              role_custom: userBefore[0].role_custom,
              setores_permitidos: userBefore[0].setores_permitidos,
              ativo: userBefore[0].ativo
            }),
            dados_depois: JSON.stringify(data.updates)
          });
        }
        
        return buildCorsResponse({ success: true });
      }

      case 'resetPassword': {
        const passwordHash = btoa(data.newPassword);
        const user = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ id: data.id });
        await rdsn.asServiceRole.entities.UsuarioInterno.update(data.id, { password_hash: passwordHash });
        
        // Registrar auditoria
        if (user.length > 0) {
          await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
            usuario_admin_id: internalUser.id,
            usuario_admin_nome: internalUser.full_name,
            usuario_afetado_id: data.id,
            usuario_afetado_nome: user[0].full_name,
            tipo_acao: 'RESET_SENHA',
            descricao: `Senha do usuário ${user[0].full_name} (${user[0].username}) foi redefinida`
          });
        }
        
        return buildCorsResponse({ success: true });
      }

      case 'delete': {
        const user = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ id: data.id });
        await rdsn.asServiceRole.entities.UsuarioInterno.delete(data.id);
        
        // Registrar auditoria
        if (user.length > 0) {
          await rdsn.asServiceRole.entities.AuditoriaUsuarios.create({
            usuario_admin_id: internalUser.id,
            usuario_admin_nome: internalUser.full_name,
            usuario_afetado_id: data.id,
            usuario_afetado_nome: user[0].full_name,
            tipo_acao: 'EXCLUSAO_USUARIO',
            descricao: `Usuário ${user[0].full_name} (${user[0].username}) foi excluído do sistema`,
            dados_antes: JSON.stringify({
              username: user[0].username,
              full_name: user[0].full_name,
              role_custom: user[0].role_custom
            })
          });
        }
        
        return buildCorsResponse({ success: true });
      }

      case 'list': {
        const usuarios = await rdsn.asServiceRole.entities.UsuarioInterno.list('-created_date');
        return buildCorsResponse({ usuarios });
      }

      default:
        return buildCorsResponse({ error: 'Ação inválida' }, { status: 400 });
    }
  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});
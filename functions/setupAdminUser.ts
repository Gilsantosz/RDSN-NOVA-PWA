import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    // Buscar todos os setores
    const setores = await rdsn.asServiceRole.entities.Setor.list();
    const setorIds = setores.map(s => s.id);

    // Tentar encontrar usuário admin existente
    const usuariosExistentes = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ 
      username: 'admin' 
    });

    const passwordHash = btoa('admin123');

    if (usuariosExistentes.length > 0) {
      // Atualizar admin existente para ter acesso a todos os setores
      await rdsn.asServiceRole.entities.UsuarioInterno.update(usuariosExistentes[0].id, {
        role_custom: 'Admin',
        setores_permitidos: setorIds,
        ativo: true
      });
      
      return buildCorsResponse({
        success: true,
        message: 'Admin atualizado com acesso a todos os setores'
      });
    } else {
      // Criar novo usuário admin
      const novoAdmin = await rdsn.asServiceRole.entities.UsuarioInterno.create({
        username: 'admin',
        password_hash: passwordHash,
        full_name: 'Administrador',
        email: 'admin@sistema.local',
        role_custom: 'Admin',
        setores_permitidos: setorIds,
        ativo: true
      });

      return buildCorsResponse({
        success: true,
        message: 'Admin criado com sucesso',
        user_id: novoAdmin.id
      });
    }

  } catch (error) {
    console.error('Setup admin error:', error);
    return buildCorsResponse({ 
      error: error.message 
    }, { status: 500 });
  }
});
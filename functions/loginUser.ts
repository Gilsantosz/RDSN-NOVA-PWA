import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const payload = await req.json();
    console.log('Login attempt:', { username: payload.username, hasPassword: !!payload.password });
    
    const rdsn = createClientFromRequest(req);
    const { username, password } = payload;

    // Verificar senha padrão do admin
    if (username === 'admin' && password === 'admin123') {
      // Admin com senha padrão tem acesso a todos os setores
      return buildCorsResponse({
        success: true,
        user: {
          id: 'admin',
          full_name: 'Administrador',
          email: 'admin@system.local',
          username: 'admin',
          role_custom: 'Admin',
          celula: null,
          setores_permitidos: ['TODOS'],
          permissoes_customizadas: {}
        }
      });
    }

    // Buscar usuário no banco de dados
    console.log('Buscando usuário:', username);
    const usuarios = await rdsn.asServiceRole.entities.UsuarioInterno.filter({ username: username });
    console.log('Usuários encontrados:', usuarios.length);
    
    if (usuarios.length > 0) {
      const usuario = usuarios[0];
      
      // Verificar se está ativo
      if (usuario.ativo === false) {
        return buildCorsResponse({ error: 'Usuário inativo' }, { status: 403 });
      }
      
      // Verificar senha - comparar com hash armazenado
      const passwordHash = btoa(password);
      console.log('Verificando senha - hash match:', usuario.password_hash === passwordHash);
      if (usuario.password_hash && usuario.password_hash === passwordHash) {
        // Atualizar último acesso
        await rdsn.asServiceRole.entities.UsuarioInterno.update(usuario.id, {
          ultimo_acesso: new Date().toISOString()
        });
        
        return buildCorsResponse({
          success: true,
          user: {
            id: usuario.id,
            full_name: usuario.full_name,
            email: usuario.email,
            username: usuario.username,
            role_custom: usuario.role_custom,
            celula: usuario.celula,
            setores_permitidos: usuario.setores_permitidos || [],
            permissoes_customizadas: usuario.permissoes_customizadas || {}
          }
        });
      }
    }

    return buildCorsResponse({ error: 'Usuário ou senha incorretos' }, { status: 401 });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    return buildCorsResponse({ error: error.message || 'Erro desconhecido', stack: error.stack }, { status: 500 });
  }
});
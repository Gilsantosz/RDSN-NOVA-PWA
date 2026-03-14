import { handleCors, buildCorsResponse } from './cors.ts';
import { createClientFromRequest } from './supabase-shim.ts';

Deno.serve(async (req) => {
  try {
  const corsHandler = handleCors(req);
  if (corsHandler) return corsHandler;

    const rdsn = createClientFromRequest(req);

    // Criar usuário admin
    const admin = await rdsn.asServiceRole.entities.User.create({
      username: "admin",
      password_hash: btoa("adm123"),
      full_name: "Administrador",
      email: "admin@sistema.com",
      role_custom: "Admin",
      ativo: true
    });

    return buildCorsResponse({
      success: true,
      message: "Usuário admin criado com sucesso",
      user: admin
    });
  } catch (error) {
    return buildCorsResponse({ error: error.message }, { status: 500 });
  }
});
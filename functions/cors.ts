export const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export function handleCors(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }
    return null;
}

export function buildCorsResponse(body: any, init?: ResponseInit) {
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(corsHeaders)) {
        headers.set(key, value);
    }

    return new Response(JSON.stringify(body), {
        ...init,
        headers,
    });
}

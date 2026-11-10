const APPS_SCRIPT_ENDPOINT = 'https://script.google.com/macros/s/AKfycby-gY_7B0qWmVha6MdzNNxBbI-D1ioxf-KR-TvIgZOIl_ekKsP1N2alYrtJmn4QehRX/exec';
const MAX_REQUEST_BYTES = 32 * 1024;

function allowedOrigins(env) {
    return String(env.ALLOWED_ORIGINS || '')
        .split(',')
        .map(origin => origin.trim())
        .filter(Boolean);
}

function corsHeaders(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        'Cache-Control': 'no-store',
        'Vary': 'Origin'
    };
}

function jsonResponse(body, status, origin) {
    const headers = new Headers(corsHeaders(origin));
    headers.set('Content-Type', 'application/json; charset=utf-8');
    return new Response(JSON.stringify(body), { status, headers });
}

function proxyError(message, status, origin) {
    return jsonResponse({ success: false, message }, status, origin);
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';
        const isAllowedOrigin = allowedOrigins(env).includes(origin);

        if (!isAllowedOrigin) {
            return new Response(JSON.stringify({
                success: false,
                message: 'This website origin is not allowed.'
            }), {
                status: 403,
                headers: { 'Content-Type': 'application/json; charset=utf-8' }
            });
        }

        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders(origin)
            });
        }

        if (request.method !== 'POST') {
            return proxyError('Only POST requests are supported.', 405, origin);
        }

        const contentType = request.headers.get('Content-Type') || '';
        if (contentType.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
            return proxyError('The request must use JSON.', 415, origin);
        }

        const declaredLength = Number(request.headers.get('Content-Length') || 0);
        if (declaredLength > MAX_REQUEST_BYTES) {
            return proxyError('The request is too large.', 413, origin);
        }

        let body;
        try {
            body = await request.text();
        } catch {
            return proxyError('The request body could not be read.', 400, origin);
        }
        if (new TextEncoder().encode(body).byteLength > MAX_REQUEST_BYTES) {
            return proxyError('The request is too large.', 413, origin);
        }

        try {
            JSON.parse(body);
        } catch {
            return proxyError('The request body must be valid JSON.', 400, origin);
        }

        let backendResponse;
        try {
            backendResponse = await fetch(APPS_SCRIPT_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body
            });
        } catch {
            return proxyError('The backend could not be reached.', 502, origin);
        }

        let backendResult;
        try {
            backendResult = JSON.parse(await backendResponse.text());
        } catch {
            return proxyError('The backend response could not be verified.', 502, origin);
        }
        if (!backendResult || typeof backendResult !== 'object' || Array.isArray(backendResult)) {
            return proxyError('The backend response could not be verified.', 502, origin);
        }

        return jsonResponse(backendResult, backendResponse.status, origin);
    }
};

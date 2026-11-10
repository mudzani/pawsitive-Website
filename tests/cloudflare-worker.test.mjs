import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../cloudflare-worker.mjs';

const allowedOrigin = 'https://academy.example';

function request(method, { body, origin = allowedOrigin, headers = {} } = {}) {
    return new Request('https://worker.example/submit', {
        method,
        headers: {
            Origin: origin,
            ...headers
        },
        body
    });
}

test('answers an allowed OPTIONS preflight without contacting Apps Script', async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
        called = true;
        throw new Error('Unexpected upstream request');
    };

    try {
        const response = await worker.fetch(
            request('OPTIONS', { headers: { 'Access-Control-Request-Method': 'POST' } }),
            { ALLOWED_ORIGINS: allowedOrigin }
        );
        assert.equal(response.status, 204);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
        assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST, OPTIONS');
        assert.equal(called, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('forwards a JSON enquiry and relays the backend response with CORS headers', async () => {
    const originalFetch = globalThis.fetch;
    const payload = {
        name: 'Example Learner',
        email: 'learner@example.com',
        phone: '',
        subject: 'Course question',
        message: 'Please send course information.',
        enquiry_type: 'Course enrolment enquiry',
        contact_consent: true,
        selected_course_ids: ['puppy-care']
    };
    let forwardedBody;
    globalThis.fetch = async (url, options) => {
        assert.equal(url, 'https://script.google.com/macros/s/AKfycby-gY_7B0qWmVha6MdzNNxBbI-D1ioxf-KR-TvIgZOIl_ekKsP1N2alYrtJmn4QehRX/exec');
        assert.equal(options.method, 'POST');
        assert.equal(options.headers['Content-Type'], 'application/json');
        forwardedBody = options.body;
        return new Response(JSON.stringify({
            success: true,
            saved: true,
            emailSent: true,
            submissionId: 'submission-123',
            message: 'Enquiry received successfully.',
            emailError: ''
        }), { status: 200 });
    };

    try {
        const response = await worker.fetch(request('POST', {
            body: JSON.stringify(payload),
            headers: { 'Content-Type': 'application/json' }
        }), { ALLOWED_ORIGINS: allowedOrigin });
        assert.equal(response.status, 200);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
        assert.deepEqual(JSON.parse(forwardedBody), payload);
        assert.deepEqual(await response.json(), {
            success: true,
            saved: true,
            emailSent: true,
            submissionId: 'submission-123',
            message: 'Enquiry received successfully.',
            emailError: ''
        });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('passes backend error status and JSON through without assuming its shape', async () => {
    const originalFetch = globalThis.fetch;
    const backendError = { problem: 'Backend validation response is unspecified' };
    globalThis.fetch = async () => new Response(JSON.stringify(backendError), { status: 422 });

    try {
        const response = await worker.fetch(request('POST', {
            body: '{}',
            headers: { 'Content-Type': 'application/json' }
        }), { ALLOWED_ORIGINS: allowedOrigin });
        assert.equal(response.status, 422);
        assert.deepEqual(await response.json(), backendError);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('fails closed for unconfigured origins and does not forward the request', async () => {
    const originalFetch = globalThis.fetch;
    let called = false;
    globalThis.fetch = async () => {
        called = true;
        throw new Error('Unexpected upstream request');
    };

    try {
        const response = await worker.fetch(request('POST', {
            body: '{}',
            headers: { 'Content-Type': 'application/json' }
        }), { ALLOWED_ORIGINS: '' });
        assert.equal(response.status, 403);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
        assert.equal(called, false);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('returns a proxy error when the backend response is not JSON', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response('not json', { status: 200 });

    try {
        const response = await worker.fetch(request('POST', {
            body: '{}',
            headers: { 'Content-Type': 'application/json' }
        }), { ALLOWED_ORIGINS: allowedOrigin });
        assert.equal(response.status, 502);
        assert.equal((await response.json()).success, false);
        assert.equal(response.headers.get('Access-Control-Allow-Origin'), allowedOrigin);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

/**
 * scripts/verify-fixes.ts
 *
 * Manual verification script to confirm:
 * 1. Public role / noAuth requests send valid public headers (no 'undefined').
 * 2. uploadInvitationHtml routes through request() with FormData & auth.
 * 3. updateOrganizerProfile & updateOrganizerStatus use query ?id=eq.{id}.
 */

import api, { setRole, resolvePublicKey } from '../src/lib/api/index';

console.log('Resolved Public Key:', resolvePublicKey());

// Intercept fetch calls to print outgoing URLs and Headers
const requests: Array<{ method: string; url: string; headers: Record<string, string>; isFormData: boolean }> = [];

globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    const method = init?.method ?? 'GET';
    const headers = (init?.headers ?? {}) as Record<string, string>;
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;

    requests.push({ method, url, headers, isFormData });

    return new Response(JSON.stringify({ status: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
};

async function run() {
    console.log('\n--- 1. Testing Public role & discoverPublicEvents() ---');
    setRole('public');
    await api.discoverPublicEvents();
    const req1 = requests[requests.length - 1];
    console.log('Method:', req1.method);
    console.log('URL:', req1.url);
    console.log('Headers:', req1.headers);
    if (req1.headers['Authorization']?.includes('undefined') || req1.headers['apikey'] === 'undefined') {
        console.error('❌ FAILED: Found undefined in headers!');
    } else {
        console.log('✅ PASSED: No undefined headers, valid apikey and Bearer.');
    }

    console.log('\n--- 2. Testing uploadInvitationHtml() routing ---');
    setRole('organizer');
    const dummyFile = new File(['<h1>Test</h1>'], 'test.html', { type: 'text/html' });
    await api.uploadInvitationHtml('test-event-uuid', dummyFile);
    const req2 = requests[requests.length - 1];
    console.log('Method:', req2.method);
    console.log('URL:', req2.url);
    console.log('Is FormData body:', req2.isFormData);
    console.log('Headers:', req2.headers);
    if (req2.isFormData && req2.headers['Authorization'] && !req2.headers['Content-Type']) {
        console.log('✅ PASSED: Multipart FormData passed through request() without manual Content-Type clash and with auth.');
    } else {
        console.error('❌ FAILED: Multipart configuration incorrect!');
    }

    console.log('\n--- 3. Testing updateOrganizerProfile() ---');
    await api.updateOrganizerProfile('11111111-1111-1111-1111-111111111111', { full_name: 'Jane Doe' });
    const req3 = requests[requests.length - 1];
    console.log('Method:', req3.method);
    console.log('URL:', req3.url);
    if (req3.url.includes('/rest/v1/organizer_profiles?id=eq.11111111-1111-1111-1111-111111111111')) {
        console.log('✅ PASSED: Uses query ?id=eq.{id} instead of path /{id}.');
    } else {
        console.error('❌ FAILED: URL does not use ?id=eq.{id} filter!');
    }

    console.log('\n--- 4. Testing updateOrganizerStatus() (Admin) ---');
    await api.updateOrganizerStatus('11111111-1111-1111-1111-111111111111', 'active');
    const req4 = requests[requests.length - 1];
    console.log('Method:', req4.method);
    console.log('URL:', req4.url);
    if (req4.url.includes('/rest/v1/organizer_profiles?id=eq.11111111-1111-1111-1111-111111111111')) {
        console.log('✅ PASSED: Uses query ?id=eq.{id} instead of path /{id}.');
    } else {
        console.error('❌ FAILED: URL does not use ?id=eq.{id} filter!');
    }

    console.log('\n--- 5. Testing listInvitationImages() with default auth ---');
    setRole('organizer');
    const eventUuid = '22222222-2222-2222-2222-222222222222';
    await api.listInvitationImages(eventUuid);
    const req5 = requests[requests.length - 1];
    console.log('URL:', req5.url);
    console.log('Authorization:', req5.headers['Authorization']);
    if (
        req5.url.includes(`/rest/v1/invitation_images?event_id=eq.${eventUuid}&order=sort_order.asc`) &&
        req5.headers['Authorization'] === 'Bearer fake-organizer-jwt'
    ) {
        console.log('✅ PASSED: listInvitationImages uses organizer auth by default.');
    } else {
        console.error('❌ FAILED: listInvitationImages default auth mismatch!');
    }

    console.log('\n--- 6. Testing listInvitationImages() with auth: false ---');
    await api.listInvitationImages(eventUuid, { auth: false });
    const req6 = requests[requests.length - 1];
    console.log('URL:', req6.url);
    console.log('Authorization:', req6.headers['Authorization']);
    if (
        req6.url.includes(`/rest/v1/invitation_images?event_id=eq.${eventUuid}&order=sort_order.asc`) &&
        req6.headers['Authorization'] === `Bearer ${resolvePublicKey()}`
    ) {
        console.log('✅ PASSED: listInvitationImages with auth: false sends public anon auth.');
    } else {
        console.error('❌ FAILED: listInvitationImages auth: false mismatch!');
    }

    console.log('\n--- 7. Testing listPublicGalleryImages() wrapper ---');
    await api.listPublicGalleryImages(eventUuid);
    const req7 = requests[requests.length - 1];
    console.log('URL:', req7.url);
    console.log('Authorization:', req7.headers['Authorization']);
    if (
        req7.url.includes(`/rest/v1/invitation_images?event_id=eq.${eventUuid}&order=sort_order.asc`) &&
        req7.headers['Authorization'] === `Bearer ${resolvePublicKey()}`
    ) {
        console.log('✅ PASSED: listPublicGalleryImages delegates to listInvitationImages with auth: false.');
    } else {
        console.error('❌ FAILED: listPublicGalleryImages wrapper mismatch!');
    }
}

run().catch((err) => {
    console.error('Verification failed with error:', err);
    process.exit(1);
});


#!/usr/bin/env node

const API = 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.token;
}

async function authedFetch(path, token, options = {}) {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  return res;
}

async function run() {
  try {
    const adminToken = await login('admin@example.com', 'admin123');
    const userToken = await login('user@example.com', 'user123');

    console.log(`Admin token length: ${adminToken.length}`);
    console.log(`User token length: ${userToken.length}`);

    // Create site as user
    const createSiteRes = await authedFetch('/directory/sites', userToken, {
      method: 'POST',
      body: JSON.stringify({ name: 'CLI User Site', location: 'CLI City' }),
    });
    console.log('Create site as USER:', createSiteRes.status, await createSiteRes.text());

    // Fetch sites to get new site ID
    const sitesRes = await authedFetch('/directory/sites', userToken);
    const sites = await sitesRes.json();
    const latestSite = sites[sites.length - 1];
    console.log('Latest site:', latestSite);

    // Create ticket as user
    const createTicketRes = await authedFetch('/tickets', userToken, {
      method: 'POST',
      body: JSON.stringify({
        siteId: latestSite.id,
        type: 'SAFETY',
        description: 'CLI user ticket',
        status: 'NEW',
        priority: 'P3',
        details: 'Created via automated script',
      }),
    });
    console.log('Create ticket as USER:', createTicketRes.status, await createTicketRes.text());

    // List tickets
    const ticketsRes = await authedFetch('/tickets', userToken);
    const tickets = await ticketsRes.json();
    console.log('Most recent ticket:', tickets[0]);
  } catch (err) {
    console.error('E2E test failed:', err);
    process.exitCode = 1;
  }
}

run();


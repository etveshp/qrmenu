// Fake-Supabase mock server for e2e tests (same idea as
// lib/__fixtures__/supabase-fake.ts, but over HTTP so the real app
// talks to it like a real Supabase project).
//
// Implements just the PostgREST surface the guest flow needs:
//   GET  /rest/v1/{categories,menu_items,tables}  -> rows
//   POST /rest/v1/{orders,order_items}           -> 201, recorded in state
// plus a test-inspection endpoint:
//   GET  /__state/orders   -> every order with its items
//   POST /__state/reset    -> wipe orders (called before each test)
//
// CORS is handled by echoing the request origin so the browser accepts
// cross-origin fetches from the Next.js dev server.

import http from 'node:http';
import { categories, menuItems, tables } from './fixtures.mjs';

const state = {
  orders: [],
};

const TABLE_ROWS = {
  categories,
  menu_items: menuItems,
  tables,
};

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'apikey, authorization, content-type, prefer, range, accept-profile, content-profile, x-client-info, x-retry-count, x-supabase-api-version',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  const send = (status, body) => {
    res.writeHead(status, cors);
    res.end(body === undefined ? '' : JSON.stringify(body));
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, cors);
    res.end();
    return;
  }

  const url = new URL(req.url, 'http://localhost');

  // Test-inspection endpoints
  if (url.pathname === '/__state/orders' && req.method === 'GET') {
    send(200, state.orders);
    return;
  }
  if (url.pathname === '/__state/reset' && req.method === 'POST') {
    state.orders = [];
    send(200, { ok: true });
    return;
  }

  if (!url.pathname.startsWith('/rest/v1/')) {
    send(404, { message: 'Not Found' });
    return;
  }

  const table = url.pathname.slice('/rest/v1/'.length);

  if (req.method === 'GET') {
    send(200, TABLE_ROWS[table] ?? []);
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      let payload;
      try {
        payload = JSON.parse(body || '{}');
      } catch {
        send(400, { message: 'Invalid JSON body' });
        return;
      }
      if (table === 'orders') {
        const order = Array.isArray(payload) ? payload[0] : payload;
        state.orders.push({ ...order, items: [] });
        send(201, order);
        return;
      }
      if (table === 'order_items') {
        const rows = Array.isArray(payload) ? payload : [payload];
        const order = state.orders.find((o) => o.id === rows[0]?.order_id);
        if (order) order.items.push(...rows);
        send(201, rows);
        return;
      }
      send(201, payload);
    });
    return;
  }

  // PATCH/DELETE and anything else: the guest flow never uses them
  send(200, null);
});

const PORT = Number(process.env.MOCK_PORT || 54321);
server.listen(PORT, () => {
  console.log(`[supabase-mock] listening on http://localhost:${PORT}`);
});

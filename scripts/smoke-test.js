async function loadDependencies() {
  const fs = await import('fs');
  const path = await import('path');
  const { MongoClient } = await import('mongodb');
  let MongoMemoryServer = null;

  try {
    const mongodbMemoryServer = await import('mongodb-memory-server');
    MongoMemoryServer = mongodbMemoryServer.MongoMemoryServer;
  } catch {
    MongoMemoryServer = null;
  }

  const childProcess = await import('child_process');
  return { fs, path, MongoClient, MongoMemoryServer, childProcess };
}

function loadEnv(fs, envPath) {
  const txt = fs.readFileSync(envPath, 'utf-8');
  const out = {};
  for (const line of txt.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)=(.*)$/i);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

async function clearPortIfBusy(port) {
  try {
    const { execSync } = await import('child_process');
    if (process.platform === 'win32') {
      try {
        const output = execSync(`Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue 2>$null | Select-Object -ExpandProperty OwningProcess`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
        const pids = [...new Set(String(output).split(/\s+/).filter(Boolean))];
        for (const pid of pids) {
          try {
            execSync(`Stop-Process -Id ${pid} -Force`, { stdio: 'ignore' });
            console.log(`Stopped stale process ${pid} on port ${port}`);
          } catch {
            // ignore cleanup failures
          }
        }
      } catch {
        // fallback to netstat/taskkill approach
        try {
          const net = execSync('netstat -ano', { encoding: 'utf8' });
          const lines = net.split(/\r?\n/);
          const pids = new Set();
          for (const line of lines) {
            if (line.indexOf(`:${port}`) !== -1 && /LISTENING/i.test(line)) {
              const parts = line.trim().split(/\s+/);
              const pid = parts[parts.length - 1];
              if (pid && !isNaN(Number(pid))) pids.add(pid);
            }
          }
          for (const pid of pids) {
            try {
              execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
              console.log(`Killed stale process ${pid} on port ${port}`);
            } catch {
              // ignore
            }
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore cleanup failures
  }
}

async function ensureTestProduct(db) {
  const categories = db.collection('categories');
  const products = db.collection('products');
  const customizationGroups = db.collection('customization_groups');

  let cat = await categories.findOne({ slug: 'smoke-test' });
  if (!cat) {
    const now = new Date();
    const res = await categories.insertOne({ name: 'Smoke Test', slug: 'smoke-test', description: 'Auto test category', isActive: true, createdAt: now, updatedAt: now });
    cat = { _id: res.insertedId, id: res.insertedId.toHexString(), name: 'Smoke Test', slug: 'smoke-test' };
    console.log('Inserted category', cat.id);
  }

  const now = new Date();
  await customizationGroups.updateOne(
    { id: 'smoke-size-group' },
    {
      $set: {
        id: 'smoke-size-group',
        name: 'Smoke Add-ons',
        description: 'Auto test add-ons',
        isActive: true,
        required: false,
        minSelections: null,
        maxSelections: 2,
        displayOrder: 0,
        options: [
          { id: 'smoke-extra-cheese', name: 'Extra Cheese', price: 40, isActive: true, displayOrder: 0 },
        ],
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true },
  );

  let prod = await products.findOne({ slug: 'smoke-test-pizza' });
  if (!prod) {
    const toInsert = {
      name: 'Smoke Test Pizza',
      slug: 'smoke-test-pizza',
      description: 'A pizza used by smoke tests',
      categoryId: cat._id.toHexString(),
      price: 199,
      discountPrice: null,
      image: null,
      images: [],
      isAvailable: true,
      isFeatured: false,
      customizationGroupIds: ['smoke-size-group'],
      displayOrder: 0,
      preparationTime: 15,
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    const r = await products.insertOne(toInsert);
    prod = { ...toInsert, _id: r.insertedId, id: r.insertedId.toHexString() };
    console.log('Inserted product', prod.id);
  } else {
    await products.updateOne({ _id: prod._id }, { $set: { customizationGroupIds: ['smoke-size-group'], isAvailable: true, updatedAt: now } });
    prod = await products.findOne({ _id: prod._id });
  }
  return prod;
}

async function run() {
  const { fs, path, MongoClient, MongoMemoryServer, childProcess } = await loadDependencies();
  const env = loadEnv(fs, path.resolve(__dirname, '..', '.env.local'));
  let uri = env.MONGODB_URI;
  const dbName = env.MONGODB_DB_NAME || 'pizzavizza';
  const port = Number(process.env.SMOKE_TEST_PORT || 3100);
  let inMemoryServerInstance = null;

  if (!uri) {
    console.error('MONGODB_URI not set in .env.local');
    // fall back to an in-memory server if available
    if (MongoMemoryServer) {
      console.log('Starting in-memory MongoDB because MONGODB_URI is not set');
      const ms = await MongoMemoryServer.create();
      inMemoryServerInstance = ms;
      uri = ms.getUri();
    } else {
      process.exit(1);
    }
  }

  let client;
  let serverProcess = null;
  try {
    client = new MongoClient(uri);
    await client.connect();
  } catch (err) {
    console.error('Failed to connect to configured MongoDB URI:', err.message || err);
    if (MongoMemoryServer) {
      console.log('Falling back to in-memory MongoDB...');
      const ms = await MongoMemoryServer.create();
      inMemoryServerInstance = ms;
      uri = ms.getUri();
      client = new MongoClient(uri);
      await client.connect();

      // Start the Next.js dev server pointing at the in-memory MongoDB
      const { spawn } = childProcess;
      const cwd = path.resolve(__dirname, '..');
      await clearPortIfBusy(port);
      console.log('Launching Next dev server (this may take a while)...');
      const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      serverProcess = spawn(npmCommand, ['run', 'dev', '--', '--hostname', '127.0.0.1', '--port', String(port)], {
        cwd,
        env: Object.assign({}, process.env, {
          MONGODB_URI: uri,
          MONGODB_DB_NAME: dbName,
          NEXT_DIST_DIR: '.next-smoke',
        }),
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: process.platform === 'win32',
      });

      serverProcess.stdout.on('data', (d) => {
        process.stdout.write(`[next] ${d}`);
      });
      serverProcess.stderr.on('data', (d) => {
        process.stderr.write(`[next] ${d}`);
      });

      // wait for server to become available
      const base = `http://localhost:${port}`;
      const waitUntil = Date.now() + 60000; // 60s
      let ok = false;
        while (Date.now() < waitUntil) {
        try {
          const res = await fetch(base + '/');
          if (res.ok) {
            ok = true;
            break;
          }
        } catch {
          // ignore
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (!ok) {
        throw new Error('Next dev server did not start within 60s');
      }
    } else {
      throw err;
    }
  }
  const db = client.db(dbName);

  try {
    const prod = await ensureTestProduct(db);

    const base = `http://localhost:${port}`;
    let cookie = '';
    let sessionTokenValue = '';

    function mergeHeaders(h) {
      const baseHeaders = Object.assign({ 'Content-Type': 'application/json', Cookie: cookie }, h || {});
      if (sessionTokenValue) baseHeaders['x-pizzavizza-session'] = sessionTokenValue;
      return baseHeaders;
    }

    // register
    const email = `smoke+${Date.now()}@example.com`;
    const mobile = `999${String(Date.now()).slice(-7)}`;
    const registerRes = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: mergeHeaders(),
      body: JSON.stringify({ name: 'Smoke Tester', email, mobile, password: 'SmokeTest123!', confirmPassword: 'SmokeTest123!' }),
    });
    const sc = registerRes.headers.get('set-cookie');
    const devHeader = registerRes.headers.get('x-pizzavizza-session');
    const regJson = await registerRes.json();
    if (sc) {
      cookie = sc.split(';')[0];
      const parts = cookie.split('=');
      sessionTokenValue = parts.slice(1).join('=');
    } else if (devHeader) {
      sessionTokenValue = devHeader;
      cookie = `pizzavizza_session=${encodeURIComponent(devHeader)}`;
    } else if (regJson && regJson.sessionToken) {
      sessionTokenValue = regJson.sessionToken;
      cookie = `pizzavizza_session=${encodeURIComponent(regJson.sessionToken)}`;
    }
    console.log('register ->', registerRes.status, regJson);
    if (!registerRes.ok) throw new Error('Register failed');

    // The production flow requires OTP verification before login. For this
    // isolated smoke database, mark the just-created test user verified so
    // the remaining checkout journey can continue without exposing an OTP.
    await db.collection('users').updateOne({ email }, { $set: { emailVerified: true }, $unset: { emailVerification: '' } });

    // Use header/cookie fallback: set cookie locally from returned session token
    if (sessionTokenValue) {
      cookie = `pizzavizza_session=${encodeURIComponent(sessionTokenValue)}`;
    }

    const loginRes = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: mergeHeaders(),
      body: JSON.stringify({ identifier: mobile, password: 'SmokeTest123!' }),
    });
    const loginJson = await loginRes.json().catch(() => ({}));
    console.log('mobile login ->', loginRes.status, { success: loginJson.success, redirect: loginJson.redirect });
    if (!loginRes.ok) throw new Error('Mobile login failed');
    if (loginJson.sessionToken) {
      sessionTokenValue = loginJson.sessionToken;
      cookie = `pizzavizza_session=${encodeURIComponent(loginJson.sessionToken)}`;
    }

    // add to cart
    // add to cart with retry on transient 401s
    let cartRes;
    let cartJson;
    const maxCartAttempts = 3;
    for (let attempt = 1; attempt <= maxCartAttempts; attempt++) {
      cartRes = await fetch(base + '/api/cart', {
        method: 'POST',
        headers: mergeHeaders(),
        body: JSON.stringify({ productId: prod.slug, quantity: 1, selectedOptions: [{ optionId: 'smoke-extra-cheese' }] }),
      });
      cartJson = await cartRes.json().catch(() => ({}));
      console.log('add to cart ->', cartRes.status, cartJson, 'attempt', attempt);
      if (cartRes.ok) break;
      if (cartRes.status === 401 && attempt < maxCartAttempts) {
        // transient auth timing — wait and retry
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      break;
    }
    if (!cartRes || !cartRes.ok) throw new Error('Add to cart failed');

    if (!cartJson.data || !cartJson.data.items || cartJson.data.items[0].productId !== prod._id.toHexString()) {
      throw new Error('Cart did not store canonical product id for slug add');
    }

    const manualDisabledRes = await fetch(base + '/api/checkout', {
      method: 'POST',
      headers: mergeHeaders(),
      body: JSON.stringify({ fulfillmentType: 'PICKUP', paymentMethod: 'MANUAL' }),
    });
    const manualDisabledJson = await manualDisabledRes.json().catch(() => ({}));
    console.log('manual disabled checkout ->', manualDisabledRes.status, manualDisabledJson);
    if (manualDisabledRes.ok) throw new Error('Disabled manual payment was accepted');

    // checkout (pickup)
    // checkout with a couple retries to handle transient auth/session timing
    let checkoutRes;
    let checkoutJson;
    const maxCheckoutAttempts = 3;
    const idempotencyKey = `smoke-${Date.now()}`;
    for (let attempt = 1; attempt <= maxCheckoutAttempts; attempt++) {
      checkoutRes = await fetch(base + '/api/checkout', {
        method: 'POST',
        headers: mergeHeaders({ 'Idempotency-Key': idempotencyKey }),
        body: JSON.stringify({ fulfillmentType: 'PICKUP', paymentMethod: 'COD' }),
      });
      checkoutJson = await checkoutRes.json().catch(() => ({}));
      console.log('checkout ->', checkoutRes.status, checkoutJson, 'attempt', attempt);
      if (checkoutRes.ok) break;
      if ((checkoutRes.status === 401 || checkoutRes.status === 429) && attempt < maxCheckoutAttempts) {
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      break;
    }
    if (!checkoutRes || !checkoutRes.ok) throw new Error('Checkout failed: ' + JSON.stringify(checkoutJson));

    const duplicateCheckoutRes = await fetch(base + '/api/checkout', {
      method: 'POST',
      headers: mergeHeaders({ 'Idempotency-Key': idempotencyKey }),
      body: JSON.stringify({ fulfillmentType: 'PICKUP', paymentMethod: 'COD' }),
    });
    const duplicateCheckoutJson = await duplicateCheckoutRes.json().catch(() => ({}));
    console.log('duplicate checkout ->', duplicateCheckoutRes.status, duplicateCheckoutJson);
    if (!duplicateCheckoutRes.ok || duplicateCheckoutJson.data?.orderNumber !== checkoutJson.data?.orderNumber) {
      throw new Error('Idempotent checkout did not return the original order');
    }

    // verify order in DB
    const orders = db.collection('orders');
    const orderDoc = await orders.findOne({ 'customerSnapshot.email': email });
    console.log('order in db ->', !!orderDoc, orderDoc ? { orderNumber: orderDoc.orderNumber, totalAmount: orderDoc.totalAmount } : null);
    if (!orderDoc || orderDoc.totalAmount !== 239 || orderDoc.items?.[0]?.selectedOptions?.[0]?.optionId !== 'smoke-extra-cheese') {
      throw new Error('Order snapshot did not preserve customization pricing');
    }

    console.log('Smoke test completed successfully');
  } finally {
    await client.close();
    if (serverProcess) {
      try {
        if (process.platform === 'win32' && serverProcess.pid) {
          childProcess.execSync(`taskkill /PID ${serverProcess.pid} /T /F`, { stdio: 'ignore' });
        } else {
          serverProcess.kill();
        }
      } catch {
        // ignore
      }
      await clearPortIfBusy(port);
    }
    if (inMemoryServerInstance) {
      try {
        await inMemoryServerInstance.stop();
      } catch {
        // ignore
      }
    }
  }
}

run().catch((err) => { console.error('Smoke test failed', err); process.exit(1); });

const http = require('node:http');
const { createHash, timingSafeEqual } = require('node:crypto');
const { readFile, stat } = require('node:fs/promises');
const { MongoClient } = require('mongodb');
const path = require('node:path');

const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGODB_URI;
const mongoDatabaseName = process.env.MONGODB_DB || 'users';
const rootDirectory = path.join(__dirname, '..');
const distDirectory = path.join(rootDirectory, 'dist', 'user-details-form', 'browser');
const maxBodyBytes = 10 * 1024;

let mongoClient;
let usersCollection;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  default: 'application/octet-stream',
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(payload));
}

function isAdminAuthorized(request, expectedPassword) {
  const providedPassword = request.headers['x-admin-password'];
  if (typeof providedPassword !== 'string') {
    return false;
  }

  const expectedHash = createHash('sha256').update(expectedPassword).digest();
  const providedHash = createHash('sha256').update(providedPassword).digest();
  return timingSafeEqual(providedHash, expectedHash);
}

async function sendFile(response, filePath) {
  const normalizedPath = path.resolve(filePath);
  const distRoot = path.resolve(distDirectory);

  if (!normalizedPath.startsWith(distRoot)) {
    sendJson(response, 403, { error: 'Forbidden.' });
    return;
  }

  try {
    const data = await readFile(normalizedPath);
    const extension = path.extname(normalizedPath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes[extension] || mimeTypes.default,
      'Cache-Control': 'no-store',
    });
    response.end(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }

    console.error('Failed to read static file:', error);
    sendJson(response, 500, { error: 'Unable to load static assets.' });
  }
}

async function serveFrontend(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/')) {
    return false;
  }

  const rawPath = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const normalizedPath = rawPath.replace(/\\/g, '/');
  const relativePath = normalizedPath.startsWith('/') ? normalizedPath.slice(1) : normalizedPath;
  const safePath = relativePath.split('?')[0].split('#')[0];

  let filePath = path.join(distDirectory, safePath || 'index.html');

  if (!path.extname(safePath) && safePath !== '') {
    filePath = path.join(distDirectory, safePath, 'index.html');
  }

  try {
    await stat(filePath);
  } catch {
    filePath = path.join(distDirectory, 'index.html');
  }

  await sendFile(response, filePath);
  return true;
}

async function readRequestBody(request) {
  const chunks = [];
  let bodyBytes = 0;

  for await (const chunk of request) {
    bodyBytes += chunk.length;
    if (bodyBytes > maxBodyBytes) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body must be valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

function validateUser(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A user details object is required.' };
  }

  const { name, mobile, email, interested } = body;
  if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
    return { error: 'Name is required and must be 100 characters or fewer.' };
  }

  if (typeof mobile !== 'string' || !/^\+?[0-9]{7,15}$/.test(mobile)) {
    return { error: 'Enter a valid mobile number with 7–15 digits.' };
  }

  if (
    typeof email !== 'string' ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { error: 'Enter a valid email address.' };
  }

  if (typeof interested !== 'boolean') {
    return { error: 'Interested must be true or false.' };
  }

  return {
    user: {
      name: name.trim(),
      mobile,
      email: email.trim(),
      interested,
      createdAt: new Date().toISOString(),
    },
  };
}

async function saveUser(user) {
  await usersCollection.insertOne(user);
}

async function readUsers() {
  return usersCollection
    .find({}, { projection: { _id: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
}

async function handleRequest(request, response) {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (requestUrl.pathname === '/api/users') {
    if (request.method === 'GET') {
      const adminPassword = process.env.CUSTOMER_DETAILS_PASSWORD;
      if (!adminPassword) {
        sendJson(response, 503, { error: 'Customer details access is not configured.' });
        return;
      }

      if (!isAdminAuthorized(request, adminPassword)) {
        sendJson(response, 401, { error: 'Unauthorized.' });
        return;
      }

      if (!usersCollection) {
        sendJson(response, 503, { error: 'Customer details storage is temporarily unavailable.' });
        return;
      }

      try {
        sendJson(response, 200, await readUsers());
      } catch (error) {
        console.error('Failed to read user details:', error);
        sendJson(response, 500, { error: 'Unable to read customer details.' });
      }
      return;
    }

    if (request.method !== 'POST') {
      response.setHeader('Allow', 'GET, POST');
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    if (!request.headers['content-type']?.includes('application/json')) {
      sendJson(response, 415, { error: 'Content-Type must be application/json.' });
      return;
    }

    if (!usersCollection) {
      sendJson(response, 503, { error: 'Submission storage is temporarily unavailable.' });
      return;
    }

    try {
      const body = await readRequestBody(request);
      const result = validateUser(body);
      if (result.error) {
        sendJson(response, 400, { error: result.error });
        return;
      }

      await saveUser(result.user);
      sendJson(response, 201, { success: true });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode === 500) {
        console.error('Failed to save user details:', error);
      }
      if (!response.headersSent) {
        sendJson(response, statusCode, {
          error: statusCode === 500 ? 'Unable to save user details.' : error.message,
        });
      }
    }
    return;
  }

  const served = await serveFrontend(request, response);
  if (!served) {
    sendJson(response, 404, { error: 'Not found.' });
  }
}

const server = http.createServer((request, response) => {
  void handleRequest(request, response);
});

async function connectToDatabase() {
  if (!mongoUri) {
    console.error('MONGODB_URI environment variable is required for database access.');
    return;
  }

  let client;
  try {
    client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 10000 });
    await client.connect();
    mongoClient = client;
    usersCollection = client.db(mongoDatabaseName).collection('submissions');
    console.log(`Connected to MongoDB database "${mongoDatabaseName}".`);
  } catch (error) {
    console.error('MongoDB connection failed; retrying in 15 seconds:', error);
    await client?.close().catch((closeError) => {
      console.error('Failed to close the MongoDB client after a connection error:', closeError);
    });
    mongoClient = undefined;

    const retryTimer = setTimeout(() => void connectToDatabase(), 15000);
    retryTimer.unref();
  }
}

server.listen(port, '0.0.0.0', () => {
  console.log(`User details server listening at http://0.0.0.0:${port}`);
  void connectToDatabase();
});

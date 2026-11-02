import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const root = path.resolve(import.meta.dirname, "..");
loadEnvFile(path.join(root, ".env"));
loadEnvFile(path.join(root, ".env.local"));

const port = Number(process.env.STORE_DEV_PORT || 8787);
const dbFile = path.join(root, "shop", "local", "store.db");
const uploadDir = path.join(root, "shop", "uploads");
const currency = "MYR";
const paymentNote =
  "This order is a request. Independence-X will email payment instructions. Nothing is charged automatically.";
const payoneerNote =
  "Complete payment on Payoneer's secure page. The order stays unpaid until Payoneer confirms it.";
const storePublicUrl = (process.env.STORE_PUBLIC_URL || "http://localhost:3000").replace(/\/$/, "");
const adminEmail = "admin@localhost";
const adminPassword = "idxa-local-admin";

fs.mkdirSync(path.dirname(dbFile), { recursive: true });
fs.mkdirSync(uploadDir, { recursive: true });

const fresh = !fs.existsSync(dbFile);
const db = new DatabaseSync(dbFile);
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    admin_id INTEGER NOT NULL,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    sku TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'MYR',
    stock INTEGER NOT NULL DEFAULT 0,
    image_path TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    customer_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    company TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    internal_notes TEXT NOT NULL DEFAULT '',
    total_cents INTEGER NOT NULL,
    currency TEXT NOT NULL DEFAULT 'MYR',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    sku TEXT NOT NULL,
    qty INTEGER NOT NULL,
    unit_price_cents INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS order_throttle (
    ip TEXT PRIMARY KEY,
    hits INTEGER NOT NULL,
    window_start TEXT NOT NULL
  );
`);
ensureColumn("orders", "payment_method", "TEXT NOT NULL DEFAULT 'invoice'");
ensureColumn("orders", "payoneer_list_id", "TEXT");
ensureColumn("orders", "city", "TEXT NOT NULL DEFAULT ''");
ensureColumn("orders", "postcode", "TEXT NOT NULL DEFAULT ''");
ensureColumn("orders", "country", "TEXT NOT NULL DEFAULT ''");

const nowSeed = new Date().toISOString();
if (!db.prepare("SELECT id FROM admins LIMIT 1").get()) {
  db.prepare("INSERT INTO admins (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
    "Store admin",
    adminEmail,
    hashPassword(adminPassword),
    nowSeed,
  );
}
if (fresh) {
  const samples = [
    ["Mission patch", "IDX-PATCH", "Merchandise", "Embroidered Independence-X mission patch.", 4500, 40],
    ["DNLV brochure", "IDX-BROCHURE", "Publications", "Printed overview of the dedicated nano launch vehicle.", 1500, 80],
    ["Lapel pin", "IDX-PIN", "Merchandise", "Metal lapel pin with the Independence-X mark.", 2500, 3],
  ];
  const insert = db.prepare(
    `INSERT INTO products (name, slug, sku, description, category, price_cents, currency, stock, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  for (const [name, sku, category, description, price, stock] of samples) {
    insert.run(name, slugify(name), sku, description, category, price, currency, stock, nowSeed, nowSeed);
  }
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin || "";
  if (origin === "http://localhost:3000" || origin === "http://127.0.0.1:3000") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    if (url.pathname.startsWith("/uploads/")) {
      serveUpload(res, url.pathname);
      return;
    }
    const body = req.method === "POST" ? await readJson(req) : {};
    await route(req, res, url, body);
  } catch (error) {
    const status = error.status || 500;
    if (status === 500) console.error(error);
    send(res, status, { error: status === 500 ? "The store is unavailable." : error.message });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local shop database: ${dbFile}`);
  console.log(`Shop API: http://127.0.0.1:${port}/api/products.php`);
  console.log(`Admin sign-in: ${adminEmail} / ${adminPassword}`);
});

async function route(req, res, url, body) {
  const pathName = url.pathname.replace(/\/$/, "");
  if (req.method === "GET" && pathName === "/api/products.php") return publicProducts(req, res);
  if (req.method === "POST" && pathName === "/api/orders.php") return createOrder(req, body, res);
  if (req.method === "GET" && pathName === "/api/payoneer-status.php") return payoneerStatus(url, res);
  if (req.method === "POST" && pathName === "/api/payoneer-notify.php") return payoneerNotify(body, res);
  if (req.method === "POST" && pathName === "/api/admin/login.php") return login(body, res);
  const admin = adminFrom(req);
  if (pathName.startsWith("/api/admin/") && !admin) throw fail(401, "Sign in again.");
  if (req.method === "GET" && pathName === "/api/admin/me.php") return send(res, 200, admin);
  if (req.method === "GET" && pathName === "/api/admin/dashboard.php") return dashboard(res);
  if (req.method === "GET" && pathName === "/api/admin/products.php") return adminProducts(url, req, res);
  if (req.method === "POST" && pathName === "/api/admin/products.php") return saveProduct(body, req, res);
  if (req.method === "POST" && pathName === "/api/admin/product-delete.php") return deleteProduct(body, res);
  if (req.method === "GET" && pathName === "/api/admin/orders.php") return adminOrders(url, res);
  if (req.method === "GET" && pathName === "/api/admin/order.php") return adminOrder(url, res);
  if (req.method === "POST" && pathName === "/api/admin/order.php") return updateOrder(body, res);
  if (req.method === "GET" && pathName === "/api/admin/customers.php") return customers(res);
  throw fail(404, "Not found.");
}

function publicProducts(req, res) {
  const rows = db.prepare(
    "SELECT id, name, slug, sku, description, category, price_cents, currency, stock, image_path FROM products WHERE active = 1 ORDER BY name",
  ).all();
  send(res, 200, {
    currency,
    payment_note: paymentNote,
    payoneer_ready: payoneerReady(),
    products: rows.map((row) => publicProduct(row, req)),
  });
}

async function createOrder(req, body, res) {
  if (String(body.website || "").trim()) {
    send(res, 200, { order_number: "IDX-RECEIVED", total_cents: 0, currency, payment_note: "" });
    return;
  }
  const customer = {
    customer_name: line(body.customer_name, 190),
    email: line(body.email, 190),
    phone: line(body.phone, 40),
    company: line(body.company, 190),
    address: block(body.address, 2000),
    notes: block(body.notes, 2000),
  };
  customer.city = line(body.city, 50);
  customer.postcode = line(body.postcode, 20);
  customer.country = line(body.country, 2).toUpperCase();
  const paymentMethod = body.payment_method === "payoneer" ? "payoneer" : "invoice";
  if (!customer.customer_name || !customer.address || !customer.city || !customer.postcode) {
    throw fail(422, "Name, address, city, and postcode are required.");
  }
  if (!/^[A-Z]{2}$/.test(customer.country)) throw fail(422, "Choose a country.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) throw fail(422, "Enter a valid email address.");
  if (!/^[0-9+().\-\s]{6,40}$/.test(customer.phone)) throw fail(422, "Enter a phone number.");
  if (paymentMethod === "payoneer" && !payoneerReady()) {
    throw fail(503, "Payoneer Checkout is not connected yet. Independence-X still needs to add the merchant code and token.");
  }
  const merged = new Map();
  if (!Array.isArray(body.items) || body.items.length === 0) throw fail(422, "Add at least one product.");
  for (const item of body.items) {
    const id = Number(item?.product_id);
    const qty = Number(item?.qty);
    if (!Number.isInteger(id) || !Number.isInteger(qty) || id <= 0 || qty <= 0 || qty > 99) {
      throw fail(422, "Check the quantity of each product.");
    }
    merged.set(id, (merged.get(id) || 0) + qty);
    if (merged.get(id) > 99) throw fail(422, "Quantity cannot be more than 99 of one product.");
  }
  if (merged.size > 30) throw fail(422, "Too many different products in one order.");
  throttle(req);

  const now = new Date().toISOString();
  let number = "";
  let total = 0;
  db.exec("BEGIN IMMEDIATE");
  try {
    const lines = [];
    for (const [id, qty] of merged) {
      const product = db.prepare("SELECT * FROM products WHERE id = ? AND active = 1").get(id);
      if (!product) throw fail(422, "A product in the cart is no longer available.");
      if (product.stock < qty) throw fail(422, `${product.name} has ${product.stock} in stock.`);
      db.prepare("UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?").run(qty, now, id);
      total += product.price_cents * qty;
      lines.push({
        product_id: product.id,
        product_name: product.name,
        sku: product.sku,
        qty,
        unit_price_cents: product.price_cents,
      });
    }
    number = `IDX-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomBytes(2).toString("hex").toUpperCase()}`;
    const order = db.prepare(
      `INSERT INTO orders (order_number, status, customer_name, email, phone, company, address, city, postcode, country, notes, internal_notes, total_cents, currency, payment_method, created_at, updated_at)
       VALUES (?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)`,
    ).run(
      number,
      customer.customer_name,
      customer.email,
      customer.phone,
      customer.company,
      customer.address,
      customer.city,
      customer.postcode,
      customer.country,
      customer.notes,
      total,
      currency,
      paymentMethod,
      now,
      now,
    );
    const orderId = Number(order.lastInsertRowid);
    const itemInsert = db.prepare(
      "INSERT INTO order_items (order_id, product_id, product_name, sku, qty, unit_price_cents) VALUES (?, ?, ?, ?, ?, ?)",
    );
    for (const lineItem of lines) {
      itemInsert.run(orderId, lineItem.product_id, lineItem.product_name, lineItem.sku, lineItem.qty, lineItem.unit_price_cents);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  console.log(`New order ${number} from ${customer.email} via ${paymentMethod}`);
  if (paymentMethod === "payoneer") {
    const saved = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number);
    try {
      const redirect = await startPayoneer(saved);
      send(res, 200, {
        order_number: number,
        total_cents: total,
        currency,
        payment_method: "payoneer",
        payment_note: payoneerNote,
        redirect_url: redirect.url,
        redirect_method: redirect.method,
        redirect_parameters: redirect.parameters,
      });
    } catch (error) {
      cancelOrder(number);
      throw fail(502, error.message || "Payoneer could not start the payment.");
    }
    return;
  }
  send(res, 200, {
    order_number: number,
    total_cents: total,
    currency,
    payment_method: "invoice",
    payment_note: paymentNote,
  });
}

async function payoneerStatus(url, res) {
  const number = line(url.searchParams.get("order"), 32);
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number);
  if (!order) throw fail(404, "Order not found.");
  if (order.payment_method === "payoneer" && order.status === "pending" && order.payoneer_list_id) {
    try {
      await syncPayoneer(order);
    } catch (error) {
      console.error(error);
    }
  }
  const current = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number);
  send(res, 200, {
    order_number: current.order_number,
    status: current.status,
    payment_method: current.payment_method || "invoice",
    total_cents: current.total_cents,
    currency: current.currency,
    payment_note: current.payment_method === "payoneer" ? payoneerNote : paymentNote,
  });
}

async function payoneerNotify(body, res) {
  try {
    const number = line(body?.identification?.transactionId || body?.transactionId, 32);
    const order = number ? db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number) : null;
    if (order?.payment_method === "payoneer" && order.payoneer_list_id) await syncPayoneer(order);
  } catch (error) {
    console.error(error);
  }
  send(res, 200, { ok: true });
}

function payoneerReady() {
  return Boolean(process.env.PAYONEER_MERCHANT_CODE && process.env.PAYONEER_PAYMENT_TOKEN);
}

function payoneerBase() {
  return process.env.PAYONEER_ENV === "live" ? "https://api.live.oscato.com/api" : "https://api.sandbox.oscato.com/api";
}

async function startPayoneer(order) {
  const [firstName, ...rest] = String(order.customer_name).split(/\s+/);
  const lastName = rest.join(" ") || firstName;
  const payload = {
    transactionId: order.order_number,
    integration: "HOSTED",
    operationType: "CHARGE",
    country: order.country,
    customer: {
      email: order.email,
      number: order.email,
      addresses: {
        billing: {
          street: String(order.address).replace(/\s+/g, " ").slice(0, 80),
          city: order.city,
          zip: order.postcode,
          country: order.country,
          name: { firstName: firstName.slice(0, 40), lastName: lastName.slice(0, 40) },
        },
      },
    },
    payment: {
      amount: order.total_cents / 100,
      currency: order.currency,
      reference: order.order_number,
      invoiceId: order.order_number,
    },
    style: { language: "en_US", hostedVersion: "v5" },
    callback: {
      returnUrl: `${storePublicUrl}/store/thank-you/?order=${encodeURIComponent(order.order_number)}`,
      cancelUrl: `${storePublicUrl}/store/checkout/?payment=cancelled&order=${encodeURIComponent(order.order_number)}`,
    },
  };
  if (process.env.PAYONEER_DIVISION) payload.division = process.env.PAYONEER_DIVISION;
  const notificationUrl = process.env.PAYONEER_NOTIFICATION_URL || "";
  if (notificationUrl.startsWith("https://")) payload.callback.notificationUrl = notificationUrl;
  const session = await payoneerRequest("POST", "/lists", payload);
  const listId = session?.identification?.longId;
  const redirect = session?.redirect;
  if (!listId || !redirect?.url) {
    throw new Error(session?.resultInfo || "Payoneer did not return a payment page.");
  }
  db.prepare("UPDATE orders SET payoneer_list_id = ?, updated_at = ? WHERE id = ?").run(listId, new Date().toISOString(), order.id);
  return {
    url: redirect.url,
    method: redirect.method === "POST" ? "POST" : "GET",
    parameters: Array.isArray(redirect.parameters)
      ? redirect.parameters.map((item) => ({ name: String(item.name || ""), value: String(item.value || "") }))
      : [],
  };
}

async function syncPayoneer(order) {
  const session = await payoneerRequest("GET", `/lists/${encodeURIComponent(order.payoneer_list_id)}`);
  const code = session?.status?.code || "";
  if (code === "charged" || code === "paid_out") {
    if (order.status === "pending") {
      db.prepare("UPDATE orders SET status = 'paid', updated_at = ? WHERE id = ? AND status = 'pending'").run(new Date().toISOString(), order.id);
    }
    return;
  }
  if (["failed", "declined", "aborted", "canceled", "expired"].includes(code)) {
    cancelOrder(order.order_number);
  }
}

async function payoneerRequest(method, apiPath, payload) {
  const code = process.env.PAYONEER_MERCHANT_CODE || "";
  const token = process.env.PAYONEER_PAYMENT_TOKEN || "";
  const media = "application/vnd.optile.payment.enterprise-v1-extensible+json";
  const response = await fetch(`${payoneerBase()}${apiPath}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${code}:${token}`).toString("base64")}`,
      Accept: media,
      "Content-Type": media,
    },
    body: payload ? JSON.stringify(payload) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) {
    throw new Error(String(data.resultInfo || "Payoneer rejected the payment session."));
  }
  return data;
}

function cancelOrder(orderNumber) {
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(orderNumber);
  if (!order || order.status === "cancelled") return;
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = db.prepare("SELECT status FROM orders WHERE id = ?").get(order.id);
    if (current?.status === "pending") {
      const items = db.prepare("SELECT product_id, qty FROM order_items WHERE order_id = ?").all(order.id);
      for (const item of items) {
        if (item.product_id) db.prepare("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?").run(item.qty, now, item.product_id);
      }
      db.prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE id = ?").run(now, order.id);
    }
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function ensureColumn(table, column, definition) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function login(body, res) {
  const email = String(body.email || "").trim();
  const password = String(body.password || "");
  const admin = db.prepare("SELECT * FROM admins WHERE email = ?").get(email);
  if (!admin || !verifyPassword(password, admin.password_hash)) throw fail(401, "Email or password is not correct.");
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString();
  db.prepare("INSERT INTO sessions (token, admin_id, expires_at) VALUES (?, ?, ?)").run(token, admin.id, expires);
  send(res, 200, { token, name: admin.name, email: admin.email });
}

function dashboard(res) {
  const products = count("SELECT COUNT(*) AS n FROM products");
  const live = count("SELECT COUNT(*) AS n FROM products WHERE active = 1");
  const low = count("SELECT COUNT(*) AS n FROM products WHERE active = 1 AND stock <= 5");
  const pending = count("SELECT COUNT(*) AS n FROM orders WHERE status = 'pending'");
  const revenue = db.prepare("SELECT COALESCE(SUM(total_cents), 0) AS n FROM orders WHERE status IN ('paid', 'fulfilled')").get().n;
  const recent = db.prepare(
    "SELECT order_number, customer_name, status, total_cents, currency, created_at FROM orders ORDER BY created_at DESC LIMIT 8",
  ).all();
  send(res, 200, {
    products: Number(products),
    live: Number(live),
    low_stock: Number(low),
    pending: Number(pending),
    revenue_cents: Number(revenue),
    currency,
    recent_orders: recent,
  });
}

function adminProducts(url, req, res) {
  const q = url.searchParams.get("q")?.trim() || "";
  const rows = q
    ? db.prepare(
        "SELECT * FROM products WHERE name LIKE ? OR sku LIKE ? OR category LIKE ? ORDER BY updated_at DESC",
      ).all(`%${q}%`, `%${q}%`, `%${q}%`)
    : db.prepare("SELECT * FROM products ORDER BY updated_at DESC").all();
  send(res, 200, { products: rows.map((row) => adminProduct(row, req)) });
}

function saveProduct(body, req, res) {
  const id = Number(body.id || 0);
  const existing = id ? db.prepare("SELECT * FROM products WHERE id = ?").get(id) : null;
  if (id && !existing) throw fail(404, "Product not found.");
  const name = line(body.name, 190);
  const sku = line(body.sku, 64);
  const category = line(body.category, 80);
  const description = block(body.description, 8000);
  const stock = Number(body.stock);
  if (!name || !sku) throw fail(422, "Name and SKU are required.");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(sku)) {
    throw fail(422, "SKU can use letters, numbers, dots, hyphens, and underscores.");
  }
  if (!Number.isInteger(stock) || stock < 0) throw fail(422, "Stock must be a whole number.");
  const price = priceToCents(body.price);
  let image = existing?.image_path || null;
  if (body.image_base64) {
    image = saveImage(String(body.image_base64), String(body.image_type || ""));
  } else if (String(body.image_url || "").trim()) {
    const imageUrl = String(body.image_url).trim();
    if (!/^https:\/\//i.test(imageUrl)) throw fail(422, "An image link must start with https://");
    image = imageUrl;
  } else if (body.remove_image) {
    image = null;
  }
  const now = new Date().toISOString();
  const slug = uniqueSlug(name, existing?.id || null);
  const active = body.active ? 1 : 0;
  try {
    if (existing) {
      db.prepare(
        `UPDATE products SET name=?, slug=?, sku=?, description=?, category=?, price_cents=?, currency=?, stock=?, image_path=?, active=?, updated_at=? WHERE id=?`,
      ).run(name, slug, sku, description, category, price, currency, stock, image, active, now, existing.id);
    } else {
      db.prepare(
        `INSERT INTO products (name, slug, sku, description, category, price_cents, currency, stock, image_path, active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(name, slug, sku, description, category, price, currency, stock, image, active, now, now);
    }
  } catch (error) {
    if (String(error.message).includes("UNIQUE")) throw fail(422, "That SKU is already used by another product.");
    throw error;
  }
  if (existing?.image_path && existing.image_path !== image) deleteImage(existing.image_path);
  const saved = db.prepare("SELECT * FROM products WHERE sku = ?").get(sku);
  send(res, 200, { product: adminProduct(saved, req) });
}

function deleteProduct(body, res) {
  const id = Number(body.id);
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(id);
  if (!existing) throw fail(404, "Product not found.");
  db.prepare("DELETE FROM products WHERE id = ?").run(id);
  deleteImage(existing.image_path);
  send(res, 200, { ok: true });
}

function adminOrders(url, res) {
  const q = url.searchParams.get("q")?.trim() || "";
  const status = url.searchParams.get("status") || "all";
  const allowed = ["all", "pending", "paid", "fulfilled", "cancelled"];
  if (!allowed.includes(status)) throw fail(422, "Unknown status.");
  const clauses = [];
  const params = [];
  if (status !== "all") {
    clauses.push("status = ?");
    params.push(status);
  }
  if (q) {
    clauses.push("(order_number LIKE ? OR customer_name LIKE ? OR email LIKE ? OR company LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const orders = db.prepare(`SELECT * FROM orders ${where} ORDER BY created_at DESC LIMIT 200`).all(...params);
  send(res, 200, { orders });
}

function adminOrder(url, res) {
  const number = url.searchParams.get("number") || "";
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number);
  if (!order) throw fail(404, "Order not found.");
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  send(res, 200, { order, items });
}

function updateOrder(body, res) {
  const number = String(body.number || "");
  const order = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(number);
  if (!order) throw fail(404, "Order not found.");
  const next = String(body.status || "");
  const notes = block(body.internal_notes, 4000);
  const statuses = ["pending", "paid", "fulfilled", "cancelled"];
  if (!statuses.includes(next)) throw fail(422, "Choose a valid status.");
  const items = db.prepare("SELECT * FROM order_items WHERE order_id = ?").all(order.id);
  const now = new Date().toISOString();
  db.exec("BEGIN IMMEDIATE");
  try {
    if (order.status !== "cancelled" && next === "cancelled") {
      for (const item of items) {
        if (item.product_id) db.prepare("UPDATE products SET stock = stock + ?, updated_at = ? WHERE id = ?").run(item.qty, now, item.product_id);
      }
    }
    if (order.status === "cancelled" && next !== "cancelled") {
      for (const item of items) {
        if (!item.product_id) continue;
        const product = db.prepare("SELECT * FROM products WHERE id = ?").get(item.product_id);
        if (!product || product.stock < item.qty) {
          throw fail(422, `Not enough stock to reopen ${product?.name || item.product_name}.`);
        }
        db.prepare("UPDATE products SET stock = stock - ?, updated_at = ? WHERE id = ?").run(item.qty, now, item.product_id);
      }
    }
    db.prepare("UPDATE orders SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?").run(next, notes, now, order.id);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  const saved = db.prepare("SELECT * FROM orders WHERE id = ?").get(order.id);
  send(res, 200, { order: saved, items });
}

function customers(res) {
  const rows = db.prepare(
    `SELECT email,
            MAX(customer_name) AS customer_name,
            MAX(company) AS company,
            MAX(phone) AS phone,
            COUNT(*) AS orders,
            SUM(CASE WHEN status IN ('paid', 'fulfilled') THEN total_cents ELSE 0 END) AS paid_cents,
            MAX(currency) AS currency,
            MAX(created_at) AS last_order
     FROM orders GROUP BY email ORDER BY last_order DESC`,
  ).all();
  send(res, 200, { customers: rows });
}

function adminFrom(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  return db.prepare(
    `SELECT a.id, a.name, a.email FROM sessions s JOIN admins a ON a.id = s.admin_id
     WHERE s.token = ? AND s.expires_at > ?`,
  ).get(token, new Date().toISOString()) || null;
}

function throttle(req) {
  const ip = req.socket.remoteAddress || "local";
  const now = Date.now();
  const row = db.prepare("SELECT * FROM order_throttle WHERE ip = ?").get(ip);
  if (!row || now - Date.parse(row.window_start) > 60 * 60 * 1000) {
    db.prepare("INSERT INTO order_throttle (ip, hits, window_start) VALUES (?, 1, ?) ON CONFLICT(ip) DO UPDATE SET hits = 1, window_start = excluded.window_start").run(ip, new Date().toISOString());
    return;
  }
  if (row.hits >= 8) throw fail(429, "Too many orders from this network. Try again later.");
  db.prepare("UPDATE order_throttle SET hits = hits + 1 WHERE ip = ?").run(ip);
}

function publicProduct(row, req) {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.description,
    category: row.category,
    price_cents: row.price_cents,
    currency: row.currency,
    stock: row.stock,
    image_url: imageUrl(row.image_path, req),
  };
}

function adminProduct(row, req) {
  return { ...publicProduct(row, req), active: row.active === 1, updated_at: row.updated_at };
}

function imageUrl(imagePath, req) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `http://${req.headers.host}/${imagePath.replace(/^\//, "")}`;
}

function saveImage(base64, mime) {
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[mime];
  if (!ext) throw fail(422, "Use a JPG, PNG, or WebP image.");
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length || buffer.length > 2_000_000) throw fail(422, "Image must be 2 MB or smaller.");
  const name = `${randomBytes(16).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(uploadDir, name), buffer);
  return `uploads/${name}`;
}

function deleteImage(imagePath) {
  if (!imagePath || imagePath.includes("..") || !imagePath.startsWith("uploads/")) return;
  const file = path.join(root, "shop", imagePath);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

function serveUpload(res, pathname) {
  const name = path.basename(pathname);
  const file = path.join(uploadDir, name);
  if (!fs.existsSync(file)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const types = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  res.writeHead(200, { "Content-Type": types[path.extname(name)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > 8_000_000) {
        reject(fail(413, "Request is too large."));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(fail(400, "Send JSON."));
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function count(sql) {
  return db.prepare(sql).get().n;
}

function line(value, max) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length > max) throw fail(422, "One of the fields is too long.");
  return text;
}

function block(value, max) {
  const text = String(value || "").replace(/\r\n/g, "\n").trim();
  if (text.length > max) throw fail(422, "One of the fields is too long.");
  return text;
}

function priceToCents(input) {
  const value = String(input ?? "").replace(/[, ]/g, "").trim();
  if (!/^\d+(\.\d{1,2})?$/.test(value)) throw fail(422, "Enter a price like 45.00");
  const [whole, frac = "0"] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
}

function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
}

function uniqueSlug(base, ignoreId) {
  const slug = slugify(base);
  let candidate = slug;
  let n = 2;
  while (db.prepare("SELECT id FROM products WHERE slug = ? AND (? IS NULL OR id <> ?)").get(candidate, ignoreId, ignoreId)) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split(":");
  if (!salt || !hash) return false;
  const next = scryptSync(password, salt, 32);
  const known = Buffer.from(hash, "hex");
  return next.length === known.length && timingSafeEqual(next, known);
}

import { offers, type OfferId } from "../shared/catalog";
import {
  dayInBrazil,
  hashPassword,
  randomSalt,
  resourceFromRow,
  resourceSchema,
  sha256,
  validSignature,
  verifyPassword,
} from "./core";
import { z } from "zod";
interface Env {
  DB: D1Database;
  FILES: R2Bucket;
  ASSETS: Fetcher;
  APP_URL: string;
  ADMIN_DISCORD_IDS: string;
  ADMIN_EMAILS: string;
  PASSWORD_PEPPER?: string;
  INFINITEPAY_HANDLE?: string;
  DISCORD_CLIENT_ID?: string;
  DISCORD_CLIENT_SECRET?: string;
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;
  MERCADOPAGO_COLLECTOR_ID?: string;
  PAYMENT_TEST_MODE?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}
type User = {
  id: string;
  name: string;
  avatar: string | null;
  email: string | null;
  admin: boolean;
};
class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}
const json = (data: unknown, status = 200) => Response.json(data, { status });
const cookie = (req: Request, name: string) =>
  req.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(name + "="))
    ?.slice(name.length + 1);
const cookieHeader = (env: Env, name: string, value: string, maxAge: number) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${env.APP_URL.startsWith("https:") ? "; Secure" : ""}`;
const redirect = (to: string, headers: Record<string, string> = {}) =>
  new Response(null, { status: 302, headers: { Location: to, ...headers } });
const token = () => crypto.randomUUID() + crypto.randomUUID();
async function body(req: Request, max = 30000) {
  const text = await limited(req, max).text();
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Dados inválidos.");
  }
}
function limited(req: Request, max: number) {
  let size = 0;
  return new Response(
    req.body?.pipeThrough(
      new TransformStream({
        transform(chunk, controller) {
          size += chunk.byteLength;
          if (size > max)
            throw new HttpError(
              413,
              "Arquivo ou mensagem excede o tamanho permitido.",
            );
          controller.enqueue(chunk);
        },
      }),
    ),
    { headers: req.headers },
  );
}
async function session(req: Request, env: Env): Promise<User | null> {
  const value = cookie(req, "scr_session");
  if (!value) return null;
  const row = await env.DB.prepare(
    "SELECT u.id,u.name,u.avatar,u.email,u.is_admin FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?",
  )
    .bind(await sha256(value), Date.now())
    .first<{
      id: string;
      name: string;
      avatar: string | null;
      email: string | null;
      is_admin: number;
    }>();
  return row
    ? {
        ...row,
        admin:
          !!row.is_admin ||
          (env.ADMIN_DISCORD_IDS || "")
            .split(",")
            .map((x) => x.trim())
            .includes(row.id) ||
          (!!row.email &&
            (env.ADMIN_EMAILS || "")
              .split(",")
              .map((x) => x.trim().toLowerCase())
              .includes(row.email.toLowerCase())),
      }
    : null;
}
const requireUser = (user: User | null) => {
  if (!user)
    throw new HttpError(
      401,
      "Entre na sua conta para continuar.",
      "LOGIN_REQUIRED",
    );
  return user;
};
const clientIp = (req: Request) =>
  req.headers.get("cf-connecting-ip") ||
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
  "local";

async function createSession(env: Env, userId: string, remember = true) {
  const raw = token();
  const maxAge = remember ? 30 * 86400 : 86400;
  await env.DB.prepare(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)",
  )
    .bind(await sha256(raw), userId, Date.now() + maxAge * 1000)
    .run();
  return { raw, maxAge };
}
const requireAdmin = (user: User | null) => {
  const u = requireUser(user);
  if (!u.admin) throw new HttpError(403, "Acesso reservado à equipe.");
  return u;
};
async function access(env: Env, id: string) {
  const { results } = await env.DB.prepare(
    "SELECT sku,valid_until FROM orders WHERE user_id=? AND status='approved' AND (valid_until IS NULL OR valid_until>?)",
  )
    .bind(id, new Date().toISOString())
    .all<{ sku: string; valid_until: string | null }>();
  return results;
}
async function rate(env: Env, key: string, limit: number, seconds = 60) {
  const bucket = Math.floor(Date.now() / (seconds * 1000));
  const r = await env.DB.prepare(
    "INSERT INTO rate_limits(key,count,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 WHERE count<? RETURNING count",
  )
    .bind(key + ":" + bucket, Date.now() + seconds * 2000, limit)
    .first();
  if (!r)
    throw new HttpError(
      429,
      "Muitas tentativas. Aguarde um pouco e tente novamente.",
    );
}
async function mp(env: Env, path: string, options: RequestInit = {}) {
  const res = await fetch("https://api.mercadopago.com" + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok)
    throw new HttpError(
      502,
      "O provedor de pagamentos está indisponível. Tente novamente.",
    );
  return res.json() as Promise<Record<string, any>>;
}
async function infinitePay(
  path: "/links" | "/payment_check",
  payload: Record<string, unknown>,
) {
  const response = await fetch(`https://api.checkout.infinitepay.io${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw new HttpError(
      502,
      "O checkout está temporariamente indisponível. Tente novamente.",
    );
  return response.json() as Promise<Record<string, any>>;
}

async function confirmInfinitePayment(
  env: Env,
  input: { orderNsu: string; slug: string; transactionNsu: string },
) {
  if (!env.INFINITEPAY_HANDLE)
    throw new HttpError(503, "Pagamentos não configurados.");
  const order = await env.DB.prepare(
    "SELECT id,user_id,sku,amount,status,payment_id FROM orders WHERE id=? AND provider='infinitepay'",
  )
    .bind(input.orderNsu)
    .first<{
      id: string;
      user_id: string;
      sku: string;
      amount: number;
      status: string;
      payment_id: string | null;
    }>();
  if (!order) throw new HttpError(404, "Pedido não encontrado.");
  if (order.payment_id && order.payment_id !== input.transactionNsu)
    throw new HttpError(409, "Pedido já confirmado por outra transação.");
  const check = await infinitePay("/payment_check", {
    handle: env.INFINITEPAY_HANDLE,
    order_nsu: input.orderNsu,
    slug: input.slug,
    transaction_nsu: input.transactionNsu,
  });
  if (check.success !== true || check.paid !== true)
    return { paid: false, orderId: order.id };
  if (
    !Number.isInteger(Number(check.amount)) ||
    Number(check.amount) !== order.amount
  )
    throw new HttpError(400, "O valor confirmado não corresponde ao pedido.");
  const offer = offers[order.sku as OfferId];
  const days = offer?.days ?? null;
  const now = new Date().toISOString();
  try {
    await env.DB.prepare(
      "UPDATE orders SET status='approved',payment_id=?,paid_at=COALESCE(paid_at,?),provider_updated_at=?,valid_until=CASE WHEN paid_at IS NOT NULL THEN valid_until WHEN ? IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', MAX(?, COALESCE((SELECT MAX(valid_until) FROM orders WHERE user_id=? AND sku=? AND status='approved' AND id<>?),?)), '+' || ? || ' days') END WHERE id=? AND amount=? AND status!='approved' AND (payment_id IS NULL OR payment_id=?)",
    )
      .bind(
        input.transactionNsu,
        now,
        now,
        days,
        now,
        order.user_id,
        order.sku,
        order.id,
        now,
        days || 0,
        order.id,
        order.amount,
        input.transactionNsu,
      )
      .run();
  } catch {
    throw new HttpError(409, "Esta transação já foi utilizada.");
  }
  return { paid: true, orderId: order.id };
}
async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url),
    p = url.pathname,
    method = req.method;
  if (!p.startsWith("/api/")) return env.ASSETS.fetch(req);
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(method) &&
    !p.startsWith("/api/webhooks/")
  ) {
    if (
      req.headers.get("origin") !== new URL(env.APP_URL).origin &&
      !(
        new URL(env.APP_URL).hostname === "127.0.0.1" &&
        req.headers.get("origin") === "http://127.0.0.1:5173"
      )
    )
      throw new HttpError(403, "Origem não autorizada.");
  }
  if (p === "/api/health") return json({ ok: true });
  if (p === "/api/config")
    return json({
      discord: !!(env.DISCORD_CLIENT_ID && env.DISCORD_CLIENT_SECRET),
      payments: !!(
        env.INFINITEPAY_HANDLE ||
        (env.MERCADOPAGO_ACCESS_TOKEN &&
          env.MERCADOPAGO_WEBHOOK_SECRET &&
          env.MERCADOPAGO_COLLECTOR_ID)
      ),
      ai: !!env.OPENAI_API_KEY,
    });
  if (p === "/api/auth/register" && method === "POST") {
    if (!env.PASSWORD_PEPPER)
      throw new HttpError(503, "O cadastro por e-mail ainda não foi ativado.");
    await rate(env, `register:${clientIp(req)}`, 5, 3600);
    const data = z
      .object({
        name: z.string().trim().min(2).max(60),
        email: z.string().trim().toLowerCase().email().max(254),
        password: z.string().min(10).max(200),
        remember: z.boolean().default(true),
      })
      .parse(await body(req));
    const existing = await env.DB.prepare("SELECT id FROM users WHERE email=?")
      .bind(data.email)
      .first();
    if (existing)
      throw new HttpError(409, "Já existe uma conta com este e-mail.");
    const id = crypto.randomUUID();
    const salt = randomSalt();
    const passwordHash = await hashPassword(
      data.password,
      salt,
      env.PASSWORD_PEPPER,
    );
    await env.DB.prepare(
      "INSERT INTO users(id,name,email,password_hash,password_salt,auth_provider,last_login_at,last_login_ip) VALUES(?,?,?,?,?,'email',CURRENT_TIMESTAMP,?)",
    )
      .bind(id, data.name, data.email, passwordHash, salt, clientIp(req))
      .run();
    const created = await createSession(env, id, data.remember);
    return new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieHeader(
          env,
          "scr_session",
          created.raw,
          created.maxAge,
        ),
      },
    });
  }
  if (p === "/api/auth/login" && method === "POST") {
    if (!env.PASSWORD_PEPPER)
      throw new HttpError(503, "O login por e-mail ainda não foi ativado.");
    const data = z
      .object({
        email: z.string().trim().toLowerCase().email().max(254),
        password: z.string().min(1).max(200),
        remember: z.boolean().default(true),
      })
      .parse(await body(req));
    await rate(
      env,
      `login:${await sha256(`${clientIp(req)}:${data.email}`)}`,
      8,
      900,
    );
    const account = await env.DB.prepare(
      "SELECT id,password_hash,password_salt FROM users WHERE email=? AND password_hash IS NOT NULL",
    )
      .bind(data.email)
      .first<{
        id: string;
        password_hash: string;
        password_salt: string;
      }>();
    const valid =
      !!account &&
      (await verifyPassword(
        data.password,
        account.password_salt,
        account.password_hash,
        env.PASSWORD_PEPPER,
      ));
    if (!valid) throw new HttpError(401, "E-mail ou senha incorretos.");
    await env.DB.prepare(
      "UPDATE users SET last_login_at=CURRENT_TIMESTAMP,last_login_ip=? WHERE id=?",
    )
      .bind(clientIp(req), account!.id)
      .run();
    const created = await createSession(env, account!.id, data.remember);
    return new Response(JSON.stringify({ ok: true }), {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieHeader(
          env,
          "scr_session",
          created.raw,
          created.maxAge,
        ),
      },
    });
  }
  if (p === "/api/auth/discord") {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET)
      return redirect(env.APP_URL + "/#/conta?notice=login-unavailable");
    const state = token();
    const auth = new URL("https://discord.com/oauth2/authorize");
    auth.search = new URLSearchParams({
      client_id: env.DISCORD_CLIENT_ID,
      response_type: "code",
      scope: "identify guilds",
      redirect_uri: env.APP_URL + "/api/auth/callback",
      state,
    }).toString();
    return redirect(auth.toString(), {
      "Set-Cookie": cookieHeader(env, "scr_oauth", state, 600),
    });
  }
  if (p === "/api/auth/callback") {
    const state = url.searchParams.get("state");
    if (
      !state ||
      state !== cookie(req, "scr_oauth") ||
      !url.searchParams.get("code")
    )
      return redirect(env.APP_URL + "/#/conta?notice=login-failed", {
        "Set-Cookie": cookieHeader(env, "scr_oauth", "", 0),
      });
    const response = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID!,
        client_secret: env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code: url.searchParams.get("code")!,
        redirect_uri: env.APP_URL + "/api/auth/callback",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new HttpError(502, "Não foi possível concluir o login.");
    const auth = (await response.json()) as { access_token: string };
    const profile = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: "Bearer " + auth.access_token },
      signal: AbortSignal.timeout(10000),
    });
    if (!profile.ok)
      throw new HttpError(502, "Não foi possível consultar seu perfil.");
    const u = (await profile.json()) as {
      id: string;
      username: string;
      global_name?: string;
      avatar?: string;
    };
    const guildsResponse = await fetch(
      "https://discord.com/api/v10/users/@me/guilds",
      {
        headers: { Authorization: "Bearer " + auth.access_token },
        signal: AbortSignal.timeout(10000),
      },
    );
    const guilds = guildsResponse.ok
      ? ((await guildsResponse.json()) as { id: string; owner?: boolean }[])
      : [];
    const ownsScrCommunity = guilds.some(
      (guild) => guild.id === "1177621426321244250" && guild.owner === true,
    );
    await env.DB.prepare(
      "INSERT INTO users(id,name,avatar,auth_provider,last_login_at,last_login_ip,is_admin) VALUES(?,?,?,'discord',CURRENT_TIMESTAMP,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,avatar=excluded.avatar,last_login_at=CURRENT_TIMESTAMP,last_login_ip=excluded.last_login_ip,is_admin=MAX(users.is_admin,excluded.is_admin)",
    )
      .bind(
        u.id,
        u.global_name || u.username,
        u.avatar
          ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png`
          : null,
        clientIp(req),
        +ownsScrCommunity,
      )
      .run();
    const created = await createSession(env, u.id, true);
    const headers = new Headers({ Location: env.APP_URL + "/#/conta" });
    headers.append(
      "Set-Cookie",
      cookieHeader(env, "scr_session", created.raw, created.maxAge),
    );
    headers.append("Set-Cookie", cookieHeader(env, "scr_oauth", "", 0));
    return new Response(null, { status: 302, headers });
  }
  if (p === "/api/webhooks/mercadopago" && method === "POST") {
    if (!env.MERCADOPAGO_WEBHOOK_SECRET || !env.MERCADOPAGO_ACCESS_TOKEN)
      throw new HttpError(503, "Pagamentos não configurados.");
    const id = url.searchParams.get("data.id"),
      rid = req.headers.get("x-request-id");
    if (
      !id ||
      !rid ||
      !(await validSignature(
        env.MERCADOPAGO_WEBHOOK_SECRET,
        id,
        rid,
        req.headers.get("x-signature") || "",
      ))
    )
      throw new HttpError(401, "Assinatura inválida.");
    if (!/^\d+$/.test(id)) throw new HttpError(400, "Pagamento inválido.");
    const payment = await mp(env, "/v1/payments/" + id);
    const order = await env.DB.prepare("SELECT * FROM orders WHERE id=?")
      .bind(payment.external_reference || "")
      .first<{
        id: string;
        user_id: string;
        sku: string;
        amount: number;
        payment_id: string | null;
      }>();
    if (!order) return json({ received: true });
    if (
      payment.currency_id !== "BRL" ||
      Math.round(Number(payment.transaction_amount) * 100) !== order.amount ||
      String(payment.collector_id) !== env.MERCADOPAGO_COLLECTOR_ID ||
      payment.live_mode !== (env.PAYMENT_TEST_MODE !== "true")
    )
      throw new HttpError(400, "Dados do pagamento não conferem.");
    if (order.payment_id && order.payment_id !== String(payment.id))
      throw new HttpError(409, "Pedido já vinculado a outro pagamento.");
    if (payment.status === "approved") {
      const offer = offers[order.sku as OfferId];
      const now = new Date().toISOString();
      const days = offer?.days;
      await env.DB.prepare(
        "UPDATE orders SET status='approved',payment_id=?,paid_at=COALESCE(paid_at,?),valid_until=CASE WHEN paid_at IS NOT NULL THEN valid_until WHEN ? IS NULL THEN NULL ELSE strftime('%Y-%m-%dT%H:%M:%fZ', MAX(?, COALESCE((SELECT MAX(valid_until) FROM orders WHERE user_id=? AND sku=? AND status='approved' AND id<>?),?)), '+' || ? || ' days') END WHERE id=?",
      )
        .bind(
          String(payment.id),
          now,
          days ?? null,
          now,
          order.user_id,
          order.sku,
          order.id,
          now,
          days ?? 0,
          order.id,
        )
        .run();
    } else if (
      ["refunded", "charged_back", "cancelled"].includes(payment.status)
    )
      await env.DB.prepare("UPDATE orders SET status=?,payment_id=? WHERE id=?")
        .bind(payment.status, String(payment.id), order.id)
        .run();
    return json({ received: true });
  }
  if (p === "/api/webhooks/infinitepay" && method === "POST") {
    const payload = z
      .object({
        order_nsu: z.string().uuid(),
        invoice_slug: z.string().min(1).max(200).optional(),
        slug: z.string().min(1).max(200).optional(),
        transaction_nsu: z.string().min(1).max(200),
      })
      .refine((value) => value.invoice_slug || value.slug)
      .parse(await body(req));
    const result = await confirmInfinitePayment(env, {
      orderNsu: payload.order_nsu,
      slug: payload.invoice_slug || payload.slug!,
      transactionNsu: payload.transaction_nsu,
    });
    return json({ received: true, paid: result.paid });
  }
  if (p === "/api/payments/infinitepay/return" && method === "GET") {
    const payload = z
      .object({
        order_nsu: z.string().uuid(),
        slug: z.string().min(1).max(200),
        transaction_nsu: z.string().min(1).max(200),
      })
      .parse(Object.fromEntries(url.searchParams));
    const result = await confirmInfinitePayment(env, {
      orderNsu: payload.order_nsu,
      slug: payload.slug,
      transactionNsu: payload.transaction_nsu,
    });
    return redirect(
      `${env.APP_URL}/#/conta?pagamento=${result.paid ? "confirmado" : "pendente"}`,
    );
  }
  if (p.startsWith("/api/media/") && method === "GET") {
    const key = p.slice("/api/media/".length);
    if (!key.startsWith("media/") || key.includes(".."))
      throw new HttpError(404, "Mídia não encontrada.");
    const object = await env.FILES.get(key);
    if (!object) throw new HttpError(404, "Mídia não encontrada.");
    return new Response(object.body, {
      headers: {
        "Content-Type":
          object.httpMetadata?.contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  const user = await session(req, env);
  if (p === "/api/analytics/view" && method === "POST") {
    await rate(env, `view:${clientIp(req)}`, 180, 3600);
    const data = z
      .object({
        path: z.string().startsWith("/").max(240),
        visitorId: z.string().uuid(),
      })
      .parse(await body(req));
    const visitorHash = await sha256(
      `${data.visitorId}:${clientIp(req)}:${env.PASSWORD_PEPPER || "scr"}`,
    );
    await env.DB.prepare(
      "INSERT INTO page_views(path,visitor_hash,user_id,ip_address,user_agent,referrer) VALUES(?,?,?,?,?,?)",
    )
      .bind(
        data.path,
        visitorHash,
        user?.id || null,
        clientIp(req),
        (req.headers.get("user-agent") || "").slice(0, 500),
        (req.headers.get("referer") || "").slice(0, 500),
      )
      .run();
    return json({ ok: true }, 201);
  }
  if (p === "/api/me") {
    if (!user) return json({ user: null, usage: null, access: [] });
    const usage = await env.DB.prepare(
      "SELECT downloads FROM daily_usage WHERE user_id=? AND day=?",
    )
      .bind(user.id, dayInBrazil())
      .first<{ downloads: number }>();
    return json({
      user,
      usage: {
        downloads: usage?.downloads || 0,
        remaining: Math.max(0, 5 - (usage?.downloads || 0)),
      },
      access: await access(env, user.id),
    });
  }
  if (p === "/api/profile" && method === "PUT") {
    const active = requireUser(user);
    const data = z
      .object({ name: z.string().trim().min(2).max(60) })
      .parse(await body(req));
    await env.DB.prepare("UPDATE users SET name=? WHERE id=?")
      .bind(data.name, active.id)
      .run();
    return json({ ok: true });
  }
  if (p === "/api/auth/logout" && method === "POST") {
    const value = cookie(req, "scr_session");
    if (value)
      await env.DB.prepare("DELETE FROM sessions WHERE token_hash=?")
        .bind(await sha256(value))
        .run();
    return new Response("{}", {
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": cookieHeader(env, "scr_session", "", 0),
      },
    });
  }
  if (p === "/api/resources" && method === "GET") {
    const { results } = await env.DB.prepare(
      "SELECT * FROM resources WHERE published=1 ORDER BY created_at DESC",
    ).all();
    return json(results.map(resourceFromRow));
  }
  const download = p.match(/^\/api\/resources\/([^/]+)\/download$/);
  if (download && method === "POST") {
    const u = requireUser(user);
    await rate(env, "download:" + u.id, 15);
    const row = await env.DB.prepare(
      "SELECT * FROM resources WHERE id=? AND published=1 AND reviewed=1",
    )
      .bind(download[1])
      .first<{ file_key: string; filename: string; exclusive: number }>();
    if (!row?.file_key) throw new HttpError(404, "Arquivo indisponível.");
    const rights = await access(env, u.id);
    if (row.exclusive && !rights.some((r) => r.sku === "exclusive"))
      throw new HttpError(
        403,
        "Este resource faz parte do catálogo exclusivo.",
        "EXCLUSIVE_REQUIRED",
      );
    const file = await env.FILES.get(row.file_key);
    if (!file)
      throw new HttpError(
        404,
        "O arquivo não está disponível. Avise a equipe.",
      );
    const unlimited = rights.some((r) => r.sku === "unlimited");
    const consumed = await env.DB.prepare(
      "INSERT INTO daily_usage(user_id,day,downloads) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET downloads=downloads+1 WHERE downloads<? RETURNING downloads",
    )
      .bind(u.id, dayInBrazil(), unlimited ? 2147483647 : 5)
      .first();
    if (!consumed)
      throw new HttpError(
        429,
        "Você usou os 5 downloads de hoje.",
        "DOWNLOAD_LIMIT",
      );
    await env.DB.prepare(
      "UPDATE resources SET downloads=downloads+1 WHERE id=?",
    )
      .bind(download[1])
      .run();
    return new Response(file.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
        "Cache-Control": "no-store",
      },
    });
  }
  if (p === "/api/checkout" && method === "POST") {
    const u = requireUser(user);
    await rate(env, "checkout:" + u.id, 6);
    if (
      !env.INFINITEPAY_HANDLE &&
      (!env.MERCADOPAGO_ACCESS_TOKEN ||
        !env.MERCADOPAGO_WEBHOOK_SECRET ||
        !env.MERCADOPAGO_COLLECTOR_ID)
    )
      throw new HttpError(
        503,
        "As compras online ainda não foram ativadas. Fale com a equipe no Discord.",
      );
    const payload = z
      .object({ sku: z.string().max(100), acceptTerms: z.literal(true) })
      .parse(await body(req));
    let offer:
      { title: string; price: number; days: number | null } | undefined =
      offers[payload.sku as OfferId];
    if (payload.sku.startsWith("quote:")) {
      const q = await env.DB.prepare(
        "SELECT subject,quote_amount FROM tickets WHERE id=? AND user_id=? AND quote_amount IS NOT NULL",
      )
        .bind(payload.sku.slice(6), u.id)
        .first<{ subject: string; quote_amount: number }>();
      if (q) offer = { title: q.subject, price: q.quote_amount, days: null };
    }
    if (!offer) throw new HttpError(400, "Produto não encontrado.");
    const rights = await access(env, u.id);
    if (offer.days === null && rights.some((r) => r.sku === payload.sku))
      throw new HttpError(
        409,
        "Você já possui este produto. Consulte sua conta.",
      );
    if (
      ["creative-v6", "standalone"].includes(payload.sku) &&
      !(await env.DB.prepare("SELECT sku FROM deliveries WHERE sku=?")
        .bind(payload.sku)
        .first())
    )
      throw new HttpError(
        409,
        "Esta base está disponível por atendimento. Fale com a equipe no Discord.",
      );
    const id = crypto.randomUUID();
    const provider = env.INFINITEPAY_HANDLE ? "infinitepay" : "mercadopago";
    await env.DB.prepare(
      "INSERT INTO orders(id,user_id,sku,title,amount,provider) VALUES(?,?,?,?,?,?)",
    )
      .bind(id, u.id, payload.sku, offer.title, offer.price, provider)
      .run();
    if (provider === "infinitepay") {
      const result = await infinitePay("/links", {
        handle: env.INFINITEPAY_HANDLE,
        items: [
          {
            quantity: 1,
            price: offer.price,
            description: offer.title,
          },
        ],
        order_nsu: id,
        redirect_url: env.APP_URL + "/api/payments/infinitepay/return",
        webhook_url: env.APP_URL + "/api/webhooks/infinitepay",
        ...(u.email ? { customer: { name: u.name, email: u.email } } : {}),
      });
      const target = String(result.url || "");
      if (!/^https:\/\/([a-z0-9-]+\.)*infinitepay\.io\//i.test(target))
        throw new HttpError(502, "Checkout indisponível.");
      await env.DB.prepare("UPDATE orders SET checkout_url=? WHERE id=?")
        .bind(target, id)
        .run();
      return json({ url: target });
    }
    const result = await mp(env, "/checkout/preferences", {
      method: "POST",
      headers: { "X-Idempotency-Key": id },
      body: JSON.stringify({
        items: [
          {
            id: payload.sku,
            title: offer.title,
            quantity: 1,
            currency_id: "BRL",
            unit_price: offer.price / 100,
          },
        ],
        external_reference: id,
        notification_url: env.APP_URL + "/api/webhooks/mercadopago",
        back_urls: {
          success: env.APP_URL + "/#/conta?pagamento=retorno",
          pending: env.APP_URL + "/#/conta?pagamento=pendente",
          failure: env.APP_URL + "/#/conta?pagamento=falhou",
        },
        auto_return: "approved",
      }),
    });
    const target =
      env.PAYMENT_TEST_MODE === "true"
        ? result.sandbox_init_point
        : result.init_point;
    if (
      !target ||
      !/^https:\/\/[a-z0-9.-]*mercadopago\.(com|com\.br)\//.test(target)
    )
      throw new HttpError(502, "Checkout indisponível.");
    await env.DB.prepare("UPDATE orders SET checkout_url=? WHERE id=?")
      .bind(target, id)
      .run();
    return json({ url: target });
  }
  if (p === "/api/orders" && method === "GET") {
    const u = requireUser(user);
    return json(
      (
        await env.DB.prepare(
          "SELECT id,sku,title,amount,status,valid_until,created_at FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        )
          .bind(u.id)
          .all()
      ).results,
    );
  }
  const deliver = p.match(/^\/api\/orders\/([^/]+)\/download$/);
  if (deliver && method === "POST") {
    const u = requireUser(user);
    await rate(env, "delivery:" + u.id, 10);
    const row = await env.DB.prepare(
      "SELECT d.file_key,d.filename FROM orders o JOIN deliveries d ON d.sku=o.sku WHERE o.id=? AND o.user_id=? AND o.status='approved'",
    )
      .bind(deliver[1], u.id)
      .first<{ file_key: string; filename: string }>();
    if (!row) throw new HttpError(404, "Entrega não disponível.");
    const file = await env.FILES.get(row.file_key);
    if (!file)
      throw new HttpError(404, "Arquivo não encontrado. Contate o suporte.");
    return new Response(file.body, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename)}`,
      },
    });
  }
  if (p === "/api/tickets" && method === "GET") {
    const u = requireUser(user);
    return json(
      (
        await env.DB.prepare(
          "SELECT * FROM tickets WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
        )
          .bind(u.id)
          .all()
      ).results,
    );
  }
  if (p === "/api/tickets" && method === "POST") {
    const u = requireUser(user);
    await rate(env, "tickets:" + u.id, 5, 3600);
    const data = z
      .object({
        subject: z.string().trim().min(4).max(120),
        message: z.string().trim().min(20).max(8000),
        kind: z.enum(["quote", "support", "promotion"]),
      })
      .parse(await body(req));
    if (
      data.kind === "support" &&
      !(await access(env, u.id)).some(
        (r) =>
          r.sku === "support" || ["creative-v6", "standalone"].includes(r.sku),
      )
    )
      throw new HttpError(
        403,
        "O suporte técnico é reservado aos clientes.",
        "SUPPORT_REQUIRED",
      );
    if (
      data.kind === "promotion" &&
      !(await access(env, u.id)).some((r) =>
        ["seller-week", "seller-month", "community-month"].includes(r.sku),
      )
    )
      throw new HttpError(403, "Você precisa de um plano de divulgação ativo.");
    const id = crypto.randomUUID();
    await env.DB.prepare(
      "INSERT INTO tickets(id,user_id,subject,message) VALUES(?,?,?,?)",
    )
      .bind(
        id,
        u.id,
        (data.kind === "quote"
          ? "Orçamento: "
          : data.kind === "promotion"
            ? "Divulgação: "
            : "Suporte: ") + data.subject,
        data.message,
      )
      .run();
    return json({ id }, 201);
  }
  if (p === "/api/ai" && method === "POST") {
    const u = requireUser(user);
    if (!(await access(env, u.id)).some((r) => r.sku === "support"))
      throw new HttpError(
        403,
        "A IA ScR está incluída no plano de suporte.",
        "SUPPORT_REQUIRED",
      );
    if (!env.OPENAI_API_KEY)
      throw new HttpError(
        503,
        "A IA está temporariamente indisponível. Abra um chamado com a equipe.",
      );
    const { messages } = z
      .object({
        messages: z
          .array(
            z.object({
              role: z.enum(["user", "assistant"]),
              content: z.string().min(1).max(8000),
            }),
          )
          .min(1)
          .max(12),
      })
      .parse(await body(req, 65000));
    await rate(env, "ai:" + u.id, 5);
    const quota = await env.DB.prepare(
      "INSERT INTO daily_usage(user_id,day,ai_messages) VALUES(?,?,1) ON CONFLICT(user_id,day) DO UPDATE SET ai_messages=ai_messages+1 WHERE ai_messages<30 RETURNING ai_messages",
    )
      .bind(u.id, dayInBrazil())
      .first();
    if (!quota)
      throw new HttpError(
        429,
        "Você atingiu as 30 mensagens de IA de hoje. O suporte da equipe continua disponível.",
      );
    try {
      const res = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.OPENAI_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: env.OPENAI_MODEL || "gpt-4.1-mini",
          instructions:
            "Você é a IA ScR, assistente técnico de FiveM. Responda em português. Ajude com Lua, recursos, logs, instalação e configuração. Explique incertezas, solicite framework e logs quando necessário. Nunca peça senhas ou tokens. Não afirme executar ou testar código. Não ensine a contornar licenças, anticheats ou distribuir conteúdo sem autorização.",
          input: messages,
          max_output_tokens: 1800,
          store: false,
        }),
        signal: AbortSignal.timeout(45000),
      });
      if (!res.ok) throw new Error("ai-unavailable");
      const data = (await res.json()) as {
        output?: { content?: { type: string; text?: string }[] }[];
      };
      const answer = data.output
        ?.flatMap((o) => o.content || [])
        .filter((c) => c.type === "output_text")
        .map((c) => c.text)
        .join("\n");
      if (!answer) throw new Error("empty-ai-response");
      return json({ answer });
    } catch {
      await env.DB.prepare(
        "UPDATE daily_usage SET ai_messages=MAX(0,ai_messages-1) WHERE user_id=? AND day=?",
      )
        .bind(u.id, dayInBrazil())
        .run();
      throw new HttpError(
        502,
        "Não foi possível obter uma resposta. Tente novamente ou abra um chamado.",
      );
    }
  }
  if (p.startsWith("/api/admin")) {
    requireAdmin(user);
    if (p === "/api/admin/analytics" && method === "GET") {
      const [summary, daily, pages, users, recent] = await env.DB.batch([
        env.DB.prepare(
          "SELECT COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors,(SELECT COUNT(*) FROM users) users,(SELECT COUNT(*) FROM users WHERE last_login_at>=datetime('now','-30 days')) active_users FROM page_views WHERE created_at>=datetime('now','-30 days')",
        ),
        env.DB.prepare(
          "SELECT date(created_at) day,COUNT(*) views,COUNT(DISTINCT visitor_hash) visitors FROM page_views WHERE created_at>=datetime('now','-14 days') GROUP BY date(created_at) ORDER BY day",
        ),
        env.DB.prepare(
          "SELECT path,COUNT(*) views FROM page_views WHERE created_at>=datetime('now','-30 days') GROUP BY path ORDER BY views DESC LIMIT 10",
        ),
        env.DB.prepare(
          "SELECT id,name,email,auth_provider,last_login_at,last_login_ip,created_at FROM users ORDER BY COALESCE(last_login_at,created_at) DESC LIMIT 200",
        ),
        env.DB.prepare(
          "SELECT path,ip_address,user_agent,created_at FROM page_views ORDER BY created_at DESC LIMIT 100",
        ),
      ]);
      return json({
        summary: summary.results[0] || {
          views: 0,
          visitors: 0,
          users: 0,
          active_users: 0,
        },
        daily: daily.results,
        pages: pages.results,
        users: users.results,
        recent: recent.results,
      });
    }
    if (p === "/api/admin/resources" && method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT * FROM resources ORDER BY created_at DESC",
          ).all()
        ).results.map((r) => ({ ...resourceFromRow(r), fileKey: r.file_key })),
      );
    if (p === "/api/admin/resources" && method === "POST") {
      const data = resourceSchema.parse(await body(req));
      if (data.fileKey && !(await env.FILES.head(data.fileKey)))
        throw new HttpError(400, "Envie o arquivo antes de salvar.");
      const id = crypto.randomUUID();
      await env.DB.prepare(
        "INSERT INTO resources(id,title,description,category,framework,version,exclusive,published,reviewed,author,license,media,file_key,filename) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
        .bind(
          id,
          data.title,
          data.description,
          data.category,
          data.framework,
          data.version,
          +data.exclusive,
          +data.published,
          +data.reviewed,
          data.author,
          data.license,
          JSON.stringify(data.media),
          data.fileKey,
          data.filename,
        )
        .run();
      return json({ id }, 201);
    }
    const match = p.match(/^\/api\/admin\/resources\/([^/]+)$/);
    if (match && method === "PUT") {
      const data = resourceSchema.parse(await body(req));
      if (data.fileKey && !(await env.FILES.head(data.fileKey)))
        throw new HttpError(400, "Arquivo não encontrado.");
      const result = await env.DB.prepare(
        "UPDATE resources SET title=?,description=?,category=?,framework=?,version=?,exclusive=?,published=?,reviewed=?,author=?,license=?,media=?,file_key=?,filename=? WHERE id=?",
      )
        .bind(
          data.title,
          data.description,
          data.category,
          data.framework,
          data.version,
          +data.exclusive,
          +data.published,
          +data.reviewed,
          data.author,
          data.license,
          JSON.stringify(data.media),
          data.fileKey,
          data.filename,
          match[1],
        )
        .run();
      if (!result.meta.changes)
        throw new HttpError(404, "Resource não encontrado.");
      return json({ ok: true });
    }
    if (match && method === "DELETE") {
      await env.DB.prepare("DELETE FROM resources WHERE id=?")
        .bind(match[1])
        .run();
      return json({ ok: true });
    }
    if (p === "/api/admin/upload" && method === "POST") {
      const form = await limited(req, 55 * 1024 * 1024).formData();
      const file = form.get("file");
      if (!(file instanceof File))
        throw new HttpError(400, "Selecione um arquivo.");
      const isZip = file.name.toLowerCase().endsWith(".zip");
      if (file.size > (isZip ? 50 : 25) * 1024 * 1024)
        throw new HttpError(
          413,
          isZip ? "O ZIP deve ter até 50 MB." : "A mídia deve ter até 25 MB.",
        );
      let type = file.type;
      const start = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const hex = Array.from(start)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      const valid = isZip
        ? hex.startsWith("504b0304")
        : type === "image/png"
          ? hex.startsWith("89504e470d0a1a0a")
          : type === "image/jpeg"
            ? hex.startsWith("ffd8ff")
            : type === "image/webp"
              ? hex.startsWith("52494646") && hex.slice(16, 24) === "57454250"
              : type === "video/mp4"
                ? hex.slice(8, 16) === "66747970"
                : false;
      if (!valid)
        throw new HttpError(
          400,
          "Formato inválido. Use ZIP, PNG, JPG, WebP ou MP4.",
        );
      if (isZip) type = "application/zip";
      const ext = isZip
        ? "zip"
        : (
            {
              "image/png": "png",
              "image/jpeg": "jpg",
              "image/webp": "webp",
              "video/mp4": "mp4",
            } as Record<string, string>
          )[type];
      const key = `${isZip ? "resources" : "media"}/${crypto.randomUUID()}.${ext}`;
      await env.FILES.put(key, file.stream(), {
        httpMetadata: { contentType: type },
      });
      return json({
        key,
        url: isZip ? null : "/api/media/" + key,
        filename: file.name,
        type: type.startsWith("video/") ? "video" : "image",
      });
    }
    if (p === "/api/admin/tickets" && method === "GET")
      return json(
        (
          await env.DB.prepare(
            "SELECT t.*,u.name FROM tickets t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC LIMIT 200",
          ).all()
        ).results,
      );
    const ticket = p.match(/^\/api\/admin\/tickets\/([^/]+)$/);
    if (ticket && method === "PUT") {
      const data = z
        .object({
          reply: z.string().max(8000),
          status: z.enum(["open", "answered", "closed"]),
          quoteAmount: z.number().int().min(100).max(10000000).nullable(),
        })
        .parse(await body(req));
      await env.DB.prepare(
        "UPDATE tickets SET reply=?,status=?,quote_amount=?,updated_at=CURRENT_TIMESTAMP WHERE id=?",
      )
        .bind(data.reply, data.status, data.quoteAmount, ticket[1])
        .run();
      return json({ ok: true });
    }
    if (p === "/api/admin/deliveries" && method === "GET")
      return json(
        (await env.DB.prepare("SELECT * FROM deliveries").all()).results,
      );
    if (p === "/api/admin/deliveries" && method === "POST") {
      const data = z
        .object({
          sku: z.enum(["creative-v6", "standalone"]),
          fileKey: z.string().regex(/^resources\/[a-zA-Z0-9._/-]+$/),
          filename: z.string().min(1).max(200),
        })
        .parse(await body(req));
      if (!(await env.FILES.head(data.fileKey)))
        throw new HttpError(400, "Arquivo não encontrado.");
      await env.DB.prepare(
        "INSERT INTO deliveries(sku,file_key,filename) VALUES(?,?,?) ON CONFLICT(sku) DO UPDATE SET file_key=excluded.file_key,filename=excluded.filename",
      )
        .bind(data.sku, data.fileKey, data.filename)
        .run();
      return json({ ok: true });
    }
  }
  throw new HttpError(404, "Página não encontrada.");
}
export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    let response: Response;
    try {
      response = await route(req, env);
    } catch (error) {
      if (error instanceof z.ZodError)
        response = json(
          { error: error.issues[0]?.message || "Verifique os campos." },
          400,
        );
      else if (error instanceof HttpError)
        response = json(
          { error: error.message, code: error.code },
          error.status,
        );
      else {
        console.error(
          "Request failed",
          new URL(req.url).pathname,
          error instanceof Error ? error.message : "unknown",
        );
        response = json(
          {
            error:
              "Não foi possível concluir agora. Tente novamente em instantes.",
          },
          500,
        );
      }
    }
    const headers = new Headers(response.headers);
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
    headers.set("X-Frame-Options", "DENY");
    if (
      new URL(req.url).pathname.startsWith("/api/") &&
      !new URL(req.url).pathname.startsWith("/api/media/")
    )
      headers.set("Cache-Control", "no-store");
    if (!new URL(req.url).pathname.startsWith("/api/"))
      headers.set(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' https: data: blob:; media-src 'self' https: blob:; connect-src 'self'; frame-src https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
      );
    return new Response(response.body, { status: response.status, headers });
  },
  async scheduled(_event: ScheduledController, env: Env) {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE expires_at<?").bind(
        Date.now(),
      ),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at<?").bind(
        Date.now(),
      ),
      env.DB.prepare(
        "DELETE FROM daily_usage WHERE day<date('now','-90 days')",
      ),
      env.DB.prepare(
        "DELETE FROM page_views WHERE created_at<datetime('now','-90 days')",
      ),
    ]);
  },
} satisfies ExportedHandler<Env>;

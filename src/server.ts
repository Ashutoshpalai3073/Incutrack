import "./lib/error-capture";
import 'dotenv/config';
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import { WEBSITE_KNOWLEDGE } from './lib/knowledge';

interface Env {
  GROQ_API_KEY?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  FRONTEND_URL?: string;
  RESEND_API_KEY?: string;
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return false; }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") return false;
  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) return false;
  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;
  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) return response;
  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

// ─── IncuScore Phase 1 — AI startup analysis ──────────────────────────────────
async function handleIncuScorePhase1(request: Request): Promise<Response> {
  try {
    const body = await request.json() as {
      name: string; founder: string; industry: string;
      tagline: string; fundingGoal: number; description: string;
    };

    const { name, founder, industry, tagline, fundingGoal, description } = body;

    if (!name || !description) {
      return new Response(
        JSON.stringify({ error: 'Company name and description are required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

    const prompt = `
You are a senior venture capital analyst at a top-tier firm evaluating early-stage Indian startups.
Your job is to score this startup and provide actionable intelligence.

STARTUP DETAILS:
- Company: ${name}
- Founder: ${founder}
- Industry: ${industry}
- Tagline: "${tagline}"
- Funding Goal: ₹${(fundingGoal / 1e6).toFixed(1)}M
- Description: "${description}"

SCORING RUBRIC (score each category 0–20, total max 100):
1. Problem Clarity: Is the problem real, urgent, and clearly articulated?
2. Market Opportunity: Does this address a large/growing market in India or globally?
3. Solution Uniqueness: Is there genuine differentiation or defensible moat?
4. Business Model: Is there a clear path to revenue and sustainability?
5. Team Signal: Does the founder profile suggest execution capability?

INDUSTRY CONTEXT:
- SaaS/B2B: Weight business model and scalability heavily
- FinTech: Weight regulation awareness and unit economics
- DeepTech/AI: Weight innovation and team technical depth
- HealthTech: Weight regulatory pathway and clinical validation
- ClimaTech: Weight impact metrics and policy alignment

Respond ONLY with a valid JSON object, no markdown, no explanation:
{
  "scores": {
    "problemClarity": <0-20>,
    "marketOpportunity": <0-20>,
    "solutionUniqueness": <0-20>,
    "businessModel": <0-20>,
    "teamSignal": <0-20>
  },
  "total": <sum of above 0-100>,
  "band": "<Investor-Grade | Strong | Promising | Early Stage | Pre-Idea>",
  "remark": "<2 sentence honest assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "investorMessage": "<1 sentence message about investment readiness>"
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    const total = Math.min(100, Math.max(0, result.total ?? 0));

    return new Response(
      JSON.stringify({ ...result, total, phase: 1 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[incuscore-p1]', err);
    return new Response(
      JSON.stringify({
        total: 68, phase: 1, band: 'Promising',
        remark: 'Initial analysis based on submitted details. Upload your pitch deck for a deeper evaluation.',
        strengths: ['Registered on Incutrack', 'Idea submitted for review', 'Journey started'],
        improvements: ['Add more detail to your description', 'Upload a pitch deck'],
        keywords: ['startup', 'early-stage', 'india', 'building', 'founder'],
        investorMessage: 'Complete your pitch vault to unlock your full IncuScore.',
        scores: { problemClarity: 14, marketOpportunity: 13, solutionUniqueness: 13, businessModel: 14, teamSignal: 14 },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── IncuScore Phase 2 — Document-weighted rescore ───────────────────────────
async function handleIncuScorePhase2(request: Request): Promise<Response> {
  let bodyParsed: {
    previousScore: number; startupName: string; documentName: string;
    documentType: string; documentStatus: string; industry: string; description: string;
  } | null = null;

  try {
    bodyParsed = await request.json();
    const {
      previousScore, startupName, documentName,
      documentType, documentStatus, industry, description,
    } = bodyParsed!;

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });

    const prompt = `
You are a senior VC analyst reviewing a pitch document submission for an Indian startup.
This is Phase 2 — the document carries MORE weight than the initial registration details.

STARTUP CONTEXT:
- Company: ${startupName}
- Industry: ${industry}
- Description: "${description}"
- Phase 1 IncuScore: ${previousScore}/100

DOCUMENT SUBMITTED:
- Name: "${documentName}"
- Type: ${documentType} (Deck=pitch deck, Doc=executive summary, Sheet=financials, Bundle=full pack)
- Status: ${documentStatus} (Final > Review > Draft in quality signal)

DOCUMENT SCORING RUBRIC (score each 0–25, total max 100):
1. Pitch Structure Signal: Does the name/type suggest a complete narrative arc?
2. Financial Signal: Does the type suggest financial depth and projections?
3. Market Research Signal: Does the submission suggest data-backed claims?
4. Execution Clarity: Does status and naming suggest polish and readiness?

FINAL SCORE FORMULA:
- Previous score weight: 40%
- Document quality weight: 60%
- The document MUST meaningfully shift the total (min +5, max +25 from previous)
- Be rigorous — VCs see through inflated scores

Respond ONLY with valid JSON, no markdown:
{
  "documentScores": {
    "pitchStructure": <0-25>,
    "financialSignal": <0-25>,
    "marketResearch": <0-25>,
    "executionClarity": <0-25>
  },
  "documentTotal": <sum 0-100>,
  "finalScore": <weighted final 0-100>,
  "delta": <finalScore minus previousScore>,
  "band": "<Investor-Grade | Strong | Promising | Early Stage | Pre-Idea>",
  "remark": "<2 sentence honest assessment focused on the document>",
  "documentInsights": ["<insight 1>", "<insight 2>", "<insight 3>"],
  "keywords": ["<kw1>", "<kw2>", "<kw3>", "<kw4>", "<kw5>"],
  "finalMessage": "<Honest final message to the founder about investor readiness>",
  "readyForVCs": <true if finalScore >= 76, false otherwise>
}`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.25,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.choices[0].message.content ?? '{}';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    const finalScore = Math.min(100, Math.max(0, result.finalScore ?? previousScore + 5));

    return new Response(
      JSON.stringify({ ...result, finalScore, phase: 2 }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[incuscore-p2]', err);
    const prev = bodyParsed?.previousScore ?? 70;
    const fallbackFinal = Math.min(100, Math.round(prev * 0.4 + 78 * 0.6));
    return new Response(
      JSON.stringify({
        finalScore: fallbackFinal, delta: fallbackFinal - prev, phase: 2,
        band: fallbackFinal >= 76 ? 'Strong' : 'Promising',
        remark: 'Document received and factored into your IncuScore.',
        documentInsights: ['Document submitted successfully', 'Score updated based on submission quality', 'Upload a Final-status deck for maximum impact'],
        keywords: ['pitch', 'document', 'investor-ready', 'vault', 'submitted'],
        finalMessage: 'Your pitch vault is taking shape. Keep refining for the best investor impression.',
        readyForVCs: fallbackFinal >= 76,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}


// ─── Startup Insert ───────────────────────────────────────────────────────────
// ─── Document Delete ──────────────────────────────────────────────────────────
async function handleDocumentDelete(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    const { name, file_path } = await request.json() as { name: string; file_path?: string };
    if (!name) {
      return new Response(JSON.stringify({ error: 'Document name required.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    // Delete file from storage if it exists
    if (file_path) {
      await admin.storage.from('pitch-vault').remove([file_path]);
    }
    // Delete record from database
    const { error } = await admin.from('documents').delete().eq('name', name);
    if (error) {
      console.error('[documents/delete]', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[documents/delete] unexpected:', err);
    return new Response(JSON.stringify({ error: 'Failed to delete document.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}


async function handleStartupInsert(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server not configured.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as {
      id: string; name: string; tagline: string; description: string;
      founder: string; industry: string; stage: string;
      fundingGoal: number; raised: number; pitchScore: number; members: number;
    };
    const { data, error } = await admin
      .from('startups')
      .upsert({
        id: body.id, name: body.name, tagline: body.tagline,
        description: body.description, founder: body.founder,
        industry: body.industry, stage: body.stage,
        funding_goal: body.fundingGoal, raised: body.raised,
        pitch_score: body.pitchScore, members: body.members,
      }, { onConflict: 'id' })
      .select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to save startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Startup Delete ───────────────────────────────────────────────────────────
async function handleStartupDelete(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const { id, startupName } = await request.json() as { id: string; startupName: string };
    // Delete linked documents first using startup_name
    if (startupName) {
      await admin.from('documents').delete().eq('startup_name', startupName);
    }
    // Then delete the startup
    await admin.from('startups').delete().eq('id', id);
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[startups/delete]', err);
    return new Response(JSON.stringify({ error: 'Failed to delete startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Startup Update (stage/raised) ───────────────────────────────────────────
async function handleStartupUpdate(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const body = await request.json() as { id: string; [key: string]: unknown };
    const { id, ...fields } = body;
    const mapped: Record<string, unknown> = {};
    if (fields.stage !== undefined) mapped.stage = fields.stage;
    if (fields.raised !== undefined) mapped.raised = fields.raised;
    if (fields.pitchScore !== undefined) mapped.pitch_score = fields.pitchScore;
    if (fields.fundingGoal !== undefined) mapped.funding_goal = fields.fundingGoal;
    if (fields.name !== undefined) mapped.name = fields.name;
    if (fields.tagline !== undefined) mapped.tagline = fields.tagline;
    if (fields.description !== undefined) mapped.description = fields.description;
    if (fields.founder !== undefined) mapped.founder = fields.founder;
    if (fields.industry !== undefined) mapped.industry = fields.industry;
    const { data, error } = await admin.from('startups').update(mapped).eq('id', id).select().single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Failed to update startup.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Document Insert ──────────────────────────────────────────────────────────
async function handleDocumentInsert(request: Request): Promise<Response> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[documents] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    return new Response(
      JSON.stringify({ error: 'Server not configured with Supabase credentials.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ error: 'Expected multipart/form-data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const name   = ((formData.get('name')   as string) || '').trim();
    const type   =  (formData.get('type')   as string) || 'Doc';
    const status =  (formData.get('status') as string) || 'Draft';
    const file   =   formData.get('file')   as File | null;

    if (!name) {
      return new Response(
        JSON.stringify({ error: 'Document name is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let file_url = '', file_path = '';

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop() || 'bin';
      const filePath = `${Date.now()}-${name.replace(/\s+/g, '-')}.${ext}`;
      const buffer = await file.arrayBuffer();

      const { data: storageData, error: storageErr } = await admin.storage
        .from('pitch-vault')
        .upload(filePath, buffer, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        });

      if (storageErr) { console.error('[documents] Storage error:', storageErr); throw new Error(storageErr.message); }

      file_path = storageData.path;
      const { data: urlData } = admin.storage.from('pitch-vault').getPublicUrl(file_path);
      file_url = urlData.publicUrl;
    }

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const today = new Date();

    const startupName = (formData.get('startup_name') as string) || '';

    const newDoc = {
      name,
      type,
      status,
      date:  `${months[today.getMonth()]} ${today.getDate()}`,
      views: 0,
      score: Math.floor(Math.random() * 15) + 72,
      file_url,
      file_path,
      startup_name: startupName,
    };

   const { data, error } = await admin
  .from('documents')
  .upsert(newDoc, { onConflict: 'name' })
  .select()
  .single();

    if (error) {
      console.error('[documents] DB insert error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('[documents] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Failed to insert document.';
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────
async function handleChatRequest(request: Request, _env: unknown): Promise<Response> {
  try {
    const { messages } = await request.json() as { messages: ChatCompletionMessageParam[] };
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
    const SYSTEM_PROMPT = `You are a helpful assistant for Incutrack, a platform for startup founders.
Answer ONLY based on the info below. If unsure, say: "For more details, please reach out to the Incutrack team."
Be friendly, concise, and helpful.\n\n${WEBSITE_KNOWLEDGE}`;
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 500,
      messages: [{ role: 'system' as const, content: SYSTEM_PROMPT }, ...messages],
    });
    return new Response(
      JSON.stringify({ reply: response.choices[0].message.content }),
      { status: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: 'Something went wrong' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// ─── Auth utilities ───────────────────────────────────────────────────────────
const enc = (s: string) => new TextEncoder().encode(s);
const b64url = (s: string) =>
  btoa(s).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
const b64urlBuf = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

async function createJWT(payload: object, secret: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + 60 * 60 * 24 * 7 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc(data));
  return `${data}.${b64urlBuf(sig)}`;
}

async function verifyJWT(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const key = await crypto.subtle.importKey(
    'raw', enc(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
  );
  let sigBytes: ArrayBuffer;
  try {
    const arr = Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    sigBytes = arr.buffer.slice(arr.byteOffset, arr.byteOffset + arr.byteLength) as ArrayBuffer;
  } catch { return null; }
  const ok = await crypto.subtle.verify('HMAC', key, sigBytes, enc(`${h}.${p}`));
  if (!ok) return null;
  try {
    const pl = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/')));
    if (pl.exp && pl.exp < Math.floor(Date.now() / 1000)) return null;
    return pl;
  } catch { return null; }
}

function parseCookies(request: Request): Record<string, string> {
  const cookies: Record<string, string> = {};
  const header = request.headers.get('Cookie') || '';
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) cookies[k] = decodeURIComponent(v);
  }
  return cookies;
}

function setJWTCookie(token: string): string {
  return `jwt=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60 * 60 * 24 * 7}`;
}
function clearJWTCookie(): string {
  return `jwt=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function jsonRes(body: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  });
}

function generateOTP(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  const n = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  return String(100000 + (n % 900000));
}

function generateRandomString(len: number): string {
  const bytes = new Uint8Array(Math.ceil(len * 3 / 4));
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
    .slice(0, len);
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', enc(verifier));
  return b64urlBuf(hash);
}

function getAuthAdmin(env: Env) {
  const url = env.SUPABASE_URL || process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function getAnonClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const key = process.env.VITE_SUPABASE_ANON_KEY || '';
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

// ─── Auth: Sign Up ────────────────────────────────────────────────────────────
async function handleSignUp(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; name?: string };
  try { body = await request.json() as { email?: string; name?: string }; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const name  = (body.name  || '').trim();
  console.log('[signup] body received:', { email, name });
  if (!email || !name) return jsonRes({ message: 'Email and name are required.' }, 400);

  try {
    const _dbUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
    const _dbKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
    console.log('[signup] SUPABASE_URL (first 10):', _dbUrl.slice(0, 10) || '(not set)');
    console.log('[signup] SUPABASE_SERVICE_ROLE_KEY (first 10):', _dbKey.slice(0, 10) || '(not set)');
    const admin = getAuthAdmin(env);

    const { data: emailUser, error: emailErr } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    console.log('[signup] email lookup result — data:', emailUser, '| error:', JSON.stringify(emailErr));
    if (emailErr) { console.error('[signup] users lookup error:', emailErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }

    if (emailUser) {
      if (emailUser.auth_method === 'google') {
        return jsonRes({ case: 'google_conflict', message: 'This email is already registered with Google login. Please use Google to log in.' }, 409);
      }
      if (emailUser.name === name) {
        return jsonRes({ case: 'already_registered', message: "You're already registered. Log in to continue." }, 409);
      }
      return jsonRes({ case: 'email_taken', message: 'This email is already registered under a different name.' }, 409);
    }

    const { data: nameUser, error: nameErr } = await admin.from('users').select('id').eq('name', name).maybeSingle();
    console.log('[signup] name lookup result — data:', nameUser, '| error:', JSON.stringify(nameErr));
    if (nameErr) { console.error('[signup] name lookup error:', nameErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }
    if (nameUser) {
      return jsonRes({ case: 'name_taken', message: 'This name is already taken by another account.' }, 409);
    }

    const anonClient = getAnonClient();
    const { error: otpErr } = await anonClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (otpErr) {
      console.error('[signup] Supabase OTP error:', otpErr);
      return jsonRes({ message: 'Failed to send verification code. Please try again.' }, 500);
    }

    console.log('[signup] OTP sent via Supabase Auth to:', email);
    return jsonRes({ ok: true, message: 'OTP sent. Check your email.' });
  } catch (err) {
    console.error('[signup] unexpected error:', err);
    return jsonRes({ message: 'An error occurred. Please try again.' }, 500);
  }
}

// ─── Auth: Verify OTP ────────────────────────────────────────────────────────
async function handleVerifyOTP(request: Request, env: Env): Promise<Response> {
  let body: { email?: string; code?: string; type?: 'signup' | 'login'; name?: string };
  try { body = await request.json() as typeof body; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  const code  = (body.code  || '').trim();
  const type  = body.type || 'login';
  const name  = (body.name  || '').trim();

  if (!email || !code) return jsonRes({ message: 'Email and code are required.' }, 400);

  const admin  = getAuthAdmin(env);
  const secret = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';

  const anonClient = getAnonClient();
  const { error: verifyErr } = await anonClient.auth.verifyOtp({
    email,
    token: code,
    type: 'email',
  });

  if (verifyErr) {
    console.error('[verify-otp] Supabase verify error:', verifyErr);
    if (verifyErr.message?.toLowerCase().includes('expired')) {
      return jsonRes({ message: 'OTP has expired. Please request a new one.' }, 400);
    }
    return jsonRes({ message: 'Invalid OTP. Please try again.' }, 400);
  }

  let user: Record<string, unknown>;

  if (type === 'signup') {
    if (!name) return jsonRes({ message: 'Name is required for sign up.' }, 400);
    const { data: newUser, error } = await admin
      .from('users')
      .insert({ email, name, auth_method: 'otp' })
      .select()
      .single();
    if (error) return jsonRes({ message: 'Failed to create account. Please try again.' }, 500);
    user = newUser;
  } else {
    const { data: existing } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    if (!existing) return jsonRes({ message: 'User not found. Please sign up first.' }, 404);
    user = existing;
  }

  const jwtPayload = {
    email: user.email,
    name: user.name,
    google_id: user.google_id ?? null,
    auth_method: user.auth_method,
    avatar_url: user.avatar_url ?? null,
  };

  const token = await createJWT(jwtPayload, secret);

  return new Response(JSON.stringify({ ok: true, user: jwtPayload }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': setJWTCookie(token) },
  });
}

// ─── Auth: Log In ─────────────────────────────────────────────────────────────
async function handleLogin(request: Request, env: Env): Promise<Response> {
  let body: { email?: string };
  try { body = await request.json() as { email?: string }; }
  catch { return jsonRes({ message: 'Invalid request body.' }, 400); }

  const email = (body.email || '').trim().toLowerCase();
  if (!email) return jsonRes({ message: 'Email is required.' }, 400);

  try {
    const admin = getAuthAdmin(env);
    const { data: user, error: userErr } = await admin.from('users').select('*').eq('email', email).maybeSingle();
    if (userErr) { console.error('[login] users lookup error:', userErr); return jsonRes({ message: 'Database error. Please try again.' }, 500); }

    if (!user) return jsonRes({ message: 'User not found. Please sign up first.' }, 404);
    if (user.auth_method === 'google') {
      return jsonRes({ case: 'google_conflict', message: 'This email is registered with Google login. Please use the Continue with Google button to log in.' }, 409);
    }

    const anonClient = getAnonClient();
    const { error: otpErr } = await anonClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (otpErr) {
      console.error('[login] Supabase OTP error:', otpErr);
      return jsonRes({ message: 'Failed to send verification code. Please try again.' }, 500);
    }

    return jsonRes({ ok: true, message: 'OTP sent. Check your email.' });
  } catch (err) {
    console.error('[login] unexpected error:', err);
    return jsonRes({ message: 'An error occurred. Please try again.' }, 500);
  }
}

// ─── Auth: Log Out ────────────────────────────────────────────────────────────
async function handleLogout(): Promise<Response> {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearJWTCookie() },
  });
}

// ─── Auth: Me ─────────────────────────────────────────────────────────────────
async function handleMe(request: Request, env: Env): Promise<Response> {
  const secret  = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const cookies = parseCookies(request);
  const token   = cookies['jwt'];
  if (!token) return jsonRes({ message: 'Not authenticated.' }, 401);
  const payload = await verifyJWT(token, secret);
  if (!payload) return jsonRes({ message: 'Invalid or expired session.' }, 401);
  return jsonRes({
    email: payload.email,
    name: payload.name,
    google_id: payload.google_id ?? null,
    auth_method: payload.auth_method,
    avatar_url: payload.avatar_url ?? null,
  });
}

// ─── Auth: Delete Account ─────────────────────────────────────────────────────
async function handleDeleteAccount(request: Request, env: Env): Promise<Response> {
  const secret  = env.JWT_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-production';
  const cookies = parseCookies(request);
  const token   = cookies['jwt'];
  if (!token) return jsonRes({ message: 'Not authenticated.' }, 401);
  const payload = await verifyJWT(token, secret);
  if (!payload) return jsonRes({ message: 'Invalid or expired session.' }, 401);

  const admin = getAuthAdmin(env);
  const email = payload.email as string;
  await admin.from('otps').delete().eq('email', email);
  const { error } = await admin.from('users').delete().eq('email', email);
  if (error) return jsonRes({ message: 'Failed to delete account.' }, 500);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': clearJWTCookie() },
  });
}

// ─── Auth: Google Init ────────────────────────────────────────────────────────
async function handleGoogleInit(request: Request, env: Env): Promise<Response> {
  try {
    const clientId    = env.GOOGLE_CLIENT_ID    || process.env.GOOGLE_CLIENT_ID    || '';
    const frontendUrl = env.FRONTEND_URL        || process.env.FRONTEND_URL        || 'http://localhost:3000';

    console.log('[google-init] clientId present:', !!clientId, '| frontendUrl:', frontendUrl);
    if (!clientId) return jsonRes({ message: 'Google OAuth is not configured. Add GOOGLE_CLIENT_ID to your environment.' }, 500);

    const state        = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const redirectUri  = `${frontendUrl}/api/auth/google/callback`;

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      access_type: 'online',
    });

    const cookieOpts = 'HttpOnly; SameSite=Lax; Path=/; Max-Age=600';
    const headers = new Headers({
      Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}`,
    });
    headers.append('Set-Cookie', `oauth_state=${state}; ${cookieOpts}`);
    headers.append('Set-Cookie', `oauth_code_verifier=${codeVerifier}; ${cookieOpts}`);
    return new Response(null, { status: 302, headers });
  } catch (err) {
    console.error('[google-init] unexpected error:', err);
    return jsonRes({ message: 'Google OAuth initialisation failed.' }, 500);
  }
}

// ─── Auth: Google Callback ────────────────────────────────────────────────────
async function handleGoogleCallback(request: Request, env: Env): Promise<Response> {
  const url         = new URL(request.url);
  const code        = url.searchParams.get('code');
  const stateParam  = url.searchParams.get('state');
  const errorParam  = url.searchParams.get('error');

  const clientId     = env.GOOGLE_CLIENT_ID        || process.env.GOOGLE_CLIENT_ID        || '';
  const clientSecret = env.GOOGLE_CLIENT_SECRET     || process.env.GOOGLE_CLIENT_SECRET     || '';
  const frontendUrl  = env.FRONTEND_URL             || process.env.FRONTEND_URL             || 'http://localhost:3000';
  const jwtSecret    = env.JWT_SECRET               || process.env.JWT_SECRET               || 'dev-secret-change-in-production';

  console.log('[google-callback] GOOGLE_CLIENT_ID (first 10):', clientId.slice(0, 10) || '(not set)');
  console.log('[google-callback] GOOGLE_CLIENT_SECRET (first 10):', clientSecret.slice(0, 10) || '(not set)');

  const redirect = (reason: string) => new Response(null, { status: 302, headers: { Location: `${frontendUrl}/auth-error?reason=${reason}` } });

  if (errorParam) return redirect('cancelled');
  if (!code || !stateParam) return redirect('invalid_state');

  const cookies      = parseCookies(request);
  const savedState   = cookies['oauth_state'];
  const codeVerifier = cookies['oauth_code_verifier'];

  const clearCookies = [
    'oauth_state=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
    'oauth_code_verifier=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0',
  ];

  if (!savedState || savedState !== stateParam || !codeVerifier) return redirect('invalid_state');

  const redirectUri = `${frontendUrl}/api/auth/google/callback`;

  console.log('[google-callback] code received (first 10):', code.slice(0, 10));
  console.log('[google-callback] redirect_uri:', redirectUri);

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code', code_verifier: codeVerifier }),
  });

  console.log('[google-callback] token exchange HTTP status:', tokenRes.status);
  if (!tokenRes.ok) {
    const tokenErrBody = await tokenRes.text().catch(() => '');
    console.error('[google-callback] token exchange error body:', tokenErrBody);
    return redirect('token_failed');
  }
  const tokens = await tokenRes.json() as { access_token: string };
  console.log('[google-callback] token exchange OK, access_token present:', !!tokens.access_token);

  const userInfoRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  console.log('[google-callback] userinfo HTTP status:', userInfoRes.status);
  if (!userInfoRes.ok) return redirect('userinfo_failed');

  const googleUser = await userInfoRes.json() as { sub: string; email: string; name: string; picture?: string };

  const admin = getAuthAdmin(env);
  const supabaseUrl = env.SUPABASE_URL || process.env.SUPABASE_URL || '(not set)';
  console.log('[google-callback] googleUser:', { email: googleUser.email, name: googleUser.name, sub: googleUser.sub });
  console.log('[google-callback] using Supabase URL:', supabaseUrl);

  const { data: emailUser, error: emailLookupErr } = await admin.from('users').select('*').eq('email', googleUser.email).maybeSingle();
  if (emailLookupErr) {
    console.error('[google-callback] users table lookup failed:', JSON.stringify(emailLookupErr));
    console.error('[google-callback] → Have you run src/migrations/001_auth_tables.sql in your Supabase dashboard?');
    return redirect('db_error');
  }

  if (emailUser && emailUser.auth_method === 'otp') {
    const h = new Headers({ Location: `${frontendUrl}/auth-error?reason=otp_conflict` });
    clearCookies.forEach(c => h.append('Set-Cookie', c));
    return new Response(null, { status: 302, headers: h });
  }

  let user: Record<string, unknown>;

  if (emailUser) {
    user = emailUser;
  } else {
    const { data: byGoogleId, error: googleIdLookupErr } = await admin.from('users').select('*').eq('google_id', googleUser.sub).maybeSingle();
    if (googleIdLookupErr) {
      console.error('[google-callback] google_id lookup failed:', JSON.stringify(googleIdLookupErr));
      return redirect('db_error');
    }
    if (byGoogleId) {
      user = byGoogleId;
    } else {
      const { data: newUser, error: insertErr } = await admin.from('users')
        .insert({ email: googleUser.email, name: googleUser.name, google_id: googleUser.sub, avatar_url: googleUser.picture || null, auth_method: 'google' })
        .select().single();
      if (insertErr) {
        console.error('[google-callback] user insert failed:', JSON.stringify(insertErr));
        console.error('[google-callback] → Have you run src/migrations/001_auth_tables.sql in your Supabase dashboard?');
        return redirect('db_error');
      }
      user = newUser;
    }
  }

  const jwtPayload = {
    email: user.email,
    name: user.name,
    google_id: user.google_id ?? null,
    auth_method: user.auth_method,
    avatar_url: user.avatar_url ?? null,
  };

  const token = await createJWT(jwtPayload, jwtSecret);

  const h = new Headers({ Location: `${frontendUrl}/?token=${token}` });
  h.append('Set-Cookie', setJWTCookie(token));
  clearCookies.forEach(c => h.append('Set-Cookie', c));
  return new Response(null, { status: 302, headers: h });
}

// ─── Main fetch handler ───────────────────────────────────────────────────────
export default {
  async fetch(request: Request, env: Env, ctx: unknown) {
    // In Vite dev mode (Node.js adapter) env arrives as undefined — normalise it
    // so every handler can safely access env.X without a TypeError.
    const e: Env = (env as Env | undefined) ?? {};

    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };

    // ── Auth routes ──────────────────────────────────────────────────────────
    if (pathname === '/api/auth/signup'         && method === 'POST') return handleSignUp(request, e);
    if (pathname === '/api/auth/verify-otp'     && method === 'POST') return handleVerifyOTP(request, e);
    if (pathname === '/api/auth/login'          && method === 'POST') return handleLogin(request, e);
    if (pathname === '/api/auth/logout'         && method === 'POST') return handleLogout();
    if (pathname === '/api/auth/me'             && method === 'GET')  return handleMe(request, e);
    if (pathname === '/api/auth/delete-account' && method === 'POST') return handleDeleteAccount(request, e);
    if (pathname === '/api/auth/google'         && method === 'GET')  return handleGoogleInit(request, e);
    if (pathname === '/api/auth/google/callback'&& method === 'GET')  return handleGoogleCallback(request, e);

    if (pathname === '/api/chat' && method === 'POST')
      return handleChatRequest(request, env);

    if (pathname === '/api/incuscore/phase1' && method === 'POST')
      return handleIncuScorePhase1(request);

    if (pathname === '/api/incuscore/phase2' && method === 'POST')
      return handleIncuScorePhase2(request);

    if (pathname === '/api/documents' && method === 'POST')
      return handleDocumentInsert(request);

    if (pathname === '/api/documents/delete' && method === 'POST')
      return handleDocumentDelete(request);

    if (pathname === '/api/startups' && method === 'POST')
      return handleStartupInsert(request);

    if (pathname === '/api/startups/update' && method === 'POST')
      return handleStartupUpdate(request);

    if (pathname === '/api/startups/delete' && method === 'POST')
      return handleStartupDelete(request);

    if (
      (pathname === '/api/chat' || pathname === '/api/documents') &&
      method === 'OPTIONS'
    ) {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
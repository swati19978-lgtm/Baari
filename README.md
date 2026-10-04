# Baari queue message demo

The existing landing page is preserved except for the demo section and its controls. The demo asks for sample token, people ahead, doctor pace and language. The server calculates an estimated range; Gemini drafts a patient-facing message. The medical scenario is a fixed adversarial test, with no free-text health inputs.

The page calls POST /api/baari. The function reads secrets only from environment variables, creates a Supabase request row, calls Gemini, saves the response and token counts, and reads back the number of completed demo messages and languages. GET /api/stats returns only aggregate counts. Raw data is inaccessible to anon/authenticated roles.

Run schema.sql in Supabase. Set GEMINI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY and VISITOR_SECRET in Vercel, then deploy this directory. VISITOR_SECRET should be a random string of at least 32 bytes. Use GEMINI_MODEL to change the model when needed. Never commit secrets. The .env.example contains names only.

The Gemini call uses maxOutputTokens 200. A signed, HttpOnly cookie identifies the browser; only its HMAC is stored in Supabase. A PostgreSQL transaction lock enforces five attempts per browser per UTC day across concurrent requests. Failed model calls consume an attempt too. Clearing cookies or using another browser creates another anonymous identity, so this is a demo control rather than an authenticated identity limit.

Local verification: `npm test` runs six tests. Service calls in those tests are mocked. Live verification must use actual Gemini and Supabase accounts and include at least five stored exchanges, a real adversarial refusal, a cap test and a visible usage read-back. Local mock test outputs are not submission evidence.

For worksheet evidence capture the production URL, GitHub search for credential prefixes, Vercel variable names with values hidden, Supabase rows and actual typical/edge transcripts. Compute token averages from the stored rows. Do not infer measured tokens from mock tests.

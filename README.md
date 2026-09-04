# inspiroo.

Marketplace de mentoria com match por IA (embedding semântico via Gemini).

## Rodar localmente
```
cp .env.example .env.local
# preencha as duas variáveis (Supabase > Project Settings > API)
npm install
npm run dev
```

## Deploy no Vercel
Suba esse repo pro GitHub, importe em vercel.com/new, adicione as mesmas
duas variáveis de ambiente em Environment Variables, Deploy.

## Edge Functions
Todas em supabase/functions/ — deploy uma por uma no painel do Supabase,
sempre com "Enforce JWT Verification" desmarcado.

## Ordem de setup no banco (Supabase)
1. Rode supabase/migrations/001 a 011 em ordem, no SQL Editor
2. Rode supabase/registrar-mentor-ia.sql
3. Deploy das 6 Edge Functions
4. Configure os secrets: GEMINI_API_KEY, SEED_KEY
5. Rode o seed-mentors e o seed-wisdom uma vez cada (fetch com x-seed-key)

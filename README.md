# inspiroo.

Marketplace de mentoria com match por IA (embedding semântico via Gemini).

## Rodar localmente
```
cp .env.example .env.local
npm install
npm run dev
```

## Secrets do Supabase (Edge Functions → Secrets)
- GEMINI_API_KEY — obrigatório
- SEED_KEY — obrigatório (protege os seeds)
- ADMIN_KEY — obrigatório (senha do painel /admin)
- RESEND_API_KEY — opcional (ativa e-mail de aprovação/rejeição de mentor). Sem ela, tudo funciona igual, só não manda e-mail.
- SITE_URL — opcional, default aponta pro vercel.app do projeto. Usada no e-mail de aprovação pra montar o link do painel do mentor.

## Fluxo de mentor real
1. Pessoa se candidata em /seja-mentor
2. Você aprova/rejeita em /admin (com a ADMIN_KEY)
3. Se aprovado, ele recebe (por e-mail, se configurado) o link `/mentor/SEU_TOKEN`
4. Nesse link, ele vê as conversas e pode responder — assim que responde uma vez, a IA para de responder por ele NAQUELA conversa (as outras continuam com IA até ele responder cada uma)

## Deploy no Vercel
Suba esse repo pro GitHub, importe em vercel.com/new, adicione as variáveis de
NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY, Deploy.

## Ordem de setup no banco (Supabase)
1. Rode supabase/migrations/001 a 013 em ordem, no SQL Editor
2. Deploy de todas as Edge Functions em supabase/functions/
3. Configure os secrets acima
4. Rode seed-mentors e seed-wisdom uma vez cada

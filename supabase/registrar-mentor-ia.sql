-- ============================================================
-- Cadastra o mentor com camada de IA na categoria "mente".
-- Nome e bio são FICTÍCIOS por enquanto, como combinado —
-- quando você validar os testes, troque só os dois campos
-- "name" e "bio" abaixo pelo seu nome e bio reais (é um UPDATE
-- simples, não precisa mexer em mais nada do resto do sistema).
--
-- Mantive a "Juliana Mendes" (foco em ansiedade) como está —
-- esse aqui entra como um SEGUNDO mentor na categoria "mente",
-- focado em desenvolvimento pessoal/liderança. Se preferir ter
-- só um na categoria, é só rodar um DELETE na Juliana depois.
-- ============================================================

insert into mentors (name, bio, category, tags, verified, rating, sessions_count, weekly_slots, ai_persona)
values (
  'Ricardo Bastos',
  'Passei os últimos 30 anos estudando liderança e desenvolvimento pessoal, reunindo o que realmente funciona quando a vida trava — na carreira, no caráter, nas decisões difíceis. Ajudo quem já sabe que precisa mudar algo, mas não sabe por onde começar.',
  'mente',
  array['DesenvolvimentoPessoal', 'Liderança'],
  true,
  4.9,
  0,
  20,
  true
);

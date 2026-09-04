-- ============================================================
-- Rode isso pra APROVAR uma candidatura e colocá-la no ar.
-- Troque o e-mail/contato pelo da pessoa que você quer aprovar.
-- ============================================================
insert into mentors (name, bio, category, tags, photo_url, verified, rating, sessions_count, weekly_slots)
select name, bio, category, tags, photo_url, true, 5.0, 0, 10
from mentor_applications
where contact = 'CONTATO_DA_PESSOA_AQUI' and status = 'pending';

update mentor_applications
set status = 'approved'
where contact = 'CONTATO_DA_PESSOA_AQUI' and status = 'pending';

-- pra rejeitar, é só:
-- update mentor_applications set status = 'rejected' where contact = '...';

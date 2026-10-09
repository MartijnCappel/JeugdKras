-- Eerste coördinator aanwijzen. Eerst zelf registreren in de app (met je eigen e-mailadres),
-- daarna dit draaien in de SQL Editor. Vervang het e-mailadres.
update public.profiles
set roles = '{coordinator}', status = 'actief'
where email = 'JOUW-EMAIL@VOORBEELD.NL';

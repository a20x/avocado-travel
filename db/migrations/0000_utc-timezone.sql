-- Вся база работает в UTC (правило проекта: время — timestamptz в UTC).
-- На хостинге часовой пояс сервера может быть любым, поэтому задаём его явно.
-- Имя базы на разных машинах разное, поэтому берём текущее через current_database().
DO $$
BEGIN
  EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'UTC');
END
$$;

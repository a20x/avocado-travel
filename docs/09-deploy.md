# 09. Публикация сайта

Как сайт работает в интернете, как его развернуть с нуля, как обновлять и что делать, если что-то сломалось. Почему выбраны именно эти сервисы — [ADR-0009](adr/0009-hosting-render-neon.md) (Render и Neon) и [ADR-0012](adr/0012-second-copy-alwaysdata.md) (вторая копия на alwaysdata).

Секретов и паролей в этом документе нет: только где они хранятся.

## Коротко

Сайт работает в двух независимых копиях из одного кода — ветки `main`:

| | Основная копия | Вторая копия |
|---|---|---|
| Адрес | `https://avocado-travel.onrender.com` | `https://avocado-travel.alwaysdata.net` |
| Сайт | [Render](https://render.com), Docker-образ из `Dockerfile` | [alwaysdata](https://www.alwaysdata.com), готовая standalone-сборка, `node server.js` |
| База | [Neon](https://neon.com), PostgreSQL, Франкфурт | PostgreSQL на alwaysdata, своя |
| Расписание | [cron-job.org](https://cron-job.org): будить сайт, автоотмена, импорт новостей | cron-job.org: автоотмена, импорт новостей |
| Как обновляется | Render сам собирает после CI на `main` | Workflow «Сайт на alwaysdata» после CI на `main` |
| Переменные окружения | Render → сервис → **Environment** | Панель alwaysdata → **Web → Sites** → сайт → Environment |
| Миграции | При запуске сервера, база Neon | При запуске сервера, база alwaysdata |

Зачем две копии. В ноябре 2026 года сайт на Render у автора стал открываться только через VPN, а преподаватель должен открывать его из России без VPN. Причина точно не установлена (вероятно, ограничения доступа к инфраструктуре Cloudflare, через которую работает Render). Render оставлен: адрес уже известен, и из других сетей он работает.

**Базы не синхронизируются.** База alwaysdata — копия Neon на 4 ноября 2026 года, дальше они живут отдельно. Пользователь, заказ, новость или сообщение форума, созданные на одной копии, на другой не появятся. Администраторы, заведённые до копирования, есть в обеих базах с теми же паролями.

Все сервисы бесплатны без срока.

## Основная копия: Render и Neon

| Часть | Сервис | Бесплатный тариф |
|---|---|---|
| Сайт | Render, Docker-образ из `Dockerfile` | 512 МБ памяти, 0,1 процессора, 750 часов в месяц — хватает на круглосуточную работу одного сайта |
| База | Neon, PostgreSQL | 1 ГБ (демо-данные занимают около 40 МБ), 100 часов работы базы в месяц; без запросов база засыпает через 5 минут |
| Расписание | cron-job.org | Задания с любым интервалом от минуты, свои заголовки запроса |

Сайт и база — во Франкфурте: это ближайший к России регион, и запросы к базе идут внутри одного города.

### Как устроен деплой на Render

- **Образ.** `Dockerfile` собирает сайт в три этапа: зависимости, сборка (`next build` с `output: 'standalone'`), запуск. В итоговый образ попадают только сервер Next.js с нужными ему пакетами, статика и миграции — без исходников и devDependencies. Сервер работает не от root.
- **Сборке не нужны секреты.** На время `next build` проверка переменных в `src/server/env.ts` отключена: страницы с данными рисуются по запросу, в базу сборка не ходит. Нужен только `NEXT_PUBLIC_SITE_URL` — Next.js вписывает его в код (ссылки, `robots.txt`); Render передаёт переменные сервиса в сборку как аргументы.
- **Миграции применяются сами.** При запуске сервера `src/instrumentation.ts` проверяет переменные окружения и применяет новые миграции из `db/migrations` (в образе включено `DB_MIGRATE_ON_START=true`), затем обновляет в поиске по сайту страницы раздела «Пассажирам» и пресс-релизы — в журнале строки «Страницы «Пассажирам» обновлены в поиске» и «Пресс-релизы обновлены в поиске». То же на alwaysdata. Локально это выключено — там миграции запускает `pnpm db:migrate`.
- **Проверка перед переключением.** Render отправляет посетителей на новую версию, только когда `/api/health` ответил 200. Если переменных не хватает или миграция упала, сервер отвечает 500 — деплой помечается неудачным, а сайт продолжает работать на прежней версии.
- **Автоматический деплой.** После слияния PR в `main` и успешного CI Render сам собирает и выкладывает новую версию (`autoDeployTrigger: checksPass` в `render.yaml`). CI заодно собирает Docker-образ — сломанный `Dockerfile` виден ещё в PR.

### Расписание для Render

Бесплатный сайт на Render засыпает после 15 минут без запросов, и первое открытие после этого ждёт около минуты. Преподаватель и робот Яндекса могут прийти в любое время, поэтому cron-job.org каждые 5 минут открывает служебную страницу `/api/health` — сайт не засыпает. Эта страница в базу не ходит, иначе будила бы и её и тратила бесплатные часы Neon.

| Задание | Адрес | Как часто |
|---|---|---|
| Не давать сайту заснуть | `GET /api/health` | каждые 5 минут |
| Автоотмена неоплаченных заказов | `POST /api/cron/expire-orders` | раз в час |
| Импорт новостей отрасли | `POST /api/cron/import-feeds` | раз в 6 часов |

У заданий `/api/cron/*` заголовок `Authorization: Bearer <CRON_SECRET>` — значение из настроек сервиса на Render.

Автоотмена на хостинге — раз в час, а не каждые 5 минут, как задумано в [03-architecture.md](03-architecture.md#задания-по-расписанию): каждое задание будит базу, и при запуске каждые 5 минут она не спала бы никогда — 100 бесплатных часов кончились бы за три недели. На правильность это не влияет: при открытии брони просроченный заказ и так считается недействительным.

Планировщик GitHub Actions не подошёл: он запускает задания с опозданием на 10–30 минут (сайт успевал бы заснуть) и отключает расписание в репозитории, где 60 дней не было коммитов.

### Первый деплой на Render

Делается один раз. Нужен VPN: сайт Neon из России отвечает 403. Сама база для сайта на Render доступна, а вот с компьютера в России до неё не достучаться: без VPN провайдер обрывает защищённое соединение с серверами Amazon, а VPN обычно закрывает порт баз данных 5432. Поэтому базу заполняет GitHub Actions — на серверах GitHub таких ограничений нет.

#### 1. База на Neon

1. Войти на [neon.com](https://neon.com) через GitHub, создать проект: регион **AWS Europe Central 1 (Frankfurt)**, PostgreSQL — последняя версия.
2. В настройках вычислений (Compute) поставить постоянный размер **0,25 CU** без автомасштабирования — так 100 бесплатных часов расходуются медленнее всего.
3. Скопировать строку подключения (Connection string, **без** галочки «Connection pooling») и заменить в конце `?sslmode=require&channel_binding=require` на `?sslmode=verify-full`.

#### 2. Структура и демо-данные

1. На GitHub в репозитории: **Settings → Secrets and variables → Actions → New repository secret** — три секрета:
   - `PRODUCTION_DATABASE_URL` — строка подключения из шага 1;
   - `PRODUCTION_ADMIN_EMAIL` и `PRODUCTION_ADMIN_PASSWORD` — почта и пароль администратора сайта (свои, не из `.env.example`).
2. **Actions → «Боевая база» → Run workflow**, в поле «Что сделать» выбрать `seed`, нажать **Run workflow**.
3. Через 2–3 минуты у запуска должна появиться зелёная галочка. В журнале шага `pnpm db:seed` — «Демо-данные загружены», в шаге импорта — отчёт по лентам.

Workflow `.github/workflows/production-db.yml` умеет три вещи: `migrate` — только применить миграции, `seed` — миграции, демо-данные и новости отрасли, `import-feeds` — миграции и импорт новостей. Секреты GitHub не показывает в журналах, а запустить workflow может только владелец репозитория. Сид в конце собирает статистику таблиц (`ANALYZE`): без неё первые отчёты аналитики на новой базе строились почти минуту.

**Workflow «Боевая база» работает только с Neon.** С базой alwaysdata он не связан.

#### 3. Сайт на Render

1. Войти на [render.com](https://render.com) через GitHub, **New → Blueprint**, выбрать репозиторий `avocado-travel` — Render прочитает `render.yaml`.
2. Заполнить переменные, которые Render спросит:
   - `DATABASE_URL` — строка подключения из шага 1;
   - `NEXT_PUBLIC_SITE_URL` — `https://avocado-travel.onrender.com` (если имя занято, Render даст другой адрес — тогда исправить переменную и выбрать **Manual Deploy → Deploy latest commit**);
   - `ADMIN_EMAIL`, `ADMIN_PASSWORD` — те же, что в шаге 2;
   - `NEXT_PUBLIC_YANDEX_METRIKA_ID` — пусто, заполняется в T-34.

   `BETTER_AUTH_SECRET`, `CRON_SECRET` и `IP_HASH_SALT` Render создаст сам, `CLIENT_IP_HEADER` уже указан в `render.yaml`.
3. Дождаться окончания первой сборки (5–10 минут) и открыть `https://<адрес>/api/health` — должно быть `{"status":"ok"}`.

#### 4. Расписание на cron-job.org

Зарегистрироваться на [cron-job.org](https://console.cron-job.org/signup) и создать три задания из таблицы [«Расписание для Render»](#расписание-для-render). Для `/api/cron/*`: метод POST, во вкладке **Расширенное → Заголовки** — заголовок `Authorization` со значением `Bearer ` и `CRON_SECRET` из **Render → Environment**. Ответ 200 в журнале задания — всё работает; 401 — неверный секрет.

#### 5. Проверка

```bash
pnpm check:russia https://avocado-travel.onrender.com
```

Скрипт открывает главные страницы с узлов [check-host.net](https://check-host.net) в российских сетях и печатает таблицу «страница × узел» — это отчёт о доступности из России (L1-09). Дальше — вход администратора, HTML главной на [validator.w3.org](https://validator.w3.org/nu/).

## Вторая копия: alwaysdata

Тот же код, отдельный сервер и отдельная база PostgreSQL. Тариф Free: 256 МБ памяти и 1 ГБ диска (на момент выбора — ноябрь 2026; актуальные условия — в кабинете).

### Где что лежит

| Что | Где |
|---|---|
| Адрес сайта | `https://avocado-travel.alwaysdata.net` — имя аккаунта alwaysdata `avocado-travel` |
| Панель | [admin.alwaysdata.com](https://admin.alwaysdata.com) |
| Сервер SSH | из панели, раздел SSH; обычно `ssh-avocado-travel.alwaysdata.net` |
| Работающая версия сайта | `~/apps/avocado/current` → ссылка на `~/apps/avocado/releases/<релиз>` |
| Журналы сайта | панель → сайт → Logs, или `~/admin/logs/sites/` (внимание: там все переменные окружения, см. ниже) |
| Workflow выкладки | `.github/workflows/alwaysdata-deploy.yml` («Сайт на alwaysdata») |
| Команды на сервере | `scripts/alwaysdata-release.sh` |
| Доступы для выкладки | секреты репозитория `ALWAYSDATA_*` (GitHub → Settings → Secrets and variables → Actions) |
| Копия базы Neon на момент переноса | файл `avocado-neon.dump` у автора, не в репозитории |

`~` на сервере — домашний каталог `/home/avocado-travel`.

**В журнале сайта лежат секреты.** При каждом запуске alwaysdata пишет в `~/admin/logs/sites/` строку `Upstream starting: … (env: {…}, cwd: …)` со всеми переменными окружения открытым текстом: `DATABASE_URL` с паролем, `BETTER_AUTH_SECRET`, `CRON_SECRET`, `ADMIN_PASSWORD`. Журнал не пересылать и не вставлять в чаты и issue целиком. Чтобы посмотреть, как запускается сайт, без секретов:

```bash
grep -h "Upstream" ~/admin/logs/sites/2026/sites-$(date +%Y-%m-%d).log \
  | sed -E 's/\(env: \{.*\}, cwd:/(env: <скрыто>, cwd:/' | tail -20
```

Если журнал всё же попал в чужие руки — сменить пароль базы (и `DATABASE_URL`), `BETTER_AUTH_SECRET`, `CRON_SECRET` (и в заданиях cron-job.org) и пароль администратора на сайте.

### Как устроена выкладка

Workflow «Сайт на alwaysdata» запускается сам, когда CI на `main` прошёл (`workflow_run`). Вручную — **Actions → «Сайт на alwaysdata» → Run workflow** (только с `main`). Если CI упал, выкладки нет. Две выкладки одновременно не идут: вторая ждёт первую.

1. **Сборка** на серверах GitHub (на alwaysdata `next build` не уместился бы в 256 МБ) с `NEXT_PUBLIC_SITE_URL=https://avocado-travel.alwaysdata.net`. Архив `avocado-alwaysdata.tar.gz`: standalone-сервер с нужными пакетами, `.next/static`, `public`, `db/migrations`, `content/press`. Архив 3 дня можно скачать из запуска (Artifacts).
2. **Отправка.** `scp` кладёт архив в домашний каталог, `alwaysdata-release.sh unpack` распаковывает его в новый каталог `~/apps/avocado/releases/<дата-время-коммит>` (например `20261104-004158-b385e44`) и удаляет архив.
3. **Переключение.** `switch` направляет ссылку `current` на новый релиз (замена одним переименованием — сайт не видит её отсутствующей). Затем API alwaysdata перезапускает сайт: `POST https://api.alwaysdata.com/v1/site/<ID>/restart/`.
4. **Проверка.** До 3 минут каждые 5 секунд: сайт должен отдать статику именно новой сборки (`/_next/static/<BUILD_ID>/_buildManifest.js` — у каждой сборки свой BUILD_ID, прежний сервер такого файла не знает) и ответить 200 на `/api/health`. При запуске применяются миграции, поэтому ожидание длинное.
5. **Итог.** Получилось — `prune` удаляет старые релизы, оставляя работающий и два прошлых. Нет — `current` возвращается на прошлый релиз, сайт перезапускается ещё раз, неудачный релиз удаляется, запуск помечается ошибкой «Новая версия не ответила за 3 минуты».

**Первая выкладка** (ссылки `current` ещё нет) только распаковывает релиз и создаёт `current`, без перезапуска, и заканчивается сообщением «Первая выкладка: …». Сайт после неё работает из прежнего каталога, пока в панели не переключить его на `current` (шаг 7 ниже).

Каталоги на сервере:

```text
~/apps/avocado/
├── current -> releases/20261104-153000-e06f6ef   # работающий релиз
└── releases/
    ├── 20261103-120000-6c7c928                   # два прошлых — для отката
    ├── 20261104-101500-1bdc81b
    └── 20261104-153000-e06f6ef
```

Сервер Next.js (`server.js`) при запуске переходит в свой каталог — настоящий каталог релиза, а не `current`. Поэтому миграции и файлы лабы 2 берутся из того релиза, который запущен, даже если `current` уже переключили.

**Миграции.** `DB_MIGRATE_ON_START=true` — новые миграции применяются к базе alwaysdata при запуске новой версии. Откат кода миграции не откатывает: если новая миграция удалила или переименовала колонку, прошлый релиз может с ней не работать. Перед слиянием PR с миграцией, которая меняет или удаляет данные, сделать резервную копию базы alwaysdata (см. [«Резервная копия базы alwaysdata»](#резервная-копия-базы-alwaysdata)).

### Секреты репозитория для выкладки

**GitHub → Settings → Secrets and variables → Actions → вкладка Secrets → New repository secret.** Не Deploy keys, не Environments и не секреты Codespaces/Dependabot/Agents — их workflow не видит. Имена должны совпадать буква в букву.

| Секрет | Значение | Как выглядит |
|---|---|---|
| `ALWAYSDATA_SSH_HOST` | Сервер SSH из панели | `ssh-avocado-travel.alwaysdata.net` |
| `ALWAYSDATA_SSH_USER` | Пользователь SSH из панели | `avocado-travel` |
| `ALWAYSDATA_SSH_KEY` | Закрытый ключ выкладки целиком: `pbcopy < ~/.ssh/avocado_deploy` | от `-----BEGIN OPENSSH PRIVATE KEY-----` до `-----END OPENSSH PRIVATE KEY-----`, несколько строк |
| `ALWAYSDATA_SSH_KNOWN_HOSTS` | Ключи сервера: `ssh-keyscan <сервер SSH> 2>/dev/null \| pbcopy` | 2–3 строки вида `ssh-avocado-travel.alwaysdata.net ssh-ed25519 AAAA…`, без строк с `#` |
| `ALWAYSDATA_ACCOUNT` | Имя аккаунта alwaysdata | `avocado-travel` |
| `ALWAYSDATA_API_TOKEN` | Токен API из панели (Profile → Tokens) | длинная строка букв и цифр |
| `ALWAYSDATA_SITE_ID` | Число из адреса страницы настроек сайта в панели (`…/site/<ID>/…`) | `123456` |

Ключ выкладки `~/.ssh/avocado_deploy` — отдельный, только для GitHub; лежит на компьютере автора. Публичная часть (`avocado_deploy.pub`) — в `~/.ssh/authorized_keys` на сервере. Токен API даёт полный доступ к аккаунту alwaysdata — хранится только в секрете GitHub. Если что-то из этого утекло — см. [«Замена доступов»](#замена-доступов-выкладки).

### Переменные сайта на alwaysdata

Панель → **Web → Sites** → сайт → Environment. Значения секретов — свои, не те, что на Render.

| Переменная | Значение |
|---|---|
| `NODE_ENV` | `production` |
| `NODEJS_VERSION` | `24` |
| `NEXT_PUBLIC_SITE_URL` | `https://avocado-travel.alwaysdata.net` — тот же, что в workflow. Если адрес поменяется — исправить и здесь, и в `alwaysdata-deploy.yml`, и пересобрать |
| `DATABASE_URL` | `postgresql://ПОЛЬЗОВАТЕЛЬ:ПАРОЛЬ@ХОСТ:5432/БАЗА` — PostgreSQL на alwaysdata; спецсимволы в пароле URL-кодировать |
| `BETTER_AUTH_SECRET` | Случайное значение, не короче 32 символов: `openssl rand -hex 32`. Смена разлогинит всех, пароли не меняются |
| `CRON_SECRET`, `IP_HASH_SALT` | Случайные значения: `openssl rand -hex 32` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Почта и пароль (не короче 8 символов) администратора. При обычном запуске пользователей не меняют — нужны проверке переменных и сиду |
| `DB_MIGRATE_ON_START` | `true` |
| `RATE_LIMIT_DISABLED` | `false` |
| `HOSTNAME`, `PORT` | Адрес и порт, которые панель показывает в настройках сайта. Не подставлять `3000` наугад |

`CLIENT_IP_HEADER` не задан: IP посетителя берётся из последнего адреса `X-Forwarded-For`. Правильно ли это для прокси alwaysdata, **не проверено**. Если в статистике или при бане все посетители окажутся «с одного IP» — разобраться, какой заголовок ставит прокси alwaysdata, и задать его ([03-architecture.md](03-architecture.md#безопасность)).

`NEXT_PUBLIC_YANDEX_METRIKA_ID` не задан: Метрика на alwaysdata не подключена. Это публичная переменная — её нужно передать и в сборку (`env` в workflow), а не только в панель.

### Расписание для alwaysdata

На cron-job.org — отдельные задания для alwaysdata, задания Render остаются.

| Задание | Метод и адрес | Как часто (Europe/Moscow) |
|---|---|---|
| Avocado — отмена просроченных заказов | `POST https://avocado-travel.alwaysdata.net/api/cron/expire-orders` | каждый час, `0 * * * *` |
| Avocado — импорт отраслевых новостей | `POST https://avocado-travel.alwaysdata.net/api/cron/import-feeds` | каждые 6 часов, `0 */6 * * *` |

Вкладка **Расширенное**: метод POST, тело пустое, «Требует HTTP аутентификации» выключено (это Basic Auth, не наш случай), в **Заголовках** — `Authorization` = `Bearer <CRON_SECRET с alwaysdata>` (после `Bearer` один пробел, без кавычек). Тайм-аут — 30 секунд, для импорта лучше 60.

Задание «будить сайт» для alwaysdata не нужно: в настройках сайта **Idle time = 0**, сайт не останавливается от простоя.

Ответы в журнале cron-job.org: 200 — работает (у импорта 200 не значит, что появились новые новости: ленты могли ничего не опубликовать); 401 — неверный заголовок или секрет; 404 — адрес; 405 — выбран не POST; 500 — журнал сайта; тайм-аут — медленный запуск или внешние ленты.

### Первое размещение на alwaysdata

Так копия была поднята в ноябре 2026 года. Повторять — только если поднимать её заново.

**1. Аккаунт.** Зарегистрироваться на [alwaysdata.com](https://www.alwaysdata.com), тариф Free. Имя аккаунта становится адресом: `avocado-travel` → `avocado-travel.alwaysdata.net`. В **Environment → Node.js** выбрать Node.js 24. В разделе SSH проверить пользователя и что вход разрешён. Создать каталоги:

```bash
ssh ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net
mkdir -p ~/apps ~/private && chmod 700 ~/private
```

**2. База.** Панель → **Databases → PostgreSQL**: создать пользователя и пустую базу, дать пользователю права. Записать host, имя базы, пользователя и пароль.

**3. Копия базы Neon.** Выполняется на сервере alwaysdata по SSH: из России до Neon не достучаться, а с alwaysdata — можно. В Neon (через VPN) открыть **Connect** и взять параметры прямого подключения без pooling. Версия `pg_dump` на сервере (`pg_dump --version`) должна быть не старше версии Neon (`SHOW server_version;` в SQL Editor Neon).

```bash
pg_dump --dbname="host=NEON_HOST port=5432 dbname=NEON_DB user=NEON_USER sslmode=require" \
  --password --format=custom --file="$HOME/private/avocado-neon.dump"

pg_restore --host=ХОСТ_ALWAYSDATA --username=ПОЛЬЗОВАТЕЛЬ --dbname=БАЗА --password \
  --no-owner --no-acl --exit-on-error --single-transaction "$HOME/private/avocado-neon.dump"
```

`pg_dump` только читает Neon. `pg_restore` — только в новую пустую базу. Переносятся все таблицы, включая пользователей с паролями (`users`, `accounts`) и журнал миграций. **Сид после переноса не запускать**: он стирает заказы, отзывы и сообщения и перезаписывает администратора.

Дамп скачать к себе и сверить хэши, затем удалить с сервера:

```bash
scp ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net:~/private/avocado-neon.dump ~/Downloads/   # на Mac
shasum -a 256 ~/Downloads/avocado-neon.dump                                                  # на Mac
sha256sum ~/private/avocado-neon.dump                                                        # на сервере — хэши должны совпасть
rm -i ~/private/avocado-neon.dump                                                            # на сервере
```

В дампе данные пользователей и хэши паролей: хранить в надёжном месте, никогда не класть в репозиторий.

**4. Сайт в панели.** **Web → Sites**, у сайта `avocado-travel.alwaysdata.net` — значок ⚙️ (изменить). В форме:

- тип **Node.js**;
- **Command** — `node /home/avocado-travel/apps/avocado/current/server.js`;
- **Working directory** — `/home/avocado-travel/apps/avocado/current`. Пути полные, от `/home`; опечатка в любом из двух полей — сайт не запускается (см. [«Сайт на alwaysdata»](#сайт-на-alwaysdata));
- переменные — из таблицы [«Переменные сайта»](#переменные-сайта-на-alwaysdata);
- **Advanced** — Idle time `0`;
- **SSL** — галочка **Force HTTPS**: перенаправление `http://` → `https://` (301) делает прокси alwaysdata, код сайта для этого не нужен.

Внизу формы — **Submit**. После сохранения формы alwaysdata перезапускает сайт сам.

**5. Доступы для выкладки.**

```bash
# На своём компьютере, не в SSH-сессии
ssh-keygen -t ed25519 -f ~/.ssh/avocado_deploy -N "" -C "github-actions avocado"
ssh-copy-id -i ~/.ssh/avocado_deploy.pub ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net   # спросит пароль SSH
ssh -i ~/.ssh/avocado_deploy ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net "echo ok"     # ok без пароля — готово
```

Токен API: панель → **Profile → Tokens** → создать. Application — любое название («GitHub Actions — выкладка Avocado»), Allowed IP addresses — **пусто** (адреса GitHub меняются, с ограничением перезапуск не пройдёт). Дальше — все семь секретов из [таблицы](#секреты-репозитория-для-выкладки).

**6. Первая выкладка.** **Actions → «Сайт на alwaysdata» → Run workflow** (или слияние в `main`). Ждать зелёную галочку и сообщение «Первая выкладка: релиз … готов».

**7. Переключить сайт на `current`**, если в шаге 4 он указывал на другой каталог. Сохранить, перезапустить сайт, открыть `https://avocado-travel.alwaysdata.net/api/health` — `{"status":"ok"}`. Следующие выкладки идут полным циклом с проверкой и откатом.

**8. Расписание** — два задания из [«Расписание для alwaysdata»](#расписание-для-alwaysdata).

**9. Проверка.** `pnpm check:russia https://avocado-travel.alwaysdata.net`, затем руками без VPN, с домашнего и мобильного интернета: главная, поиск рейсов, вход пользователя и администратора, `/admin`, бронирование, форум, XML-страницы.

### Ручные действия на alwaysdata

Все команды — на сервере по SSH (`ssh ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net`).

**Посмотреть релизы и работающий:**

```bash
ls ~/apps/avocado/releases
readlink ~/apps/avocado/current
```

**Откатить на прошлый релиз:**

```bash
ln -sfn releases/<РЕЛИЗ> ~/apps/avocado/current.next && mv -T ~/apps/avocado/current.next ~/apps/avocado/current
```

Затем перезапустить сайт в панели. Следующая выкладка из `main` снова поставит новую версию — если ошибка в коде, сначала исправить её в `main`.

**Выложить вручную**, если workflow не может (например, сломан доступ по SSH, а исправить сейчас некогда): скачать артефакт `avocado-alwaysdata` из любого успешного запуска (Artifacts, внутри ZIP — `avocado-alwaysdata.tar.gz`), затем на компьютере:

```bash
# В папке проекта, рядом — скачанный avocado-alwaysdata.tar.gz
S=ПОЛЬЗОВАТЕЛЬ@ssh-avocado-travel.alwaysdata.net
R=$(date -u +%Y%m%d-%H%M%S)-$(git rev-parse --short=7 HEAD)   # имя релиза: дата-время-коммит
scp avocado-alwaysdata.tar.gz "$S:avocado-$R.tar.gz"
ssh "$S" bash -s -- unpack "$R" "avocado-$R.tar.gz" < scripts/alwaysdata-release.sh
ssh "$S" bash -s -- switch "$R" < scripts/alwaysdata-release.sh
```

Затем перезапустить сайт в панели. Не распаковывать архив поверх работающего каталога: файлы двух версий перемешаются.

**Перезапустить сайт** — в панели (Web → Sites → кнопка перезапуска) или API:

```bash
curl -X POST --user "ТОКЕН account=avocado-travel:" https://api.alwaysdata.com/v1/site/<ID>/restart/
```

### Резервная копия базы alwaysdata

Workflow её не делает. Перед рискованными миграциями и время от времени — на сервере:

```bash
pg_dump --host=ХОСТ_ALWAYSDATA --username=ПОЛЬЗОВАТЕЛЬ --dbname=БАЗА --password \
  --format=custom --file="$HOME/private/avocado-$(date +%Y%m%d).dump"
```

Скачать к себе (`scp`), проверить `pg_restore --list` и удалить с сервера: место на диске — 1 ГБ. Дамп Neon от 4 ноября 2026 года изменений на alwaysdata не содержит.

### Замена доступов выкладки

- **Ключ SSH утёк или потерян:** на сервере удалить его строку из `~/.ssh/authorized_keys` (комментарий `github-actions avocado`), создать новый ключ (шаг 5 первого размещения) и обновить `ALWAYSDATA_SSH_KEY`.
- **Токен API утёк:** удалить его в Profile → Tokens, создать новый, обновить `ALWAYSDATA_API_TOKEN`.
- **Секрет обновляется** карандашом (Update) у секрета на странице Secrets; значение GitHub не показывает — только заменить.

## Обновление

Обычный порядок: PR → CI → слияние в `main`. Дальше само:

- Render собирает и выкладывает новую версию, миграции применяются при запуске;
- workflow «Сайт на alwaysdata» выкладывает ту же версию на вторую копию, миграции применяются к её базе.

Ничего запускать руками не нужно. Результат выкладки на alwaysdata — в **Actions → «Сайт на alwaysdata»**: зелёная галочка и сообщение «Выложен релиз …».

Демо-данные на базе Neon обновляются workflow «Боевая база» с действием `seed`. Сид стирает заказы, отзывы и сообщения посетителей, поэтому без нужды его не запускать. Для базы alwaysdata такого workflow нет.

## Если что-то не так

Сначала понять, где проблема: открыть `/api/health` у обеих копий. `curl -sS -o /dev/null -w '%{http_code}\n' <адрес>/api/health` с компьютера — если 200, сервер жив, и дело в браузере (кэш, VPN), а не в сайте: проверить в окне инкогнито, с VPN и без.

### Render и Neon

| Признак | Где смотреть |
|---|---|
| Деплой неудачный | Render → сервис → **Events** и **Logs**: строка «Неверные переменные окружения» перечисляет, чего не хватает |
| Сайт открывается минуту | Задание `/api/health` на cron-job.org выключено или падает |
| Открывается только через VPN | Известная проблема с ноября 2026, поэтому и есть копия на alwaysdata. Проверка из России: `pnpm check:russia https://avocado-travel.onrender.com` |
| Ошибки базы, «compute time quota exceeded» | Neon → **Monitoring**: кончились часы работы базы; проверить, что автоотмена — раз в час |
| Все посетители «с одного IP» (общий бан, общий лимит запросов) | `CLIENT_IP_HEADER=true-client-ip` в переменных Render |
| `pnpm db:migrate` с компьютера падает, «Connection terminated unexpectedly» или `ETIMEDOUT` | Это сеть, а не база: из России до Neon не достучаться. Пользоваться workflow «Боевая база» |

### Выкладка на alwaysdata (Actions → «Сайт на alwaysdata»)

Ошибка — в шаге **«Выложить»**, последние строки журнала. Сайт при ошибках до перезапуска не затронут: работает прежний релиз.

| Признак в журнале | Причина и что делать |
|---|---|
| `Load key "/home/runner/.ssh/id_ed25519": error in libcrypto`, затем `Permission denied` | Секрет `ALWAYSDATA_SSH_KEY` — не закрытый ключ или испорчен при копировании (вставлен `.pub`, потеряны строки BEGIN/END, склеены переносы, пробелы в начале строк). Проверить файл: `ssh-keygen -y -f ~/.ssh/avocado_deploy` печатает строку `ssh-ed25519 …`. Скопировать `pbcopy < ~/.ssh/avocado_deploy` и заменить секрет. Случилось при настройке 4 ноября 2026 года |
| `Permission denied (publickey,…)` без `libcrypto` | Ключ читается, но сервер его не знает или не тот пользователь/сервер. С компьютера: `ssh -i ~/.ssh/avocado_deploy ПОЛЬЗОВАТЕЛЬ@СЕРВЕР "echo ok"`; спрашивает пароль — повторить `ssh-copy-id`. Сверить `ALWAYSDATA_SSH_USER` и `ALWAYSDATA_SSH_HOST` |
| `Host key verification failed` | `ALWAYSDATA_SSH_KNOWN_HOSTS` пустой, для другого сервера или со строками `#` вместо ключей. Заново: `ssh-keyscan <сервер> 2>/dev/null \| pbcopy`. Если ключ сервера сменился без причины — сначала выяснить почему |
| `alwaysdata-release: …` | Ошибка серверного скрипта, текст объясняет: «в архиве нет server.js» — сломана упаковка; «релиз уже есть» — повторный запуск в ту же секунду, просто перезапустить |
| `curl: (22) … 401` при перезапуске | Неверный `ALWAYSDATA_API_TOKEN` или `ALWAYSDATA_ACCOUNT`, или у токена заданы Allowed IP addresses |
| `curl: (22) … 404` при перезапуске | Неверный `ALWAYSDATA_SITE_ID` |
| «Новая версия не ответила за 3 минуты» | Сайт уже возвращён на прошлый релиз. Причина — в журнале сайта (панель → Logs или `~/admin/logs/sites/`): неверные переменные, упавшая миграция, нехватка памяти. Если так каждый раз — проверить, что сайт в панели запускается из `~/apps/avocado/current` |
| `pnpm build` или `pnpm install` упал | Сломана сборка — CI на `main` должен был упасть раньше; смотреть журнал шага |
| Запуск не начался после слияния | Workflow запускается только после **успешного** CI на `main` и только если файл workflow уже в `main`. Запустить вручную: Run workflow |

### Сайт на alwaysdata

| Признак | Где смотреть |
|---|---|
| `/api/health` не отвечает | Панель → сайт: запущен ли; журнал сайта. Строка «Неверные переменные окружения» — чего не хватает в Environment |
| Ошибки при работе с данными, 500 | `/api/health` в базу не ходит — проверить `DATABASE_URL` и что база alwaysdata жива (панель → Databases) |
| Процесс падает, «out of memory» | Предел 256 МБ памяти бесплатного тарифа |
| Нет места на диске | `du -sh ~/apps/avocado/releases/* ~/private/*`: старые релизы (выкладка оставляет три), дампы базы |
| 502, «Connection to upstream failed», в журнале `Upstream starting failed: … reason: No such file or directory` | Ошибка в пути в **Command** или **Working directory**. В журнале (команда из [«Где что лежит»](#где-что-лежит)) сверить `cwd:` и путь к `server.js` с `~/apps/avocado/current`. Случилось 4 ноября 2026 года: в Working directory было `apps/avocado-travel/current` вместо `apps/avocado/current` |
| `http://` открывается без перехода на `https://` | Не включена галочка **Force HTTPS** в разделе SSL настроек сайта |
| Ссылки, sitemap или RSS ведут на onrender.com | Сборка с чужим `NEXT_PUBLIC_SITE_URL`: проверить `env` в `alwaysdata-deploy.yml` |
| На alwaysdata нет новости или заказа, которые есть на Render | Так и должно быть: базы отдельные |

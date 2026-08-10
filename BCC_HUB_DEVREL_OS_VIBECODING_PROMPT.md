# MASTER PROMPT — BCC HUB DEVREL OS

## 0. Роль и режим работы

Ты — senior product engineer, product designer и systems architect. Твоя задача — не сделать красивый прототип, а спроектировать и реализовать **рабочую персональную DevRel Operating System** для одного пользователя.

Приложение должно быть production-ready, адаптивным, синхронизироваться между устройствами и разворачиваться через GitHub + Vercel.

Перед началом разработки обязательно прочитай `design.md` в корне проекта. Он является **источником истины по визуальному языку BCC HUB**. Не придумывай отдельную дизайн-систему поверх него.

Также учитывай публичный BCC HUB Tech Radar:
- направление: Backend;
- категории:
  - Технологии;
  - Инструменты;
  - Платформы;
  - Языки и фреймворки;
- кольца зрелости:
  - Adopt;
  - Trial;
  - Assess;
  - Hold;
- состояния изменений:
  - Новый в этой версии;
  - Недавно изменено;
  - Без изменений.

Tech Radar должен стать полноценным модулем DevRel OS, а не просто ссылкой.

---

# 1. Что мы строим

Создай персональную систему управления DevRel-деятельностью BCC HUB.

Это НЕ:
- корпоративная Jira;
- CRM для отдела продаж;
- очередной Notion-клон;
- публичная платформа;
- multi-tenant SaaS;
- набор несвязанных таблиц.

Это мой личный рабочий центр управления, в котором хранится **контекст всей моей DevRel-работы**.

Я один основной пользователь системы.

Главная идея:

> Любая задача, проект, встреча, человек, мероприятие, публикация, документ, решение, KPI или активность должны существовать не изолированно, а в контексте других сущностей.

Через несколько месяцев я должен иметь возможность открыть любой объект и понять:

- зачем он появился;
- откуда пришла задача;
- с кем я общался;
- что обсуждалось;
- какие решения были приняты;
- кто что обещал;
- какие задачи появились;
- что было сделано;
- какие документы связаны;
- какой получен результат;
- какие KPI затронуты;
- какой прошлый опыт можно переиспользовать.

Главная ценность продукта:

**не хранение задач, а сохранение профессиональной памяти, связей и контекста.**

---

# 2. Базовые принципы продукта

## 2.1. Один источник истины

Все рабочие данные должны храниться в облачной базе.

НЕЛЬЗЯ использовать:
- localStorage как основную базу;
- JSON-файлы в репозитории как рабочее хранилище;
- данные только в браузере;
- моковые данные после запуска production.

localStorage / IndexedDB допустимы только для:
- UI preferences;
- кеша;
- черновиков;
- состояния PWA;
- временной offline-копии.

При входе с другого устройства пользователь должен видеть актуальные данные из облачной базы.

---

## 2.2. Минимум инфраструктуры

Не создавать отдельный backend-сервис.

Не создавать десятки ручных REST endpoints вида:

- `/api/projects`
- `/api/tasks`
- `/api/contacts`
- `/api/events`

Использовать один простой стек:

### Frontend / application
- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide icons

### Database / Auth / Files
- Supabase:
  - PostgreSQL;
  - Auth;
  - Storage.

Использовать официальный Supabase SDK.

Цель:
**один облачный сервис для базы, авторизации и файлов.**

В коде приложение работает с Supabase SDK и Server Actions / server utilities. Пользователь не должен вручную поддерживать собственный API.

---

# 3. Простая схема подключения базы

Для production достаточно одного Supabase project.

Минимальные environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Не использовать service role key в browser code.

Если для migrations / admin setup требуется дополнительный секрет — использовать только server-side / CLI.

Предпочтительный сценарий подключения:

1. Создать Supabase project.
2. Применить SQL migrations.
3. Добавить env variables локально и в Vercel.
4. Приложение готово работать.

Если Vercel Marketplace позволяет подключить Supabase напрямую и автоматически передать credentials в проект — предпочесть этот путь.

Не требовать от пользователя настройки собственного сервера, Docker, VPS, Redis, RabbitMQ или отдельных API gateway.

---

# 4. Авторизация

Приложение персональное.

Нужна простая авторизация:

- email + password;
- сохраненная безопасная сессия;
- protected application routes;
- logout.

Публичную регистрацию в UI не делать.

Каждая основная таблица должна иметь:

```text
owner_id
```

и RLS policy:

```text
auth.uid() = owner_id
```

Даже если позже в Supabase появятся другие пользователи, они не должны видеть данные владельца.

Не хранить пароли самостоятельно.

---

# 5. Синхронизация между устройствами

Требование:

если я:
- создал задачу на ноутбуке;
- открыл портал на телефоне;
- вошел под тем же аккаунтом;

я должен увидеть эту задачу.

Это достигается через cloud database.

Для актуальности:

- после mutation обновлять UI оптимистично;
- после успешной записи инвалидировать / revalidate связанные данные;
- при возврате во вкладку обновлять критичные списки;
- при открытии страницы всегда получать актуальные данные;
- не зависеть от локального кеша.

Realtime можно использовать только там, где он реально упрощает синхронизацию нескольких открытых вкладок/устройств.

Не делать Realtime обязательным для всей архитектуры.

---

# 6. PWA и мобильное приложение

Мобильная версия должна ощущаться как отдельное мобильное приложение, а не как сжатый desktop.

Сделай приложение installable PWA.

Обязательно:

- `manifest.webmanifest`;
- `display: standalone`;
- app icons;
- maskable icon;
- Apple touch icon;
- theme color;
- mobile viewport;
- service worker;
- кеш app shell и статических ресурсов;
- корректное поведение safe areas;
- splash / launch compatibility;
- offline indicator.

Для MVP не требуется сложная offline-синхронизация записей.

Если сеть пропала:
- показать понятное состояние offline;
- разрешить читать уже закешированный интерфейс там, где возможно;
- не делать вид, что запись сохранена в облаке;
- при необходимости сохранить локальный draft и предложить отправить после восстановления соединения.

---

# 7. Responsive architecture

Проектировать интерфейс минимум под:

### Mobile
320–767px

### Tablet
768–1023px

### Desktop
1024–1439px

### Large Desktop
1440px+

Никакого горизонтального скролла страницы.

Каждый основной экран проверить минимум в размерах:

- 375 × 812;
- 430 × 932;
- 768 × 1024;
- 1024 × 768;
- 1440 × 900;
- 1920 × 1080.

---

# 8. Навигация по устройствам

## Desktop

Использовать:

- collapsible left sidebar;
- top bar;
- content area;
- optional right context panel.

Sidebar примерно:

```text
Overview
Projects
Tasks
People
Events
Content
Ambassadors
Communities
Tech Radar
Knowledge
Analytics

────────

Documents
Calendar
Settings
```

---

## Tablet

Sidebar:
- compact / icon rail;
- раскрывается overlay;
- основные действия доступны без постоянной широкой панели.

---

## Mobile

НЕ использовать desktop sidebar.

Использовать bottom navigation.

Основные tabs:

```text
Home
Projects
Tasks
People
More
```

`More` открывает:

- Events;
- Content;
- Ambassadors;
- Communities;
- Tech Radar;
- Knowledge;
- Analytics;
- Documents;
- Settings.

На mobile должна быть плавающая или удобно расположенная:

```text
+ Quick Add
```

Quick Add должен работать как bottom sheet.

---

# 9. Mobile-first interaction rules

На мобильном:

- touch target минимум 44×44 px;
- основные формы открывать в full-screen sheet / bottom sheet;
- таблицы преобразовывать в cards / list rows;
- Kanban не сжимать до нечитаемого состояния;
- board на mobile отображать по одной колонке со switcher статусов;
- filters открывать bottom sheet;
- detail view открывать отдельной страницей или full-screen layer;
- sticky primary action;
- native-like transitions;
- safe-area padding;
- не требовать hover;
- drag & drop не должен быть единственным способом изменения статуса.

Должно быть удобно добавить:
- задачу;
- контакт;
- встречу;
- заметку;
- договоренность;

одной рукой с телефона.

---

# 10. Design System

`design.md` — главный reference.

Сохранять:

- белую / очень светлую базу;
- черный/темный текст;
- BCC violet как основной акцент;
- cyan/lilac как secondary accents;
- крупные мягкие радиусы;
- outline icons;
- clean fintech;
- expressive tech culture;
- модульную структуру;
- большие meaningful numbers;
- аккуратные pills;
- минимум декоративного шума.

Основные токены брать из `design.md`.

Не делать:

- purple everywhere;
- generic bank admin;
- крипто/Web3 визуал;
- glassmorphism overload;
- гигантские маркетинговые hero внутри рабочего интерфейса;
- карточку вокруг каждого элемента;
- rainbow charts.

Рабочий интерфейс должен быть примерно в 1.5–2 раза плотнее маркетингового сайта BCC HUB.

Вдохновение по информационной плотности:
- Linear;
- Attio;
- Raycast;
- Notion;

но визуально приложение должно оставаться BCC HUB.

---

# 11. App Shell

Создай единый App Shell.

Desktop:

```text
┌──────────────┬─────────────────────────────────────┐
│ Sidebar      │ Topbar                              │
│              ├─────────────────────────────────────┤
│              │ Page                                │
│              │                                     │
└──────────────┴─────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ Mobile Header                │
├──────────────────────────────┤
│                              │
│ Content                      │
│                              │
├──────────────────────────────┤
│ Bottom Navigation            │
└──────────────────────────────┘
```

---

# 12. Глобальный Quick Add

Одна из главных функций продукта.

Глобальная кнопка:

```text
+ Добавить
```

Позволяет быстро создать:

- Task;
- Project;
- Contact;
- Interaction;
- Meeting;
- Commitment;
- Event;
- Content;
- Decision;
- Note.

Desktop:
- command menu / popover.

Mobile:
- bottom sheet.

После выбора сущности показывать минимальную форму.

Не заставлять пользователя заполнять 20 полей.

Сначала:

```text
Название
Связать с...
Дата / срок
Короткий контекст
```

Остальное можно заполнить позже.

---

# 13. Command Palette

Shortcut:

```text
⌘K / Ctrl+K
```

Должна позволять:

- искать;
- переходить;
- создавать;
- менять статус;
- открывать последние объекты.

Пример:

```text
> frontend meetup
```

Результаты:

```text
Project
Frontend Meetup

Event
Frontend Meetup — Aug 2026

Contact
Speaker related to Frontend Meetup

Task
Confirm speaker
```

---

# 14. Универсальная модель сущностей

Основные сущности:

1. Project
2. Initiative
3. Task
4. Contact
5. Organization
6. Interaction
7. Meeting
8. Commitment
9. Event
10. Content
11. Community
12. Ambassador
13. Ambassador Contribution
14. Ambassador Training
15. Tech Radar Item
16. Document
17. Decision
18. Knowledge Case
19. KPI
20. Tag
21. Activity
22. Template

---

# 15. Universal Relations

Все сущности должны уметь связываться друг с другом.

Создать таблицу:

```text
entity_relations
```

Поля:

```text
id
owner_id

source_type
source_id

relation_type

target_type
target_id

created_at
```

Примеры:

```text
Task
"Confirm speaker"

RELATED_TO

Event
"Frontend Meetup"
```

```text
Contact
"John"

SPEAKER_AT

Event
"Frontend Meetup"
```

```text
Document
"Meetup checklist"

USED_IN

Project
"Frontend Meetup"
```

Связи должны быть видны в UI в понятном виде.

---

# 16. PROJECTS

Project — главный контейнер работы.

Поля:

```text
id
owner_id

title
description

direction
project_type

status
priority

start_date
due_date

parent_project_id

goal
expected_result
actual_result

next_action

health_score
health_state

last_activity_at

created_at
updated_at
archived_at
```

Стратегические направления по умолчанию:

- Communities;
- DevFlow AI;
- Tech Brand;
- Ambassadors;
- Newsroom;
- Tech Radar;
- Events;
- Schools / Talent;
- Operations;
- Other.

---

# 17. Project hierarchy

Поддержать:

```text
Project
    └── Subproject
            └── Initiative
```

Пример:

```text
DevRel 2026
│
├── Tech Brand
│   ├── Frontend Meetup
│   ├── QA Meetup
│   └── Thought Leadership
│
├── Ambassador Program
│   └── Wave 1
│
└── DevFlow AI
    ├── AI Workshops
    └── AI Challenge
```

Нужны:

- tree view;
- portfolio view;
- breadcrumb;
- parent/child relations.

---

# 18. Project detail

Вкладки:

```text
Overview
Tasks
People
Activity
Events
Content
Documents
Decisions
Metrics
Timeline
```

Overview:

```text
Goal
Status
Health
Deadline
Next Action
KPIs
People
Open Commitments
Current blockers
Recent activity
```

---

# 19. Project Health Score

Создай прозрачный детерминированный алгоритм 0–100.

Старт:

```text
100
```

Пример штрафов:

```text
-25 project blocked
-15 overdue critical task
-8  overdue high task
-4  overdue normal task

-12 deadline < 7 days and progress low
-8  no next action
-8  no activity > 14 days
-15 no activity > 30 days

-8 open overdue commitment
-10 unresolved blocker
```

Не допускать score ниже 0.

Состояния:

```text
85–100 Healthy
65–84 Attention
40–64 At Risk
0–39 Critical
```

Пользователь должен видеть:

```text
Health 62
At Risk

Почему:
• 2 просроченные задачи
• нет активности 16 дней
• deadline через 5 дней
```

Не показывать магическое число без объяснения.

---

# 20. TASKS

Task manager должен ощущаться проще Jira.

Views:

- My Day;
- Inbox;
- List;
- Board;
- Calendar;
- Timeline;
- By Project;
- Waiting;
- Completed.

Поля:

```text
title
description

status
priority

project_id
parent_task_id

start_date
due_date

source_type
source_label
source_date

requested_by_contact_id

context
expected_result

next_action
blocker

actual_result
retrospective

created_at
completed_at
```

---

# 21. Task statuses

По умолчанию:

```text
Inbox
Planned
In Progress
Waiting
Blocked
Done
Cancelled
```

Пользователь может менять набор в Settings.

---

# 22. Source of Task

Очень важная функция.

Каждая задача может хранить источник:

```text
Meeting
Teams
Email
Call
Manager
Strategy
Personal
Event
Ambassador
Community
Other
```

Показывать:

```text
Откуда задача?
```

Дополнительные данные:

- человек;
- дата;
- ссылка;
- attachment;
- заметка.

---

# 23. Task Work Log

В каждой задаче должна быть Timeline / Work Log.

Быстрая запись:

```text
Что сделал?
С кем взаимодействовал?
Что обсудили?
Какой результат?
Что дальше?
```

Запись связывается с:

- Task;
- Project;
- Contact;
- Interaction;
- Documents.

---

# 24. TASK CONSTRUCTOR

Создай конструктор шаблонов задач.

Можно сохранять собственные Task Templates.

Template может включать:

- predefined fields;
- checklist;
- default priority;
- relative deadline;
- required relations;
- suggested documents;
- default tags.

Пример:

```text
External Meetup Preparation
```

создает checklist автоматически.

---

# 25. CONTACTS / PEOPLE CRM

Contact:

```text
first_name
last_name
position

organization_id
department

email
phone
telegram
linkedin

city

relationship_type
relationship_score
relationship_state

notes

last_interaction_at
next_follow_up_at
```

---

# 26. Contact profile

Tabs:

```text
Overview
Interactions
Projects
Tasks
Events
Content
Commitments
Activity
```

Overview показывает:

- кто это;
- где работает;
- зачем контакт важен;
- последний контакт;
- что обсуждали;
- текущие проекты;
- незакрытые договоренности;
- следующий follow-up.

---

# 27. Relationship Intelligence

Не использовать внешнее AI API.

Сделай прозрачный Relationship Score.

Учитывать:

```text
recency
interaction count
active shared projects
open commitments
planned follow-up
```

Пример states:

```text
Active
Warm
Cooling
Dormant
```

Не оценивать человека эмоционально.

Оценивать только активность рабочего взаимодействия.

---

# 28. ORGANIZATIONS

Organization:

```text
name
type
website
description
city
notes
```

Типы:

- BCC;
- Vendor;
- Partner;
- Community;
- Media;
- University;
- Technology Company;
- Other.

Profile:

- contacts;
- projects;
- events;
- interactions;
- content;
- commitments;
- documents.

---

# 29. INTERACTIONS

Interaction types:

```text
Meeting
Call
Teams
Telegram
Email
LinkedIn
Offline
Other
```

Поля:

```text
date
type

title
topic
summary

what_i_said
what_they_said

decision
next_action

follow_up_date
```

Связи:

- contacts;
- organizations;
- tasks;
- projects;
- events;
- commitments;
- documents.

---

# 30. COMMITMENTS

Отдельная сущность.

Поля:

```text
title
description

owed_by:
  me
  contact

contact_id
project_id
interaction_id

due_date
status
```

Dashboard должен показывать:

```text
Мои обязательства
Ожидаю от других
Просрочено
```

---

# 31. EVENTS

Event может быть связан с Project.

Типы:

- Meetup;
- Hackathon;
- Workshop;
- Conference;
- Townhall;
- Challenge;
- Training;
- Community Event;
- Other.

Поля:

```text
title
type

project_id

date_start
date_end

location
format

audience
capacity

registration_target
registrations
confirmed
attended

nps

budget_planned
budget_actual

status
```

---

# 32. Event lifecycle

По умолчанию:

```text
Idea
Planning
Content
Marketing
Registration
Production
Event Day
Post-event
Retrospective
Done
```

---

# 33. Meetup Template

При создании Meetup предложить:

```text
Применить шаблон BCC HUB Meetup
```

Автоматически создать задачи:

### Strategy
- Target audience
- Topic / stack
- KPI
- Date
- Conflict check
- Budget

### Content
- Speaker shortlist
- Speaker confirmation
- Talk review
- Rehearsal #1
- Rehearsal #2
- Final presentations

### Marketing
- Landing
- Announcement
- Communities
- Registration
- Reminder
- Attendance confirmation

### Infrastructure
- Venue audit
- Screens
- Projector
- Speaker microphone
- Audience microphones
- Backup laptop
- Clickers
- Wi-Fi
- Streaming
- Catering
- Merch
- Navigation

### Event Day
- Final tech check
- Registration
- Speaker briefing
- Timing
- Q&A
- Networking
- Feedback QR

### Post-event
- Thank-you
- Video
- Photos
- Presentations
- NPS
- Registration → attendance analytics
- Retrospective
- Budget report

Шаблон должен редактироваться.

---

# 34. Event Readiness Score

Считать:

```text
completed required tasks
critical overdue tasks
speaker readiness
technical readiness
registration progress
```

Показывать:

```text
Event readiness
78%

Needs attention:
• rehearsal #2
• backup laptop
• registration confirmation
```

---

# 35. CONTENT

Content types:

- Article;
- LinkedIn;
- Dev.to;
- Instagram;
- YouTube;
- Podcast;
- Interview;
- Case Study;
- Digest;
- Video;
- Presentation.

Pipeline:

```text
Idea
Brief
Draft
Review
Compliance
Ready
Scheduled
Published
Archived
```

Поля:

```text
title
content_type
channel

author_contact_id
ambassador_id

project_id
event_id
community_id

status

planned_date
published_at

external_url

views
reach
likes
comments
shares
```

---

# 36. COMMUNITIES

Default:

- Tech Leads;
- AI / ML;
- QA;
- Business Analysts;
- System Analysts;
- Backend;
- Frontend.

Community:

```text
name
description
status

owner_contact
leaders

last_activity_at
next_activity_at

members_count
```

Связанные:

- events;
- content;
- ambassadors;
- contacts;
- projects;
- KPI.

---

# 37. AMBASSADOR PROGRAM

Отдельный полноценный модуль.

Не смешивать Ambassador и обычный Contact.

Ambassador должен ссылаться на Contact.

```text
ambassadors.contact_id
```

---

# 38. Ambassador profile

Поля:

```text
contact
track
level

start_date
status

total_xp
current_quarter_xp

training_progress
last_contribution_at
```

Tabs:

```text
Overview
XP
Contributions
Content
Speaking
Training
Activity
```

---

# 39. Ambassador tracks

Default:

```text
Technical
Non-technical
Lifestyle
```

Архитектура должна позволять добавлять новые.

---

# 40. Ambassador levels

Default:

```text
LV.0 Newcomer
LV.1 Ambassador
LV.2 Senior Ambassador
LV.3 Hub Hero
```

Levels должны редактироваться.

---

# 41. XP Ledger

XP нельзя хранить только одним editable number.

Источник истины:

```text
ambassador_contributions
```

Contribution:

```text
ambassador_id
type

base_xp
multiplier
final_xp

date

evidence_url

project_id
event_id
content_id

status
review_note
```

`total_xp` вычислять из ledger или поддерживать безопасно как derived value.

---

# 42. Default XP rules

Предустановить:

```text
Technical article / post     20
Open contribution            30
Mentoring                    25
Hackathon / challenge        40
Meetup / conference speaking 50
Media mention                60
```

В Settings можно редактировать.

---

# 43. Reach multiplier

Опционально.

Не начислять автоматически.

Пользователь видит:

```text
Base XP
Reach
Suggested multiplier
Final XP
```

и подтверждает.

---

# 44. Ambassador analytics

Dashboard:

- active ambassadors;
- XP this quarter;
- XP by person;
- XP by track;
- contributions;
- published content;
- total reach;
- speaking events;
- training completion;
- level distribution;
- inactive ambassadors;
- trend vs previous period.

---

# 45. Ambassador Leaderboard

Views:

```text
Quarter
Year
All Time
Technical
Non-technical
Lifestyle
```

Row:

```text
Rank
Avatar
Name
Level
XP
Contributions
Reach
Trend
```

Mobile:
card leaderboard.

---

# 46. Ambassador Training

Default program:

1. Personal Brand & LinkedIn
2. Content Workshop
3. Technical Writing & Storytelling
4. Public Speaking & Presentations
5. AI Tools for Content Creation

Statuses:

```text
Not Started
In Progress
Homework Submitted
Reviewed
Completed
```

---

# 47. TECH RADAR

Создай отдельный модуль Tech Radar.

Он должен соответствовать логике публичного BCC HUB Technology Radar.

Начальная область:

```text
Backend
```

Категории:

```text
Технологии
Инструменты
Платформы
Языки и фреймворки
```

Rings:

```text
Adopt
Trial
Assess
Hold
```

Change state:

```text
New
Recently Changed
Unchanged
```

---

# 48. Tech Radar item

Поля:

```text
name
slug

domain
category
ring

change_state

description
recommendation
rationale

version

owner_contact_id

created_at
updated_at
last_reviewed_at

public_url
```

---

# 49. Tech Radar views

Нужно минимум 3 представления:

## Radar
Визуальный radar.

## List
Рабочая таблица / cards.

## Changelog
Что изменилось между версиями.

Radar не должен быть единственным способом работать с данными.

На mobile:
- не пытаться втиснуть огромный круг;
- дать удобный category/ring browser;
- компактную radar visualization можно оставить как overview.

---

# 50. Tech Radar workflow

Статусы управления:

```text
Draft
Review
Approved
Published
Archived
```

Можно связать Radar Item с:

- Project;
- Community;
- Contact;
- Content;
- Document;
- Decision.

Пример:

```text
Technology
OpenAPI / Swagger

Ring
Adopt

Related community
Backend

Related content
Architecture article

Related decision
Approved for recommended usage
```

---

# 51. DOCUMENT INDEX

DevRel OS не должен пытаться заменить:

- SharePoint;
- Teams;
- Confluence;
- bcchub.kz;
- LinkedIn;
- Dev.to;
- YouTube.

Он становится control center.

Document:

```text
title
type

location_type
external_url

storage_path

project_id
task_id
event_id
contact_id
ambassador_id

version
status

last_updated_at
```

Location:

- Internal;
- SharePoint;
- Teams;
- Confluence;
- BCC HUB Website;
- GitHub;
- Google Drive;
- Figma;
- Other.

Если файл хранится в DevRel OS — использовать private Supabase Storage.

---

# 52. DECISION LOG

Decision:

```text
title
date

context
problem

options
decision
reason

consequences
review_date
```

Связи:

- Project;
- Task;
- Interaction;
- Contacts;
- Documents.

---

# 53. KNOWLEDGE / CASE MEMORY

После завершения Task или Project должна быть action:

```text
Save as Case
```

Knowledge Case:

```text
title

situation
problem
trigger

people
actions
communication

decision
result

what_worked
what_failed

reusable_solution

tags
```

Связать с:

- projects;
- tasks;
- contacts;
- documents;
- events.

---

# 54. Similar Cases

Не подключать внешний AI.

Сделать deterministic similarity.

Score может учитывать:

```text
40% tags overlap
20% project type
15% task/event type
15% common contacts/organizations
10% keyword similarity
```

При создании нового объекта показывать:

```text
Похожие прошлые кейсы
```

Только как suggestion.

Ничего автоматически не менять.

---

# 55. GLOBAL SEARCH

Искать минимум по:

- Projects;
- Tasks;
- Contacts;
- Organizations;
- Interactions;
- Events;
- Content;
- Ambassadors;
- Tech Radar;
- Decisions;
- Knowledge;
- Documents.

Для MVP можно использовать Postgres text search / `ilike` через server utility.

Не подключать Algolia / Elastic / отдельный search service.

---

# 56. Duplicate Detection

Contact:

- normalized email;
- phone;
- name + organization.

Organization:

- normalized name;
- domain.

Project:

- similar title.

Показывать:

```text
Возможно, такой объект уже существует
```

Не блокировать создание без причины.

---

# 57. DASHBOARD

Dashboard отвечает на вопрос:

> Что требует моего внимания сейчас?

Не пытаться показать всю систему сразу.

---

# 58. Dashboard sections

## Header

```text
Добрый день
10 августа

Главный фокус
[custom weekly focus]
```

## KPI row

Пример:

```text
12 Active Projects
7 Due This Week
4 Waiting Responses
10 Ambassadors
```

## Needs Attention

- overdue;
- blocked;
- project health;
- waiting commitments;
- stale projects.

## Today / This Week

- tasks;
- meetings;
- events;
- follow-ups.

## Projects

top active projects.

## People

- recent interactions;
- follow-ups;
- pending commitments.

## Ambassador Snapshot

- leaderboard top 5;
- activity;
- at risk.

## Content

- review;
- ready;
- scheduled.

---

# 59. ANALYTICS

Создать разделы:

```text
Portfolio
Tasks
Events
Content
People
Communities
Ambassadors
Tech Radar
```

---

# 60. Portfolio analytics

Показывать:

- active projects;
- project status;
- health distribution;
- deadlines;
- completed per month;
- overdue;
- workload;
- activity by strategic direction.

---

# 61. Task analytics

- created vs completed;
- overdue rate;
- average cycle time;
- waiting time;
- source of tasks;
- tasks by project;
- tasks by priority.

---

# 62. Event analytics

- registrations;
- confirmations;
- attendance;
- show rate;
- NPS;
- budget plan/fact;
- attendance trend;
- events by community.

---

# 63. People analytics

Только рабочая аналитика.

- interactions by month;
- active relationships;
- follow-ups due;
- organizations;
- interaction sources;
- unresolved commitments.

Не создавать creepy scoring людей.

---

# 64. Tech Radar analytics

- items by ring;
- items by category;
- new;
- recently changed;
- unchanged;
- reviews due;
- contributors.

---

# 65. SMART NEXT ACTION

Без внешнего AI.

Rules:

```text
Project has no next action
→ suggest "Добавить следующий шаг"

Task overdue
→ surface task

Waiting > N days
→ suggest follow-up

Contact has open commitment
→ show commitment

Event < 14 days + missing critical tasks
→ raise readiness warning

Ambassador no activity > threshold
→ flag inactivity

Content in Review too long
→ flag pipeline aging

Radar item not reviewed > threshold
→ suggest review
```

Все правила должны быть объяснимы.

---

# 66. Activity Log

Любое важное действие записывать:

```text
entity created
status changed
deadline changed
relation added
interaction logged
commitment completed
XP added
decision created
document linked
```

Timeline:

```text
10 Aug 14:32
Task moved to Done

10 Aug 14:10
Interaction with Speaker added

09 Aug 18:24
Deadline changed
```

---

# 67. Database schema

Создать SQL migrations минимум для:

```text
profiles

projects
tasks

contacts
organizations
contact_organizations

interactions
interaction_contacts

commitments

events
content_items
communities

ambassadors
ambassador_contributions
ambassador_training

tech_radar_items
tech_radar_versions

documents
decisions
knowledge_cases

kpis

entity_relations

tags
entity_tags

activity_log

templates
saved_views
```

---

# 68. Schema principles

- UUID PK;
- `owner_id`;
- `created_at`;
- `updated_at`;
- nullable `archived_at` where useful;
- indexes on frequent filters;
- FK constraints where practical;
- cascade behavior продумать;
- не использовать один giant JSON blob вместо схемы.

JSONB допустим для:

- UI config;
- custom template configuration;
- secondary metadata.

---

# 69. Soft Delete

Для важных сущностей:

```text
archived_at
```

Не удалять рабочую историю одним случайным кликом.

Hard delete:
- только из Archive;
- с confirmation.

---

# 70. UX: progressive disclosure

При создании записи показывать только необходимые поля.

Пример Quick Task:

```text
Название
Проект
Срок
```

После создания detail screen позволяет заполнить:

```text
Source
Context
People
Expected result
Documents
etc.
```

Приложение должно снижать бюрократию, а не производить ее.

---

# 71. Keyboard UX

Desktop shortcuts:

```text
C       Create
/       Search
G P     Projects
G T     Tasks
G PPL   People
Esc     Close
```

Не мешать браузерным shortcuts.

Показывать shortcut hints в command palette.

---

# 72. Tables

Desktop:
- dense;
- sticky header;
- inline status;
- filters;
- sorting;
- saved views.

Mobile:
- cards/list;
- swipe не делать обязательным;
- основные действия через menu.

---

# 73. Boards

Использовать drag & drop.

Но:

- изменение статуса доступно также через menu;
- keyboard support;
- mobile status selector.

---

# 74. Calendar

Calendar должен собирать:

- tasks;
- events;
- follow-ups;
- commitments;
- content publish dates.

Filters:

```text
Tasks
Events
People
Content
Commitments
```

---

# 75. UI states

Обязательно разработать:

- loading;
- skeleton;
- empty;
- error;
- offline;
- no permission;
- archived;
- success;
- destructive confirmation.

Не оставлять blank screens.

---

# 76. Performance

- lazy load тяжелых charts;
- pagination / virtualized lists при необходимости;
- не грузить все сущности приложения на каждый route;
- image optimization;
- avoid giant client bundle;
- Server Components where practical;
- client components только для интерактива.

---

# 77. Accessibility

- WCAG-minded contrast;
- focus visible;
- keyboard navigation;
- aria labels;
- semantic headings;
- screen reader names;
- reduced motion;
- minimum mobile touch targets.

---

# 78. Git

Проект обязательно должен быть Git repository.

После рабочего MVP:

```bash
git init
git add .
git commit -m "Initial BCC HUB DevRel OS"
```

Если GitHub CLI авторизован:

```bash
gh repo create bcc-hub-devrel-os --private --source=. --remote=origin --push
```

Если repository уже существует:
- использовать его;
- не создавать второй.

Никогда не commit:
- `.env`;
- secrets;
- Supabase keys, которые не должны быть публичными;
- local DB dump с чувствительными данными.

---

# 79. Vercel

После GitHub push:

1. подключить repository к Vercel;
2. выбрать Next.js;
3. передать environment variables;
4. выполнить production deploy;
5. проверить production URL;
6. проверить mobile и desktop;
7. проверить auth;
8. проверить CRUD;
9. проверить persistence после reload.

После подключения GitHub к Vercel дальнейшие pushes в production branch должны автоматически обновлять deployment.

Если Vercel CLI авторизован:

```bash
vercel link
vercel --prod
```

Не утверждать, что deployment выполнен, если credentials отсутствуют.

Если отсутствует авторизация:
- завершить код;
- сохранить Git history;
- дать ровно один короткий список действий, которые должен сделать пользователь.

---

# 80. Supabase deployment

В репозитории сохранить:

```text
supabase/
  migrations/
```

Все database changes должны жить в migrations.

Никаких ручных undocumented SQL changes.

Также создать:

```text
docs/
  DATABASE.md
```

с:

- schema overview;
- setup;
- migrations;
- RLS;
- backup/export.

---

# 81. Seed data

Сделать development seed.

Примеры проектов:

- BCC HUB DevRel Strategy 2026;
- DevFlow AI;
- Ambassador Program;
- Frontend Meetup;
- Internal Communities;
- Tech Brand;
- Tech Radar.

Не создавать фиктивные реальные имена сотрудников.

Использовать:

```text
Demo Speaker
Demo Ambassador
Demo Partner
```

или generic placeholders.

Production seed можно удалить одной командой.

---

# 82. Первый запуск

После первого login показать очень короткий onboarding:

```text
1. Создай первый проект
2. Добавь ближайшие задачи
3. Добавь важные контакты
```

Можно предложить:

```text
Загрузить DevRel Starter Structure
```

Starter Structure создает:

```text
DevRel 2026

├── Communities
├── DevFlow AI
├── Tech Brand
├── Ambassadors
├── Newsroom
├── Tech Radar
└── Operations
```

Но пользователь подтверждает создание.

---

# 83. Не использовать fake AI

Если AI API не подключен:

НЕ писать:
- AI Insight;
- AI Recommendation;
- AI Score.

Называть:

- Smart suggestion;
- Rule-based suggestion;
- Similar cases;
- Health rule.

Все рекомендации должны иметь понятное происхождение.

---

# 84. Что не делать в первой версии

Не добавлять:

- Slack clone;
- встроенный email client;
- полноценный document editor;
- собственный video hosting;
- собственный chat;
- сложный BPMN engine;
- финансовую бухгалтерию;
- multi-user roles;
- AI agent network;
- микросервисы.

Сначала сделать сильное ядро.

---

# 85. DEVELOPMENT PHASES

## Phase 0 — Foundation

Сделать:

- architecture;
- design tokens;
- DB schema;
- auth;
- RLS;
- app shell;
- responsive shell;
- PWA;
- Git.

---

## Phase 1 — Core Memory

Сделать полностью рабочими:

- Dashboard;
- Projects;
- Tasks;
- Contacts;
- Organizations;
- Interactions;
- Commitments;
- Relations;
- Activity;
- Search;
- Calendar.

CRUD должен быть настоящий.

---

## Phase 2 — DevRel Workflows

- Events;
- Meetup templates;
- Content;
- Communities;
- Documents;
- Decisions;
- Knowledge Cases.

---

## Phase 3 — Ambassador Program

- ambassadors;
- XP ledger;
- levels;
- training;
- leaderboard;
- analytics.

---

## Phase 4 — Tech Radar

- radar data;
- rings;
- categories;
- changelog;
- visualization;
- analytics.

---

## Phase 5 — Intelligence

- Health Scores;
- Similar Cases;
- Relationship Activity;
- Next Best Action;
- Event Readiness;
- duplicate detection.

---

# 86. Definition of Done

Функция НЕ считается реализованной, если:

- кнопка ничего не делает;
- используется mock data;
- данные пропадают после reload;
- mobile layout сломан;
- данные существуют только локально;
- нет empty/error state;
- desktop работает, mobile нет;
- объект нельзя открыть после создания;
- связь отображается только визуально, но не хранится в БД.

---

# 87. Cross-device acceptance test

Обязательно проверить:

### Test 1
Desktop:
создать Project.

Mobile:
reload.

Ожидание:
Project существует.

### Test 2
Mobile:
создать Task.

Desktop:
reload.

Ожидание:
Task существует и связан с Project.

### Test 3
Desktop:
добавить Interaction к Contact.

Mobile:
открыть Contact.

Ожидание:
Interaction виден в Timeline.

### Test 4
Mobile:
начислить XP Ambassador.

Desktop:
открыть leaderboard.

Ожидание:
XP и rank обновлены.

---

# 88. Mobile acceptance test

На 375px:

- navigation usable;
- Quick Add reachable;
- forms readable;
- no horizontal page scroll;
- task can be created;
- project can be opened;
- interaction can be logged;
- leaderboard readable;
- analytics cards fit;
- Tech Radar can be browsed;
- keyboard does not destroy layout;
- bottom nav respects safe area.

---

# 89. Design acceptance test

Сверить с `design.md`.

Проверить:

- white/light base;
- BCC violet accents;
- lilac/cyan support;
- correct radius;
- restrained shadows;
- dense working UI;
- no purple overload;
- no generic dark bank dashboard;
- no random gradients;
- coherent icons;
- consistent spacing;
- mobile feels native.

---

# 90. Final delivery

После реализации предоставить:

```text
1. Production URL
2. GitHub repository
3. README
4. docs/ARCHITECTURE.md
5. docs/DATABASE.md
6. docs/DEPLOYMENT.md
7. supabase/migrations
8. design.md
```

README должен содержать:

```text
Local setup
Environment variables
Supabase setup
Run migrations
Run dev
Build
Deploy
Backup/export
```

---

# 91. Порядок работы агента

Не начинай с написания случайных компонентов.

Работай строго так:

### Step 1
Прочитай `design.md`.

### Step 2
Изучи существующий repository.

### Step 3
Зафиксируй IA и routes.

### Step 4
Создай ER diagram / schema plan.

### Step 5
Создай migrations + RLS.

### Step 6
Создай Auth.

### Step 7
Создай responsive App Shell + PWA.

### Step 8
Реализуй Phase 1 end-to-end.

### Step 9
Проверь CRUD + cross-device.

### Step 10
Реализуй следующие phases.

### Step 11
Запусти:
- lint;
- typecheck;
- production build.

### Step 12
Проверь responsive.

### Step 13
Commit.

### Step 14
Push GitHub.

### Step 15
Deploy Vercel.

### Step 16
Проверь production.

---

# 92. Главный продуктовый фильтр

Перед добавлением любой функции спроси:

> Поможет ли это быстрее понять контекст, принять решение или выполнить следующее действие?

Если нет — функция не нужна.

Система должна создавать ощущение:

> «Я открыл DevRel OS и за 30 секунд понял, что происходит, что горит, кому нужно написать и что делать дальше».

Это главный критерий качества продукта.

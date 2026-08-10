import type { AnyRecord, ModuleKey } from "./types";

const now = "2026-08-10T10:00:00.000Z";
const id = (n: number) => `seed-${n}`;
const base = (n: number, extra: Record<string, unknown>): AnyRecord => ({ id: id(n), created_at: now, updated_at: now, ...extra });

export const SEED_DATA: Record<ModuleKey, AnyRecord[]> = {
  projects: [
    base(1, { title: "BCC HUB DevRel Strategy 2026", description: "Единый портфель DevRel-направлений и рабочий контекст.", direction: "Operations", status: "Active", priority: "High", due_date: "2026-12-31", next_action: "Собрать список целей Q3", health_score: 84, health_state: "Attention" }),
    base(2, { title: "Frontend Meetup", description: "Первый reusable meetup workflow для frontend-сообщества.", direction: "Events", status: "Planning", priority: "High", due_date: "2026-08-28", next_action: "Подтвердить спикера", health_score: 72, health_state: "Attention" }),
    base(3, { title: "Tech Radar", description: "Backend radar с понятными ring и change state.", direction: "Tech Radar", status: "Active", priority: "Medium", due_date: "2026-09-15", next_action: "Провести review OpenAPI", health_score: 91, health_state: "Healthy" })
  ],
  tasks: [
    base(11, { title: "Подтвердить спикера", description: "Получить финальное подтверждение Demo Speaker.", status: "Waiting", priority: "High", due_date: "2026-08-12", project_id: id(2), source_type: "Meeting", source_label: "Planning sync", next_action: "Написать follow-up" }),
    base(12, { title: "Проверить backup laptop", description: "Проверить технику до event day.", status: "Planned", priority: "Normal", due_date: "2026-08-21", project_id: id(2), source_type: "Event", next_action: "Добавить owner" }),
    base(13, { title: "Провести review OpenAPI", description: "Обновить ring и rationale в Tech Radar.", status: "In Progress", priority: "Medium", due_date: "2026-08-18", project_id: id(3), source_type: "Strategy", next_action: "Сверить contributors" })
  ],
  people: [base(21, { first_name: "Demo", last_name: "Speaker", name: "Demo Speaker", position: "Backend Engineer", organization_name: "Demo Partner", relationship_type: "Speaker", last_interaction_at: "2026-08-08", next_follow_up_at: "2026-08-12", notes: "Generic development placeholder." })],
  organizations: [base(31, { name: "Demo Partner", type: "Partner", city: "Almaty", description: "Generic partner placeholder for development seed." })],
  interactions: [base(41, { title: "Planning sync с Demo Speaker", date: "2026-08-08", type: "Meeting", topic: "Frontend Meetup", summary: "Обсудили формат и readiness.", decision: "Нужна финальная rehearsal.", next_action: "Отправить follow-up", follow_up_date: "2026-08-12", contact_id: id(21), project_id: id(2) })],
  commitments: [base(51, { title: "Прислать draft презентации", description: "Demo Speaker отправит draft до rehearsal.", owed_by: "contact", due_date: "2026-08-14", status: "Open", contact_id: id(21), project_id: id(2) })],
  events: [base(61, { title: "Frontend Meetup — Aug 2026", type: "Meetup", project_id: id(2), date_start: "2026-08-28", date_end: "2026-08-28", location: "Almaty · hybrid", audience: "Frontend community", registration_target: 80, registrations: 42, confirmed: 31, attended: 0, status: "Planning" })],
  content: [base(71, { title: "Backend architecture digest", content_type: "Digest", channel: "LinkedIn", status: "Review", planned_date: "2026-08-20", description: "Короткая подборка практик для Backend community." })],
  communities: [base(81, { name: "Backend", description: "Рабочее сообщество backend-инженеров.", status: "Active", members_count: 120, next_activity_at: "2026-08-28" }), base(82, { name: "Frontend", description: "Frontend community и meetup-повестка.", status: "Growing", members_count: 74, next_activity_at: "2026-08-28" })],
  ambassadors: [base(91, { name: "Demo Ambassador", track: "Technical", level: "LV.1 Ambassador", status: "Active", start_date: "2026-07-01", total_xp: 145, current_quarter_xp: 95, training_progress: 40, notes: "Generic development placeholder." })],
  "tech-radar": [base(101, { name: "OpenAPI / Swagger", category: "Технологии", ring: "Adopt", change_state: "Recently Changed", version: "3.1", description: "Контрактный подход к API-дизайну.", recommendation: "Использовать для новых публичных и внутренних API.", last_reviewed_at: "2026-08-05", public_url: "https://www.openapis.org/" }), base(102, { name: "Docker", category: "Инструменты", ring: "Trial", change_state: "Unchanged", version: "27", description: "Повторяемая среда разработки и доставки.", recommendation: "Проверять границы использования перед расширением.", last_reviewed_at: "2026-07-20" }), base(103, { name: "Node.js", category: "Языки и фреймворки", ring: "Adopt", change_state: "New", version: "22", description: "Runtime для сервисов и tooling.", recommendation: "Adopt для новых backend-инструментов.", last_reviewed_at: "2026-08-09" })],
  documents: [base(111, { title: "Meetup checklist", type: "Checklist", location_type: "Internal", status: "Active", description: "Базовый список подготовки meetup." })],
  decisions: [base(121, { title: "Использовать формат hybrid meetup", date: "2026-08-07", context: "Нужно расширить доступность события.", options: "Только офлайн; hybrid; только онлайн", decision: "Hybrid", reason: "Сохраняет живое общение и масштабирует охват.", consequences: "Нужны backup laptop и streaming check." })],
  knowledge: [base(131, { title: "Первый meetup: что сработало", situation: "Нужно быстро запустить community event.", problem: "Не хватало единого checklist.", actions: "Собрали lifecycle и критические задачи.", result: "Подготовка стала видимой по readiness.", what_worked: "Один owner и next action у каждой задачи.", what_failed: "Репетиция была добавлена поздно.", reusable_solution: "Создавать event через BCC HUB Meetup template." })]
};

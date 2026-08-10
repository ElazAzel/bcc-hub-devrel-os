export type AnyRecord = {
  id: string;
  owner_id?: string;
  title?: string;
  name?: string;
  description?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  [key: string]: any;
};

export type RecordListQuery = {
  q?: string;
  statuses?: string[];
  page?: number;
  pageSize?: number;
  sort?: { field: string; direction: "asc" | "desc" };
  dateFrom?: string;
  dateTo?: string;
};

export type RecordPage<T = AnyRecord> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};

export type WorkspaceSearchResult = {
  module: ModuleKey;
  id: string;
  title: string;
  subtitle?: string;
  rank: number;
};

export type ModuleKey =
  | "projects" | "tasks" | "people" | "organizations" | "interactions" | "commitments"
  | "events" | "content" | "communities" | "ambassadors" | "tech-radar" | "documents"
  | "decisions" | "knowledge";

export type TableName =
  | "projects" | "tasks" | "contacts" | "organizations" | "interactions" | "commitments"
  | "events" | "content_items" | "communities" | "ambassadors" | "tech_radar_items"
  | "documents" | "decisions" | "knowledge_cases";

export type ModuleConfig = {
  key: ModuleKey;
  table: TableName;
  label: string;
  singular: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  searchFields: string[];
  fields: FieldConfig[];
};

export type FieldConfig = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "date" | "select" | "number" | "url";
  placeholder?: string;
  options?: string[];
  required?: boolean;
};

export const MODULES: Record<ModuleKey, ModuleConfig> = {
  projects: {
    key: "projects", table: "projects", label: "Projects", singular: "Project",
    description: "Главные контейнеры работы и стратегические направления.",
    emptyTitle: "Проектов пока нет", emptyDescription: "Создай первый контейнер для DevRel-работы.",
    searchFields: ["title", "description", "direction", "goal"],
    fields: [
      { key: "title", label: "Название", required: true, placeholder: "Например, Frontend Meetup" },
      { key: "description", label: "Короткий контекст", type: "textarea", placeholder: "Зачем существует этот проект?" },
      { key: "direction", label: "Направление", type: "select", options: ["Communities", "DevFlow AI", "Tech Brand", "Ambassadors", "Newsroom", "Tech Radar", "Events", "Schools / Talent", "Operations", "Other"] },
      { key: "status", label: "Статус", type: "select", options: ["Idea", "Planning", "Active", "On hold", "Done", "Archived"] },
      { key: "priority", label: "Приоритет", type: "select", options: ["Low", "Medium", "High", "Critical"] },
      { key: "due_date", label: "Дедлайн", type: "date" },
      { key: "next_action", label: "Следующий шаг", placeholder: "Что должно произойти дальше?" }
    ]
  },
  tasks: {
    key: "tasks", table: "tasks", label: "Tasks", singular: "Task",
    description: "Задачи с источником, контекстом и понятным следующим действием.",
    emptyTitle: "Задач пока нет", emptyDescription: "Добавь ближайший шаг — он появится здесь и на Dashboard.",
    searchFields: ["title", "description", "context", "source_label", "next_action"],
    fields: [
      { key: "title", label: "Название", required: true, placeholder: "Например, Confirm speaker" },
      { key: "description", label: "Описание", type: "textarea" },
      { key: "status", label: "Статус", type: "select", options: ["Inbox", "Planned", "In Progress", "Waiting", "Blocked", "Done", "Cancelled"] },
      { key: "priority", label: "Приоритет", type: "select", options: ["Low", "Normal", "High", "Critical"] },
      { key: "due_date", label: "Срок", type: "date" },
      { key: "source_type", label: "Источник", type: "select", options: ["Meeting", "Teams", "Email", "Call", "Manager", "Strategy", "Personal", "Event", "Ambassador", "Community", "Other"] },
      { key: "source_label", label: "Источник / ссылка", placeholder: "Встреча, письмо или ссылка" },
      { key: "next_action", label: "Следующий шаг", placeholder: "Какой результат нужен?" }
    ]
  },
  people: {
    key: "people", table: "contacts", label: "People", singular: "Contact",
    description: "Рабочий контекст людей, взаимодействия и follow-up.",
    emptyTitle: "Контактов пока нет", emptyDescription: "Сохраняй важные рабочие связи и историю общения.",
    searchFields: ["first_name", "last_name", "position", "email", "organization_name", "notes"],
    fields: [
      { key: "first_name", label: "Имя", required: true, placeholder: "Demo" },
      { key: "last_name", label: "Фамилия", placeholder: "Speaker" },
      { key: "position", label: "Роль / позиция", placeholder: "Backend Engineer" },
      { key: "organization_name", label: "Организация", placeholder: "Demo Partner" },
      { key: "email", label: "Email", type: "text", placeholder: "name@example.com" },
      { key: "telegram", label: "Telegram", placeholder: "@handle" },
      { key: "relationship_type", label: "Тип связи", type: "select", options: ["Speaker", "Partner", "Community", "Colleague", "Media", "Mentor", "Other"] },
      { key: "next_follow_up_at", label: "Следующий follow-up", type: "date" },
      { key: "notes", label: "Заметки", type: "textarea" }
    ]
  },
  organizations: {
    key: "organizations", table: "organizations", label: "Organizations", singular: "Organization",
    description: "Компании, сообщества и партнёры вокруг DevRel-контекста.", emptyTitle: "Организаций пока нет", emptyDescription: "Добавь организацию, чтобы связывать с ней людей и проекты.",
    searchFields: ["name", "type", "website", "description", "city"], fields: [
      { key: "name", label: "Название", required: true, placeholder: "Demo Partner" },
      { key: "type", label: "Тип", type: "select", options: ["BCC", "Vendor", "Partner", "Community", "Media", "University", "Technology Company", "Other"] },
      { key: "website", label: "Website", type: "url" }, { key: "city", label: "Город" },
      { key: "description", label: "Описание", type: "textarea" }
    ]
  },
  interactions: {
    key: "interactions", table: "interactions", label: "Interactions", singular: "Interaction",
    description: "История встреч, звонков, переписок и договорённостей.", emptyTitle: "Взаимодействий пока нет", emptyDescription: "Зафиксируй первый контакт, чтобы сохранить контекст.",
    searchFields: ["title", "topic", "summary", "decision", "next_action"], fields: [
      { key: "title", label: "Заголовок", required: true, placeholder: "Разговор о Backend meetup" }, { key: "date", label: "Дата", type: "date" },
      { key: "type", label: "Тип", type: "select", options: ["Meeting", "Call", "Teams", "Telegram", "Email", "LinkedIn", "Offline", "Other"] },
      { key: "topic", label: "Тема", placeholder: "О чём говорили" }, { key: "summary", label: "Краткое резюме", type: "textarea" },
      { key: "decision", label: "Решение", type: "textarea" }, { key: "next_action", label: "Следующий шаг" }, { key: "follow_up_date", label: "Follow-up", type: "date" }
    ]
  },
  commitments: {
    key: "commitments", table: "commitments", label: "Commitments", singular: "Commitment",
    description: "Обещания, которые нельзя потерять между встречами.", emptyTitle: "Договорённостей пока нет", emptyDescription: "Зафиксируй, кто и что должен сделать дальше.", searchFields: ["title", "description", "owed_by"], fields: [
      { key: "title", label: "Договорённость", required: true, placeholder: "Прислать draft презентации" }, { key: "description", label: "Контекст", type: "textarea" },
      { key: "owed_by", label: "Кто должен", type: "select", options: ["me", "contact"] }, { key: "due_date", label: "Срок", type: "date" },
      { key: "status", label: "Статус", type: "select", options: ["Open", "Done", "Cancelled"] }
    ]
  },
  events: {
    key: "events", table: "events", label: "Events", singular: "Event", description: "События от идеи до ретроспективы.", emptyTitle: "Событий пока нет", emptyDescription: "Запланируй митап, workshop или другой формат.", searchFields: ["title", "type", "location", "audience"], fields: [
      { key: "title", label: "Название", required: true, placeholder: "Frontend Meetup" }, { key: "type", label: "Тип", type: "select", options: ["Meetup", "Hackathon", "Workshop", "Conference", "Townhall", "Challenge", "Training", "Community Event", "Other"] },
      { key: "status", label: "Lifecycle", type: "select", options: ["Idea", "Planning", "Content", "Marketing", "Registration", "Production", "Event Day", "Post-event", "Retrospective", "Done"] },
      { key: "date_start", label: "Начало", type: "date" }, { key: "date_end", label: "Окончание", type: "date" }, { key: "location", label: "Место / формат" }, { key: "audience", label: "Аудитория" }, { key: "registration_target", label: "Цель регистраций", type: "number" }
    ]
  },
  content: {
    key: "content", table: "content_items", label: "Content", singular: "Content item", description: "Контентный pipeline от идеи до публикации.", emptyTitle: "Контента пока нет", emptyDescription: "Собери идею в brief и доведи её до результата.", searchFields: ["title", "channel", "content_type", "status"], fields: [
      { key: "title", label: "Название", required: true, placeholder: "Backend architecture digest" }, { key: "content_type", label: "Тип", type: "select", options: ["Article", "LinkedIn", "Dev.to", "Instagram", "YouTube", "Podcast", "Interview", "Case Study", "Digest", "Video", "Presentation"] },
      { key: "channel", label: "Канал", placeholder: "LinkedIn" }, { key: "status", label: "Pipeline", type: "select", options: ["Idea", "Brief", "Draft", "Review", "Compliance", "Ready", "Scheduled", "Published", "Archived"] }, { key: "planned_date", label: "Дата публикации", type: "date" }, { key: "external_url", label: "Ссылка", type: "url" }, { key: "description", label: "Короткий brief", type: "textarea" }
    ]
  },
  communities: {
    key: "communities", table: "communities", label: "Communities", singular: "Community", description: "Сообщества, их ритм и ближайшая активность.", emptyTitle: "Сообществ пока нет", emptyDescription: "Создай пространство для работы с аудиторией.", searchFields: ["name", "description", "status"], fields: [
      { key: "name", label: "Название", required: true, placeholder: "Backend" }, { key: "description", label: "Описание", type: "textarea" }, { key: "status", label: "Статус", type: "select", options: ["Active", "Growing", "Paused", "Archived"] }, { key: "members_count", label: "Участников", type: "number" }, { key: "next_activity_at", label: "Следующая активность", type: "date" }
    ]
  },
  ambassadors: {
    key: "ambassadors", table: "ambassadors", label: "Ambassadors", singular: "Ambassador", description: "Программа, вклад и прозрачный XP ledger.", emptyTitle: "Амбассадоров пока нет", emptyDescription: "Добавь амбассадора, чтобы вести вклад и обучение.", searchFields: ["name", "track", "level", "status"], fields: [
      { key: "name", label: "Имя / placeholder", required: true, placeholder: "Demo Ambassador" }, { key: "track", label: "Трек", type: "select", options: ["Technical", "Non-technical", "Lifestyle"] }, { key: "level", label: "Уровень", type: "select", options: ["LV.0 Newcomer", "LV.1 Ambassador", "LV.2 Senior Ambassador", "LV.3 Hub Hero"] }, { key: "status", label: "Статус", type: "select", options: ["Active", "Onboarding", "Paused", "Archived"] }, { key: "start_date", label: "Дата старта", type: "date" }, { key: "notes", label: "Контекст", type: "textarea" }
    ]
  },
  "tech-radar": {
    key: "tech-radar", table: "tech_radar_items", label: "Tech Radar", singular: "Radar item", description: "Backend-технологии BCC HUB: ring, category и история изменений.", emptyTitle: "Radar пока пуст", emptyDescription: "Добавь технологию и зафиксируй прозрачную рекомендацию.", searchFields: ["name", "category", "ring", "description", "recommendation"], fields: [
      { key: "name", label: "Технология", required: true, placeholder: "OpenAPI / Swagger" }, { key: "category", label: "Категория", type: "select", options: ["Технологии", "Инструменты", "Платформы", "Языки и фреймворки"] }, { key: "ring", label: "Ring", type: "select", options: ["Adopt", "Trial", "Assess", "Hold"] }, { key: "change_state", label: "Изменение", type: "select", options: ["New", "Recently Changed", "Unchanged"] }, { key: "version", label: "Версия" }, { key: "description", label: "Описание", type: "textarea" }, { key: "recommendation", label: "Рекомендация", type: "textarea" }, { key: "public_url", label: "Ссылка", type: "url" }
    ]
  },
  documents: {
    key: "documents", table: "documents", label: "Documents", singular: "Document", description: "Индекс документов и внешних источников, а не замена им.", emptyTitle: "Документов пока нет", emptyDescription: "Свяжи рабочую запись с SharePoint, Teams, GitHub или другим источником.", searchFields: ["title", "type", "location_type", "external_url"], fields: [
      { key: "title", label: "Название", required: true, placeholder: "Meetup checklist" }, { key: "type", label: "Тип", placeholder: "Checklist" }, { key: "location_type", label: "Где хранится", type: "select", options: ["Internal", "SharePoint", "Teams", "Confluence", "BCC HUB Website", "GitHub", "Google Drive", "Figma", "Other"] }, { key: "external_url", label: "Ссылка", type: "url" }, { key: "status", label: "Статус", type: "select", options: ["Draft", "Active", "Archived"] }, { key: "description", label: "Заметка", type: "textarea" }
    ]
  },
  decisions: {
    key: "decisions", table: "decisions", label: "Decisions", singular: "Decision", description: "Лог решений с контекстом, вариантами и последствиями.", emptyTitle: "Решений пока нет", emptyDescription: "Сохраняй решения, чтобы не повторять старые обсуждения.", searchFields: ["title", "context", "decision", "reason"], fields: [
      { key: "title", label: "Решение", required: true, placeholder: "Выбрать формат Backend meetup" }, { key: "date", label: "Дата", type: "date" }, { key: "context", label: "Контекст", type: "textarea" }, { key: "options", label: "Варианты", type: "textarea" }, { key: "decision", label: "Что решили", type: "textarea" }, { key: "reason", label: "Почему", type: "textarea" }, { key: "consequences", label: "Последствия", type: "textarea" }
    ]
  },
  knowledge: {
    key: "knowledge", table: "knowledge_cases", label: "Knowledge", singular: "Knowledge case", description: "Память о том, что сработало, а что нет.", emptyTitle: "Кейсов пока нет", emptyDescription: "Сохрани завершённый проект или задачу как reusable case.", searchFields: ["title", "situation", "problem", "result", "reusable_solution"], fields: [
      { key: "title", label: "Название кейса", required: true, placeholder: "Как подготовили первый meetup" }, { key: "situation", label: "Ситуация", type: "textarea" }, { key: "problem", label: "Проблема", type: "textarea" }, { key: "actions", label: "Действия", type: "textarea" }, { key: "result", label: "Результат", type: "textarea" }, { key: "what_worked", label: "Что сработало", type: "textarea" }, { key: "what_failed", label: "Что не сработало", type: "textarea" }, { key: "reusable_solution", label: "Reusable solution", type: "textarea" }
    ]
  }
};

export function getModule(key: string): ModuleConfig | undefined {
  return MODULES[key as ModuleKey];
}

export function displayName(record: AnyRecord): string {
  if (record.title) return String(record.title);
  if (record.name) return String(record.name);
  return [record.first_name, record.last_name].filter(Boolean).join(" ") || "Без названия";
}

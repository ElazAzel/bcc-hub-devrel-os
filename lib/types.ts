export type AnyRecord = {
  id: string;
  owner_id?: string;
  title?: string;
  name?: string;
  description?: string | null;
  direction?: string | null;
  next_action?: string | null;
  external_url?: string | null;
  topic?: string | null;
  position?: string | null;
  category?: string | null;
  ring?: string | null;
  relationship_state?: string | null;
  change_state?: string | null;
  parent_title?: string | null;
  parent_task_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  meeting_mode?: "online" | "offline" | string | null;
  meeting_url?: string | null;
  location?: string | null;
  status?: string | null;
  priority?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  schedule_variance_reason?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  [key: string]: unknown;
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

export type EntityRelation = {
  id: string;
  owner_id?: string;
  source_type: string;
  source_id: string;
  relation_type: string;
  target_type: string;
  target_id: string;
  created_at: string;
};

export type EntityComment = {
  id: string;
  owner_id?: string;
  entity_type: string;
  entity_id: string;
  body: string;
  author_name?: string | null;
  created_at: string;
  updated_at?: string;
};

export type EntityContactLink = {
  id: string;
  owner_id?: string;
  entity_type: string;
  entity_id: string;
  contact_id: string;
  role?: string | null;
  created_at: string;
};

export type EntityParentLink = {
  id: string;
  owner_id?: string;
  child_type: string;
  child_id: string;
  parent_type: string;
  parent_id: string;
  relation_type: string;
  created_at: string;
};

export type EmployeeImportRow = {
  name: string;
  first_name: string;
  last_name: string;
  position: string;
  department: string;
  email: string;
  phone: string;
  contact_kind: "Employee";
  notes?: string;
};

export type TaskReadiness = {
  total: number;
  done: number;
  inProgress: number;
  waiting: number;
  blocked: number;
  percent: number;
};

export type EventReadiness = {
  percent: number;
  registrationPercent: number;
  criticalTaskPercent: number;
  criticalTasks: TaskReadiness;
};

export type ConnectionNode = {
  key: string;
  module: ModuleKey;
  id: string;
  title: string;
  subtitle?: string;
  status?: string | null;
  readiness?: TaskReadiness;
  root?: boolean;
};

export type ConnectionEdge = {
  key: string;
  source: string;
  target: string;
  relation: string;
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
  type?: "text" | "textarea" | "date" | "time" | "select" | "number" | "url";
  placeholder?: string;
  options?: string[];
};

export function isFieldVisible(module: ModuleKey, field: FieldConfig, values: Record<string, unknown>): boolean {
  if (module !== "tasks") return true;
  if (field.key === "meeting_url") return values.meeting_mode === "online";
  if (field.key === "location") return values.meeting_mode === "offline";
  return true;
}

export const MODULES: Record<ModuleKey, ModuleConfig> = {
  projects: {
    key: "projects", table: "projects", label: "Projects", singular: "Project",
    description: "Главные контейнеры работы и стратегические направления.",
    emptyTitle: "Проектов пока нет", emptyDescription: "Создай первый контейнер для DevRel-работы.",
    searchFields: ["title", "description", "direction", "goal"],
    fields: [
      { key: "title", label: "Название", placeholder: "Например, Frontend Meetup" },
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
      { key: "title", label: "Название", placeholder: "Например, Confirm speaker" },
      { key: "description", label: "Описание", type: "textarea" },
      { key: "status", label: "Статус", type: "select", options: ["Inbox", "Planned", "In Progress", "Waiting", "Blocked", "Done", "Cancelled"] },
      { key: "priority", label: "Приоритет", type: "select", options: ["Low", "Normal", "High", "Critical"] },
      { key: "start_date", label: "Дата старта", type: "date" },
      { key: "end_date", label: "Дата окончания", type: "date" },
      { key: "due_date", label: "Срок", type: "date" },
      { key: "schedule_variance_reason", label: "Почему срок изменился", type: "textarea", placeholder: "Что помогло или задержало выполнение?" },
      { key: "start_time", label: "Время начала", type: "time" },
      { key: "end_time", label: "Время окончания", type: "time" },
      { key: "meeting_mode", label: "Формат встречи", type: "select", options: ["online", "offline"] },
      { key: "meeting_url", label: "Ссылка на встречу", type: "url", placeholder: "https://meet.example.com/..." },
      { key: "location", label: "Локация", placeholder: "Офис, зал или адрес" },
      { key: "source_type", label: "Источник", type: "select", options: ["Meeting", "Teams", "Email", "Call", "Manager", "Strategy", "Personal", "Event", "Ambassador", "Community", "Other"] },
      { key: "source_label", label: "Источник / ссылка", placeholder: "Встреча, письмо или ссылка" },
      { key: "next_action", label: "Следующий шаг", placeholder: "Какой результат нужен?" }
    ]
  },
  people: {
    key: "people", table: "contacts", label: "People", singular: "Contact",
    description: "Рабочий контекст людей, взаимодействия и follow-up.",
    emptyTitle: "Контактов пока нет", emptyDescription: "Сохраняй важные рабочие связи и историю общения.",
    searchFields: ["first_name", "last_name", "position", "email", "phone", "organization_name", "notes"],
    fields: [
      { key: "first_name", label: "Имя", placeholder: "Demo" },
      { key: "last_name", label: "Фамилия", placeholder: "Speaker" },
      { key: "position", label: "Роль / позиция", placeholder: "Backend Engineer" },
      { key: "department", label: "Подразделение", placeholder: "Центр IT" },
      { key: "organization_name", label: "Организация", placeholder: "Demo Partner" },
      { key: "email", label: "Email", type: "text", placeholder: "name@example.com" },
      { key: "phone", label: "Телефон", type: "text", placeholder: "+7 700 000 00 00" },
      { key: "telegram", label: "Telegram", placeholder: "@handle" },
      { key: "contact_kind", label: "Тип контакта", type: "select", options: ["External", "Employee"] },
      { key: "relationship_type", label: "Тип связи", type: "select", options: ["Speaker", "Partner", "Community", "Colleague", "Media", "Mentor", "Other"] },
      { key: "next_follow_up_at", label: "Следующий follow-up", type: "date" },
      { key: "notes", label: "Заметки", type: "textarea" }
    ]
  },
  organizations: {
    key: "organizations", table: "organizations", label: "Organizations", singular: "Organization",
    description: "Компании, сообщества и партнёры вокруг DevRel-контекста.", emptyTitle: "Организаций пока нет", emptyDescription: "Добавь организацию, чтобы связывать с ней людей и проекты.",
    searchFields: ["name", "type", "website", "description", "city"], fields: [
      { key: "name", label: "Название", placeholder: "Demo Partner" },
      { key: "type", label: "Тип", type: "select", options: ["BCC", "Vendor", "Partner", "Community", "Media", "University", "Technology Company", "Other"] },
      { key: "website", label: "Website", type: "url" }, { key: "city", label: "Город" },
      { key: "description", label: "Описание", type: "textarea" }
    ]
  },
  interactions: {
    key: "interactions", table: "interactions", label: "Interactions", singular: "Interaction",
    description: "История встреч, звонков, переписок и договорённостей.", emptyTitle: "Взаимодействий пока нет", emptyDescription: "Зафиксируй первый контакт, чтобы сохранить контекст.",
    searchFields: ["title", "topic", "summary", "decision", "next_action"], fields: [
      { key: "title", label: "Заголовок", placeholder: "Разговор о Backend meetup" }, { key: "date", label: "Дата", type: "date" },
      { key: "type", label: "Тип", type: "select", options: ["Meeting", "Call", "Teams", "Telegram", "Email", "LinkedIn", "Offline", "Other"] },
      { key: "topic", label: "Тема", placeholder: "О чём говорили" }, { key: "summary", label: "Краткое резюме", type: "textarea" },
      { key: "decision", label: "Решение", type: "textarea" }, { key: "next_action", label: "Следующий шаг" }, { key: "follow_up_date", label: "Follow-up", type: "date" }
    ]
  },
  commitments: {
    key: "commitments", table: "commitments", label: "Commitments", singular: "Commitment",
    description: "Обещания, которые нельзя потерять между встречами.", emptyTitle: "Договорённостей пока нет", emptyDescription: "Зафиксируй, кто и что должен сделать дальше.", searchFields: ["title", "description", "owed_by"], fields: [
      { key: "title", label: "Договорённость", placeholder: "Прислать draft презентации" }, { key: "description", label: "Контекст", type: "textarea" },
      { key: "owed_by", label: "Кто должен", type: "select", options: ["me", "contact"] }, { key: "due_date", label: "Срок", type: "date" },
      { key: "status", label: "Статус", type: "select", options: ["Open", "Done", "Cancelled"] }
    ]
  },
  events: {
    key: "events", table: "events", label: "Events", singular: "Event", description: "События от идеи до ретроспективы.", emptyTitle: "Событий пока нет", emptyDescription: "Запланируй митап, workshop или другой формат.", searchFields: ["title", "type", "location", "audience"], fields: [
      { key: "title", label: "Название", placeholder: "Frontend Meetup" }, { key: "type", label: "Тип", type: "select", options: ["Meetup", "Hackathon", "Workshop", "Conference", "Townhall", "Challenge", "Training", "Community Event", "Other"] },
      { key: "status", label: "Lifecycle", type: "select", options: ["Idea", "Planning", "Content", "Marketing", "Registration", "Production", "Event Day", "Post-event", "Retrospective", "Done"] },
      { key: "date_start", label: "Начало", type: "date" }, { key: "date_end", label: "Окончание", type: "date" }, { key: "location", label: "Место / формат" }, { key: "audience", label: "Аудитория" }, { key: "registration_target", label: "Цель регистраций", type: "number" }
    ]
  },
  content: {
    key: "content", table: "content_items", label: "Content", singular: "Content item", description: "Контентный pipeline от идеи до публикации.", emptyTitle: "Контента пока нет", emptyDescription: "Собери идею в brief и доведи её до результата.", searchFields: ["title", "channel", "content_type", "status"], fields: [
      { key: "title", label: "Название", placeholder: "Backend architecture digest" }, { key: "content_type", label: "Тип", type: "select", options: ["Article", "LinkedIn", "Dev.to", "Instagram", "YouTube", "Podcast", "Interview", "Case Study", "Digest", "Video", "Presentation"] },
      { key: "channel", label: "Канал", placeholder: "LinkedIn" }, { key: "status", label: "Pipeline", type: "select", options: ["Idea", "Brief", "Draft", "Review", "Compliance", "Ready", "Scheduled", "Published", "Archived"] }, { key: "planned_date", label: "Дата публикации", type: "date" }, { key: "external_url", label: "Ссылка", type: "url" }, { key: "description", label: "Короткий brief", type: "textarea" }
    ]
  },
  communities: {
    key: "communities", table: "communities", label: "Communities", singular: "Community", description: "Сообщества, их ритм и ближайшая активность.", emptyTitle: "Сообществ пока нет", emptyDescription: "Создай пространство для работы с аудиторией.", searchFields: ["name", "description", "status"], fields: [
      { key: "name", label: "Название", placeholder: "Backend" }, { key: "description", label: "Описание", type: "textarea" }, { key: "status", label: "Статус", type: "select", options: ["Active", "Growing", "Paused", "Archived"] }, { key: "members_count", label: "Участников", type: "number" }, { key: "next_activity_at", label: "Следующая активность", type: "date" }
    ]
  },
  ambassadors: {
    key: "ambassadors", table: "ambassadors", label: "Ambassadors", singular: "Ambassador", description: "Программа, вклад и прозрачный XP ledger.", emptyTitle: "Амбассадоров пока нет", emptyDescription: "Добавь амбассадора, чтобы вести вклад и обучение.", searchFields: ["name", "track", "level", "status"], fields: [
      { key: "name", label: "Имя / placeholder", placeholder: "Demo Ambassador" }, { key: "track", label: "Трек", type: "select", options: ["Technical", "Non-technical", "Lifestyle"] }, { key: "level", label: "Уровень", type: "select", options: ["LV.0 Newcomer", "LV.1 Ambassador", "LV.2 Senior Ambassador", "LV.3 Hub Hero"] }, { key: "status", label: "Статус", type: "select", options: ["Active", "Onboarding", "Paused", "Archived"] }, { key: "start_date", label: "Дата старта", type: "date" }, { key: "notes", label: "Контекст", type: "textarea" }
    ]
  },
  "tech-radar": {
    key: "tech-radar", table: "tech_radar_items", label: "Tech Radar", singular: "Radar item", description: "Backend-технологии BCC HUB: ring, category и история изменений.", emptyTitle: "Radar пока пуст", emptyDescription: "Добавь технологию и зафиксируй прозрачную рекомендацию.", searchFields: ["name", "category", "ring", "description", "recommendation"], fields: [
      { key: "name", label: "Технология", placeholder: "OpenAPI / Swagger" }, { key: "category", label: "Категория", type: "select", options: ["Технологии", "Инструменты", "Платформы", "Языки и фреймворки"] }, { key: "ring", label: "Ring", type: "select", options: ["Adopt", "Trial", "Assess", "Hold"] }, { key: "change_state", label: "Изменение", type: "select", options: ["New", "Recently Changed", "Unchanged"] }, { key: "version", label: "Версия" }, { key: "description", label: "Описание", type: "textarea" }, { key: "recommendation", label: "Рекомендация", type: "textarea" }, { key: "public_url", label: "Ссылка", type: "url" }
    ]
  },
  documents: {
    key: "documents", table: "documents", label: "Documents", singular: "Document", description: "Индекс документов и внешних источников, а не замена им.", emptyTitle: "Документов пока нет", emptyDescription: "Свяжи рабочую запись с SharePoint, Teams, GitHub или другим источником.", searchFields: ["title", "type", "location_type", "external_url"], fields: [
      { key: "title", label: "Название", placeholder: "Meetup checklist" }, { key: "type", label: "Тип", placeholder: "Checklist" }, { key: "location_type", label: "Где хранится", type: "select", options: ["Internal", "SharePoint", "Teams", "Confluence", "BCC HUB Website", "GitHub", "Google Drive", "Figma", "Other"] }, { key: "external_url", label: "Ссылка", type: "url" }, { key: "status", label: "Статус", type: "select", options: ["Draft", "Active", "Archived"] }, { key: "description", label: "Заметка", type: "textarea" }
    ]
  },
  decisions: {
    key: "decisions", table: "decisions", label: "Decisions", singular: "Decision", description: "Лог решений с контекстом, вариантами и последствиями.", emptyTitle: "Решений пока нет", emptyDescription: "Сохраняй решения, чтобы не повторять старые обсуждения.", searchFields: ["title", "context", "decision", "reason"], fields: [
      { key: "title", label: "Решение", placeholder: "Выбрать формат Backend meetup" }, { key: "date", label: "Дата", type: "date" }, { key: "context", label: "Контекст", type: "textarea" }, { key: "options", label: "Варианты", type: "textarea" }, { key: "decision", label: "Что решили", type: "textarea" }, { key: "reason", label: "Почему", type: "textarea" }, { key: "consequences", label: "Последствия", type: "textarea" }
    ]
  },
  knowledge: {
    key: "knowledge", table: "knowledge_cases", label: "Knowledge", singular: "Knowledge case", description: "Память о том, что сработало, а что нет.", emptyTitle: "Кейсов пока нет", emptyDescription: "Сохрани завершённый проект или задачу как reusable case.", searchFields: ["title", "situation", "problem", "result", "reusable_solution"], fields: [
      { key: "title", label: "Название кейса", placeholder: "Как подготовили первый meetup" }, { key: "situation", label: "Ситуация", type: "textarea" }, { key: "problem", label: "Проблема", type: "textarea" }, { key: "actions", label: "Действия", type: "textarea" }, { key: "result", label: "Результат", type: "textarea" }, { key: "what_worked", label: "Что сработало", type: "textarea" }, { key: "what_failed", label: "Что не сработало", type: "textarea" }, { key: "reusable_solution", label: "Reusable solution", type: "textarea" }
    ]
  }
};

const SCHEDULE_FIELDS: FieldConfig[] = [
  { key: "start_date", label: "Дата старта", type: "date" },
  { key: "end_date", label: "Дата окончания", type: "date" }
];

function withScheduleFields(config: ModuleConfig): ModuleConfig {
  const fields = [...config.fields];
  const hasStart = fields.some((field) => field.key === "start_date" || field.key === "date_start");
  const hasEnd = fields.some((field) => field.key === "end_date" || field.key === "date_end");
  if (hasStart && hasEnd) return { ...config, fields };
  const statusIndex = fields.findIndex((field) => field.key === "status");
  const insertionIndex = statusIndex >= 0 ? statusIndex : Math.min(2, fields.length);
  if (!hasStart) fields.splice(insertionIndex, 0, SCHEDULE_FIELDS[0]);
  if (!hasEnd) {
    const startIndex = fields.findIndex((field) => field.key === "start_date");
    fields.splice(startIndex >= 0 ? startIndex + 1 : insertionIndex + 1, 0, SCHEDULE_FIELDS[1]);
  }
  return { ...config, fields };
}

const MODULE_CONFIGS = Object.fromEntries(Object.entries(MODULES).map(([key, config]) => [key, withScheduleFields(config)])) as Record<ModuleKey, ModuleConfig>;

export function getModule(key: string): ModuleConfig | undefined {
  return MODULE_CONFIGS[key as ModuleKey];
}

export function displayName(record: AnyRecord): string {
  if (record.parent_task_id) {
    const title = String(record.title ?? record.name ?? "Task");
    return `↳ ${title}${record.parent_title ? ` · ${String(record.parent_title)}` : ""}`;
  }
  if (record.title) return String(record.title);
  if (record.name) return String(record.name);
  return [record.first_name, record.last_name].filter(Boolean).join(" ") || "Без названия";
}

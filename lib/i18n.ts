import { getModule, type FieldConfig, type ModuleKey } from "./types";

const moduleNames: Record<ModuleKey, { label: string; singular: string; description: string }> = {
  projects: { label: "Проекты", singular: "проект", description: "Главные контейнеры работы и стратегические направления." },
  tasks: { label: "Задачи", singular: "задачу", description: "Ближайшие шаги с источником, сроком и понятным результатом." },
  people: { label: "Люди", singular: "контакт", description: "Рабочий контекст людей, история общения и следующие контакты." },
  organizations: { label: "Организации", singular: "организацию", description: "Компании, сообщества и партнёры вокруг DevRel-контекста." },
  interactions: { label: "Взаимодействия", singular: "взаимодействие", description: "История встреч, звонков, переписок и договорённостей." },
  commitments: { label: "Договорённости", singular: "договорённость", description: "Обещания, которые нельзя потерять между встречами." },
  events: { label: "События", singular: "событие", description: "События от идеи до ретроспективы." },
  content: { label: "Содержание", singular: "материал", description: "Путь материала от идеи до публикации." },
  communities: { label: "Сообщества", singular: "сообщество", description: "Сообщества, их ритм и ближайшая активность." },
  ambassadors: { label: "Амбассадоры", singular: "амбассадора", description: "Программа, вклад и прозрачный XP-журнал." },
  "tech-radar": { label: "Техрадар", singular: "технологию", description: "Технологии BCC HUB, их место, рекомендации и изменения." },
  documents: { label: "Документы", singular: "документ", description: "Индекс документов и внешних источников." },
  decisions: { label: "Решения", singular: "решение", description: "Лог решений с контекстом, вариантами и последствиями." },
  knowledge: { label: "Память", singular: "заметку", description: "Заметки, решения и опыт, привязанные к рабочему контексту." }
};

const values: Record<string, string> = {
  Overview: "Обзор", Workspace: "Рабочее пространство", Home: "Главная", More: "Ещё", Analytics: "Аналитика", Documents: "Документы", Calendar: "Календарь", Settings: "Настройки",
  Projects: "Проекты", Tasks: "Задачи", People: "Люди", Events: "События", Content: "Содержание", Ambassadors: "Амбассадоры", Communities: "Сообщества", "Tech Radar": "Техрадар", Knowledge: "Память",
  Idea: "Идея", Planning: "Планирование", Active: "Активно", "On hold": "На паузе", Done: "Готово", Archived: "В архиве", Cancelled: "Отменено", Inbox: "Входящие", Planned: "Запланировано", "In Progress": "В работе", Waiting: "Ждём ответа", Blocked: "Заблокировано", Open: "Открыто", Published: "Опубликовано", Draft: "Черновик", Review: "На проверке", Ready: "Готово к публикации", Scheduled: "Запланировано", Compliance: "Проверка правил", Brief: "Бриф", Marketing: "Маркетинг", Production: "Подготовка", "Event Day": "День события", "Post-event": "После события", Retrospective: "Ретроспектива",
  Low: "Низкий", Normal: "Обычный", Medium: "Средний", High: "Высокий", Critical: "Критичный", Healthy: "В норме", Attention: "Нужно внимание", "At Risk": "Под риском",
  Meeting: "Встреча", Call: "Звонок", Teams: "Teams", Email: "Почта", Manager: "Руководитель", Strategy: "Стратегия", Personal: "Личное", Event: "Событие", Ambassador: "Амбассадор", Community: "Сообщество", Other: "Другое", Speaker: "Спикер", Partner: "Партнёр", Colleague: "Коллега", Media: "Медиа", Mentor: "Ментор", Employee: "Сотрудник", External: "Внешний контакт", contact: "контакт", me: "я",
  Meetup: "Митап", Hackathon: "Хакатон", Workshop: "Воркшоп", Conference: "Конференция", Townhall: "Общая встреча", Challenge: "Челлендж", Training: "Обучение", "Community Event": "Событие сообщества", LinkedIn: "LinkedIn", Telegram: "Telegram", Offline: "Офлайн",
  Article: "Статья", YouTube: "YouTube", Podcast: "Подкаст", Interview: "Интервью", "Case Study": "Кейс", Digest: "Дайджест", Video: "Видео", Presentation: "Презентация", Adopt: "Использовать", Trial: "Пробуем", Assess: "Оцениваем", Hold: "Не использовать", New: "Новое", "Recently Changed": "Недавно изменилось", Unchanged: "Без изменений", Technical: "Технический", "Non-technical": "Нетехнический", Lifestyle: "Лайфстайл", Onboarding: "Онбординг", Paused: "На паузе", "LV.0 Newcomer": "LV.0 Новичок", "LV.1 Ambassador": "LV.1 Амбассадор", "LV.2 Senior Ambassador": "LV.2 Старший амбассадор", "LV.3 Hub Hero": "LV.3 Hub Hero"
};

const fieldNames: Record<string, string> = {
  title: "Название", description: "Описание", direction: "Направление", project_type: "Тип проекта", status: "Статус", priority: "Приоритет", due_date: "Срок", next_action: "Следующий шаг", first_name: "Имя", last_name: "Фамилия", position: "Роль", department: "Подразделение", organization_name: "Организация", contact_kind: "Тип контакта", email: "Почта", phone: "Телефон", telegram: "Telegram", notes: "Заметки", date: "Дата", type: "Тип", topic: "Тема", summary: "Краткое резюме", decision: "Решение", follow_up_date: "Дата следующего контакта", owed_by: "Кто должен", date_start: "Начало", date_end: "Окончание", location: "Место или формат", audience: "Аудитория", channel: "Канал", content_type: "Тип материала", planned_date: "Дата публикации", external_url: "Ссылка", members_count: "Участников", next_activity_at: "Следующая активность", start_date: "Дата старта", level: "Уровень", track: "Трек", category: "Категория", ring: "Кольцо", change_state: "Изменение", version: "Версия", public_url: "Публичная ссылка", context: "Контекст", options: "Варианты", reason: "Почему", consequences: "Последствия", situation: "Ситуация", problem: "Проблема", actions: "Действия", result: "Результат", what_worked: "Что сработало", what_failed: "Что не сработало", reusable_solution: "Готовое решение"
};

export function moduleCopy(module: ModuleKey) {
  return moduleNames[module] ?? { label: getModule(module)?.label ?? "Раздел", singular: "запись", description: getModule(module)?.description ?? "" };
}

export function ru(value: unknown): string {
  const key = String(value ?? "");
  return values[key] ?? key;
}

export function fieldLabel(field: FieldConfig | string): string {
  const key = typeof field === "string" ? field : field.key;
  return fieldNames[key] ?? (typeof field === "string" ? field : field.label);
}

export function localizeOptions(options: string[] | undefined): Array<{ value: string; label: string }> {
  return (options ?? []).map((value) => ({ value, label: ru(value) }));
}

export function formatDateRu(value: unknown, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }): string {
  if (!value) return "—";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat("ru-RU", options).format(date);
}

export function formatRelativeRu(value: unknown, now = new Date()): string {
  if (!value) return "нет даты";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  const days = Math.round((date.getTime() - now.getTime()) / 86_400_000);
  if (days === 0) return "сегодня";
  if (days === 1) return "завтра";
  if (days === -1) return "вчера";
  return new Intl.RelativeTimeFormat("ru-RU", { numeric: "auto" }).format(days, "day");
}

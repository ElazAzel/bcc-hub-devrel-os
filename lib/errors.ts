type ErrorLike = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

function errorLike(error: unknown): ErrorLike {
  if (error && typeof error === "object") return error as ErrorLike;
  return { message: typeof error === "string" ? error : "" };
}

export function getDataErrorMessage(error: unknown): string {
  const value = errorLike(error);
  const code = String(value.code ?? "");
  const message = String(value.message ?? error ?? "");
  const context = `${code} ${message} ${value.details ?? ""} ${value.hint ?? ""}`;

  if (code === "PGRST205" || /could not find (the )?(table|function) public\./i.test(context) || /relation .* does not exist/i.test(context)) {
    return "Облачная база ещё не подготовлена. Примени миграции Supabase и повтори попытку.";
  }
  if (code === "23505" || /duplicate key|already exists/i.test(context)) {
    return "Такая запись уже существует. Проверь данные и повтори попытку.";
  }
  if (code === "23503" || /foreign key|violates .* constraint/i.test(context)) {
    return "Не удалось сохранить связь. Сначала создай связанную запись.";
  }
  if (/invalid login credentials|invalid credentials/i.test(context)) {
    return "Неверная почта или пароль.";
  }
  if (/jwt|not authenticated|unauthorized|invalid.*token/i.test(context)) {
    return "Сессия истекла. Войди снова.";
  }
  if (/aborterror|failed to fetch|networkerror|fetch failed|timeout/i.test(context)) {
    return "Не удалось связаться с облаком. Проверь подключение и повтори попытку.";
  }
  return message || "Не удалось выполнить операцию. Повтори попытку.";
}

export function toDataError(error: unknown): Error {
  return new Error(getDataErrorMessage(error));
}

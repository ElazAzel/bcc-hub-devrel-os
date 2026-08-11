"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ru">
      <body>
        <main className="flex min-h-screen items-center justify-center bg-[#FBF9FF] p-6">
          <div className="max-w-md rounded-3xl border border-[#E9E3F0] bg-white p-8 text-center shadow-lg" role="alert">
            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8934F9]">Ошибка приложения</div>
            <h1 className="mt-2 text-2xl font-semibold text-[#17131F]">Не удалось открыть DevRel OS</h1>
            <p className="mt-3 text-sm leading-6 text-[#74747C]">Обнови страницу или повтори попытку. Если проблема связана с сетью, введённые данные не считаются сохранёнными.</p>
            <button className="mt-6 min-h-11 rounded-xl bg-[#6F24D9] px-5 font-semibold text-white" onClick={reset}>Повторить</button>
          </div>
        </main>
      </body>
    </html>
  );
}

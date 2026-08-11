"use client";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[#FBF9FF] p-6"><div className="surface max-w-md p-8 text-center" role="alert"><div className="eyebrow">Ошибка рабочего пространства</div><h1 className="mt-2 text-2xl font-semibold">Не удалось загрузить рабочее пространство</h1><p className="mt-3 text-sm leading-6 text-[#74747C]">Проверь соединение и повтори попытку. Введённые данные сохранятся в форме.</p><button className="button-brand mt-6" onClick={reset}>Повторить</button></div></main>;
}

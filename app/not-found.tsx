import Link from "next/link";

export default function NotFound() { return <main className="flex min-h-screen items-center justify-center bg-[#FBF9FF] p-6"><div className="surface max-w-md p-8 text-center"><div className="text-5xl font-semibold text-bcc-violet">404</div><h1 className="mt-3 text-2xl font-semibold">Страница не найдена</h1><p className="mt-3 text-sm text-[#74747C]">Вернись в рабочее пространство.</p><Link href="/" className="button-brand mt-6">Открыть Dashboard</Link></div></main>; }

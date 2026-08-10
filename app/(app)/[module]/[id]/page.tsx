import { DetailPage } from "@/components/detail-page";
import { getModule, type ModuleKey } from "@/lib/types";

export default async function RecordDetailPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module: moduleParam, id } = await params;
  const module = moduleParam as ModuleKey;
  return getModule(module) ? <DetailPage module={module} id={id} /> : <div className="surface p-8">Страница не найдена</div>;
}

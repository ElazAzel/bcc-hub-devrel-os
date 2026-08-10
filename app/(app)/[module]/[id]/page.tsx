import { DetailPage } from "@/components/detail-page";
import { getModule, type ModuleKey } from "@/lib/types";

export default function RecordDetailPage({ params }: { params: { module: string; id: string } }) {
  const module = params.module as ModuleKey;
  return getModule(module) ? <DetailPage module={module} id={params.id} /> : <div className="surface p-8">Страница не найдена</div>;
}

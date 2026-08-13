import { DetailPage } from "@/components/detail-page";
import { getModule, type ModuleKey } from "@/lib/types";
import { notFound } from "next/navigation";

export default async function RecordDetailPage({ params }: { params: Promise<{ module: string; id: string }> }) {
  const { module: moduleParam, id } = await params;
  const module = moduleParam as ModuleKey;
  if (!getModule(module)) notFound();
  return <DetailPage module={module} id={id} />;
}

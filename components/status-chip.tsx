import { ru } from "@/lib/i18n";

const statusClass: Record<string, string> = {
  Active: "bg-[#E8FBFC] text-[#177479]", Healthy: "bg-[#E8FBFC] text-[#177479]", Done: "bg-[#E8F7ED] text-[#18723B]", Published: "bg-[#E8F7ED] text-[#18723B]", Completed: "bg-[#E8F7ED] text-[#18723B]", Approved: "bg-[#E8F7ED] text-[#18723B]", Critical: "bg-[#FDECEC] text-[#AF3030]", Blocked: "bg-[#FDECEC] text-[#AF3030]", Cancelled: "bg-[#F4F5F8] text-[#74747C]", Archived: "bg-[#F4F5F8] text-[#74747C]", Attention: "bg-[#FFF6DD] text-[#876000]", Waiting: "bg-[#FFF6DD] text-[#876000]", "In Progress": "bg-[#EDE3FF] text-[#4C04A5]", Planning: "bg-[#EDE3FF] text-[#4C04A5]", Review: "bg-[#EDE3FF] text-[#4C04A5]", Adopt: "bg-[#E8F7ED] text-[#18723B]", Trial: "bg-[#E8FBFC] text-[#177479]", Assess: "bg-[#FFF6DD] text-[#876000]", Hold: "bg-[#FDECEC] text-[#AF3030]", Planned: "bg-[#F4F5F8] text-[#74747C]", Overdue: "bg-[#FDECEC] text-[#AF3030]", "At risk": "bg-[#FFF6DD] text-[#876000]", "On track": "bg-[#E8F7ED] text-[#18723B]"
};

export function StatusChip({ value, tone }: { value?: unknown; tone?: "brand" | "neutral" }) {
  const text = String(value ?? "Без статуса");
  return <span className={`chip ${tone === "brand" ? "bg-bcc-lilac text-bcc-deep" : statusClass[text] ?? ""}`}>{ru(text)}</span>;
}

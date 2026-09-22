import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgColor = "bg-teal-50",
  iconColor = "text-teal-600",
}: StatCardProps) {
  return (
    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between">
      <div className="space-y-1">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-[11px] text-slate-400">{subtitle}</p>
      </div>
      <div className={`w-12 h-12 ${iconBgColor} ${iconColor} rounded-2xl flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
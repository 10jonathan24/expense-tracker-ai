"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CATEGORY_STYLES, Expense } from "@/types/expense";
import { formatCurrency } from "@/lib/format";

interface SpendingChartsProps {
  expenses: Expense[];
}

function lastSixMonthKeys(): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("en-US", { month: "short" });
    months.push({ key, label });
  }
  return months;
}

export function SpendingCharts({ expenses }: SpendingChartsProps) {
  const categoryData = useMemo(() => {
    const totals = new Map<string, number>();
    for (const e of expenses) {
      totals.set(e.category, (totals.get(e.category) ?? 0) + e.amount);
    }
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [expenses]);

  const trendData = useMemo(() => {
    const months = lastSixMonthKeys();
    const totals = new Map(months.map((m) => [m.key, 0]));
    for (const e of expenses) {
      const key = e.date.slice(0, 7);
      if (totals.has(key)) {
        totals.set(key, (totals.get(key) ?? 0) + e.amount);
      }
    }
    return months.map((m) => ({ month: m.label, amount: totals.get(m.key) ?? 0 }));
  }, [expenses]);

  const hasData = expenses.length > 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          Spending by Category
        </h3>
        {hasData ? (
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {categoryData.map((entry) => (
                    <Cell
                      key={entry.category}
                      fill={
                        CATEGORY_STYLES[
                          entry.category as keyof typeof CATEGORY_STYLES
                        ]?.chart ?? "#94a3b8"
                      }
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#e2e8f0",
                    fontSize: 13,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartState />
        )}
        {hasData && (
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
            {categoryData.map((entry) => (
              <div key={entry.category} className="flex items-center gap-1.5">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    CATEGORY_STYLES[
                      entry.category as keyof typeof CATEGORY_STYLES
                    ]?.dot
                  }`}
                />
                <span className="text-xs text-slate-500">
                  {entry.category}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          Monthly Trend (last 6 months)
        </h3>
        {hasData ? (
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#94a3b8"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#94a3b8"
                  tickFormatter={(v) => `$${v}`}
                  width={48}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: 8,
                    borderColor: "#e2e8f0",
                    fontSize: 13,
                  }}
                  cursor={{ fill: "#f8fafc" }}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyChartState />
        )}
      </div>
    </div>
  );
}

function EmptyChartState() {
  return (
    <div className="mt-2 flex h-64 items-center justify-center text-sm text-slate-400">
      No expenses to visualize yet.
    </div>
  );
}

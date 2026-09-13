"use client";

import { useMemo } from "react";
import { Expense } from "@/types/expense";
import { formatCurrency } from "@/lib/format";

interface SummaryCardsProps {
  expenses: Expense[];
}

function monthKey(date: string): string {
  return date.slice(0, 7); // yyyy-MM
}

export function SummaryCards({ expenses }: SummaryCardsProps) {
  const stats = useMemo(() => {
    const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0);

    const currentMonth = monthKey(new Date().toISOString());
    const monthExpenses = expenses.filter(
      (e) => monthKey(e.date) === currentMonth
    );
    const monthSpending = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

    const byCategory = new Map<string, number>();
    for (const e of expenses) {
      byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amount);
    }
    let topCategory = "—";
    let topAmount = 0;
    byCategory.forEach((amount, category) => {
      if (amount > topAmount) {
        topCategory = category;
        topAmount = amount;
      }
    });

    const average =
      expenses.length > 0 ? totalSpending / expenses.length : 0;

    return {
      totalSpending,
      monthSpending,
      topCategory,
      topAmount,
      average,
      count: expenses.length,
    };
  }, [expenses]);

  const cards = [
    {
      label: "Total Spending",
      value: formatCurrency(stats.totalSpending),
      hint: `${stats.count} expense${stats.count === 1 ? "" : "s"}`,
    },
    {
      label: "This Month",
      value: formatCurrency(stats.monthSpending),
      hint: new Date().toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    },
    {
      label: "Top Category",
      value: stats.topCategory,
      hint:
        stats.topAmount > 0 ? formatCurrency(stats.topAmount) : "No data yet",
    },
    {
      label: "Average Expense",
      value: formatCurrency(stats.average),
      hint: "Per transaction",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <p className="text-sm font-medium text-slate-500">{card.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 truncate">
            {card.value}
          </p>
          <p className="mt-1 text-xs text-slate-400">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}

import { Expense } from "@/types/expense";
import { todayISO } from "@/lib/format";

function daysAgoISO(days: number): string {
  const d = new Date(todayISO());
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export function buildSeedExpenses(): Expense[] {
  const now = new Date().toISOString();
  const items: Array<[number, number, Expense["category"], string]> = [
    [1, 12.5, "Food", "Coffee and breakfast"],
    [2, 48.2, "Transportation", "Gas fill-up"],
    [3, 89.99, "Shopping", "New running shoes"],
    [5, 15.0, "Entertainment", "Movie tickets"],
    [6, 120.0, "Bills", "Internet bill"],
    [8, 32.75, "Food", "Groceries"],
    [10, 24.0, "Transportation", "Rideshare"],
    [14, 60.0, "Entertainment", "Concert"],
    [18, 200.0, "Bills", "Electricity bill"],
    [21, 45.3, "Shopping", "Clothes"],
    [25, 9.5, "Food", "Lunch"],
    [30, 15.0, "Other", "Miscellaneous"],
  ];

  return items.map(([daysAgo, amount, category, description], index) => ({
    id: `seed-${index}`,
    date: daysAgoISO(daysAgo),
    amount,
    category,
    description,
    createdAt: now,
  }));
}

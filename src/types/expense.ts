export const CATEGORIES = [
  "Food",
  "Transportation",
  "Entertainment",
  "Shopping",
  "Bills",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export interface Expense {
  id: string;
  date: string; // ISO date string (yyyy-MM-dd)
  amount: number;
  category: Category;
  description: string;
  createdAt: string; // ISO timestamp, used for stable sort/tiebreak
}

export type ExpenseInput = Omit<Expense, "id" | "createdAt">;

export const CATEGORY_STYLES: Record<
  Category,
  { badge: string; dot: string; chart: string }
> = {
  Food: {
    badge: "bg-amber-100 text-amber-800",
    dot: "bg-amber-500",
    chart: "#f59e0b",
  },
  Transportation: {
    badge: "bg-blue-100 text-blue-800",
    dot: "bg-blue-500",
    chart: "#3b82f6",
  },
  Entertainment: {
    badge: "bg-purple-100 text-purple-800",
    dot: "bg-purple-500",
    chart: "#a855f7",
  },
  Shopping: {
    badge: "bg-pink-100 text-pink-800",
    dot: "bg-pink-500",
    chart: "#ec4899",
  },
  Bills: {
    badge: "bg-red-100 text-red-800",
    dot: "bg-red-500",
    chart: "#ef4444",
  },
  Other: {
    badge: "bg-slate-100 text-slate-700",
    dot: "bg-slate-500",
    chart: "#64748b",
  },
};

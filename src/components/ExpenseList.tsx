"use client";

import { CATEGORY_STYLES, Expense } from "@/types/expense";
import { formatCurrency, formatDate } from "@/lib/format";

interface ExpenseListProps {
  expenses: Expense[];
  totalCount: number;
  onEdit: (expense: Expense) => void;
  onDelete: (expense: Expense) => void;
}

export function ExpenseList({
  expenses,
  totalCount,
  onEdit,
  onDelete,
}: ExpenseListProps) {
  if (totalCount === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-600">
          No expenses yet
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Add your first expense to start tracking your spending.
        </p>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-medium text-slate-600">
          No expenses match your filters
        </p>
        <p className="mt-1 text-sm text-slate-400">
          Try adjusting the search, category, or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden grid-cols-[110px_130px_1fr_110px_90px] gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-medium uppercase tracking-wide text-slate-400 sm:grid">
        <span>Date</span>
        <span>Category</span>
        <span>Description</span>
        <span className="text-right">Amount</span>
        <span className="text-right">Actions</span>
      </div>
      <ul className="divide-y divide-slate-100">
        {expenses.map((expense) => (
          <li
            key={expense.id}
            className="grid grid-cols-2 gap-2 px-5 py-3.5 sm:grid-cols-[110px_130px_1fr_110px_90px] sm:items-center sm:gap-3"
          >
            <span className="text-sm text-slate-500 sm:text-slate-600">
              {formatDate(expense.date)}
            </span>
            <span>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  CATEGORY_STYLES[expense.category].badge
                }`}
              >
                {expense.category}
              </span>
            </span>
            <span className="col-span-2 text-sm text-slate-800 sm:col-span-1">
              {expense.description}
            </span>
            <span className="text-sm font-semibold text-slate-900 sm:text-right">
              {formatCurrency(expense.amount)}
            </span>
            <span className="flex justify-start gap-1 sm:justify-end">
              <button
                onClick={() => onEdit(expense)}
                aria-label={`Edit ${expense.description}`}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDelete(expense)}
                aria-label={`Delete ${expense.description}`}
                className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.75}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

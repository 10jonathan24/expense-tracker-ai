"use client";

import { FormEvent, useState } from "react";
import { CATEGORIES, Category, Expense, ExpenseInput } from "@/types/expense";
import { todayISO } from "@/lib/format";

interface ExpenseFormProps {
  initial?: Expense;
  onSubmit: (input: ExpenseInput) => void;
  onCancel: () => void;
}

interface FormErrors {
  date?: string;
  amount?: string;
  category?: string;
  description?: string;
}

export function ExpenseForm({ initial, onSubmit, onCancel }: ExpenseFormProps) {
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [amount, setAmount] = useState(
    initial ? String(initial.amount) : ""
  );
  const [category, setCategory] = useState<Category>(
    initial?.category ?? "Food"
  );
  const [description, setDescription] = useState(initial?.description ?? "");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!date) {
      next.date = "Date is required.";
    } else if (date > todayISO()) {
      next.date = "Date cannot be in the future.";
    }

    const amountNum = Number(amount);
    if (!amount.trim()) {
      next.amount = "Amount is required.";
    } else if (Number.isNaN(amountNum) || amountNum <= 0) {
      next.amount = "Enter an amount greater than 0.";
    } else if (amountNum > 1_000_000) {
      next.amount = "Amount seems too large.";
    }

    if (!category) {
      next.category = "Category is required.";
    }

    if (!description.trim()) {
      next.description = "Description is required.";
    } else if (description.trim().length > 120) {
      next.description = "Keep description under 120 characters.";
    }

    return next;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    onSubmit({
      date,
      amount: Math.round(Number(amount) * 100) / 100,
      category,
      description: description.trim(),
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <label
          htmlFor="date"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Date
        </label>
        <input
          id="date"
          type="date"
          value={date}
          max={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
            errors.date
              ? "border-red-400 focus:border-red-400"
              : "border-slate-300 focus:border-indigo-400"
          }`}
        />
        {errors.date && (
          <p className="mt-1 text-xs text-red-600">{errors.date}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="amount"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Amount
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
            $
          </span>
          <input
            id="amount"
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`w-full rounded-lg border pl-7 pr-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
              errors.amount
                ? "border-red-400 focus:border-red-400"
                : "border-slate-300 focus:border-indigo-400"
            }`}
          />
        </div>
        {errors.amount && (
          <p className="mt-1 text-xs text-red-600">{errors.amount}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="category"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Category
        </label>
        <select
          id="category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-400"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="description"
          className="block text-sm font-medium text-slate-700 mb-1"
        >
          Description
        </label>
        <input
          id="description"
          type="text"
          placeholder="e.g. Groceries at Whole Foods"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 ${
            errors.description
              ? "border-red-400 focus:border-red-400"
              : "border-slate-300 focus:border-indigo-400"
          }`}
        />
        {errors.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-500 transition-colors disabled:opacity-60"
        >
          {initial ? "Save changes" : "Add expense"}
        </button>
      </div>
    </form>
  );
}

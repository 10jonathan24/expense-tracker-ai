"use client";

import { useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { SummaryCards } from "@/components/SummaryCards";
import { SpendingCharts } from "@/components/SpendingCharts";
import {
  DEFAULT_FILTERS,
  ExpenseFilters,
  FilterState,
} from "@/components/ExpenseFilters";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseForm } from "@/components/ExpenseForm";
import { Modal } from "@/components/Modal";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ExportHub } from "@/components/ExportHub/ExportHub";
import { ToastStack, ToastState } from "@/components/Toast";
import { useExpenses } from "@/hooks/useExpenses";
import { Expense, ExpenseInput } from "@/types/expense";

export default function Home() {
  const { expenses, isLoaded, addExpense, updateExpense, deleteExpense } =
    useExpenses();
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [formState, setFormState] = useState<
    { mode: "add" } | { mode: "edit"; expense: Expense } | null
  >(null);
  const [pendingDelete, setPendingDelete] = useState<Expense | null>(null);
  const [isExportHubOpen, setIsExportHubOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastState[]>([]);

  function pushToast(message: string, variant: ToastState["variant"] = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }

  const filteredExpenses = useMemo(() => {
    let result = [...expenses];

    if (filters.search.trim()) {
      const query = filters.search.trim().toLowerCase();
      result = result.filter((e) =>
        e.description.toLowerCase().includes(query)
      );
    }

    if (filters.category) {
      result = result.filter((e) => e.category === filters.category);
    }

    if (filters.startDate) {
      result = result.filter((e) => e.date >= filters.startDate);
    }

    if (filters.endDate) {
      result = result.filter((e) => e.date <= filters.endDate);
    }

    result.sort((a, b) => {
      switch (filters.sort) {
        case "date-asc":
          return a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt);
        case "amount-desc":
          return b.amount - a.amount;
        case "amount-asc":
          return a.amount - b.amount;
        case "date-desc":
        default:
          return (
            b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)
          );
      }
    });

    return result;
  }, [expenses, filters]);

  function handleFormSubmit(input: ExpenseInput) {
    if (formState?.mode === "edit") {
      updateExpense(formState.expense.id, input);
      pushToast("Expense updated.");
    } else {
      addExpense(input);
      pushToast("Expense added.");
    }
    setFormState(null);
  }

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteExpense(pendingDelete.id);
    pushToast("Expense deleted.");
    setPendingDelete(null);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header
        onAddExpense={() => setFormState({ mode: "add" })}
        onOpenExportHub={() => setIsExportHubOpen(true)}
        canExport={expenses.length > 0}
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 space-y-6">
        {!isLoaded ? (
          <LoadingState />
        ) : (
          <>
            <SummaryCards expenses={expenses} />
            <SpendingCharts expenses={expenses} />
            <ExpenseFilters filters={filters} onChange={setFilters} />
            <ExpenseList
              expenses={filteredExpenses}
              totalCount={expenses.length}
              onEdit={(expense) => setFormState({ mode: "edit", expense })}
              onDelete={(expense) => setPendingDelete(expense)}
            />
          </>
        )}
      </main>

      {formState && (
        <Modal
          title={formState.mode === "edit" ? "Edit Expense" : "Add Expense"}
          onClose={() => setFormState(null)}
        >
          <ExpenseForm
            initial={
              formState.mode === "edit" ? formState.expense : undefined
            }
            onSubmit={handleFormSubmit}
            onCancel={() => setFormState(null)}
          />
        </Modal>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Delete expense"
          message={`Are you sure you want to delete "${pendingDelete.description}"? This action cannot be undone.`}
          onConfirm={handleConfirmDelete}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      <ExportHub
        isOpen={isExportHubOpen}
        expenses={expenses}
        onClose={() => setIsExportHubOpen(false)}
      />

      <ToastStack toasts={toasts} />
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-slate-200/70" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-72 rounded-xl bg-slate-200/70" />
        <div className="h-72 rounded-xl bg-slate-200/70" />
      </div>
      <div className="h-40 rounded-xl bg-slate-200/70" />
    </div>
  );
}

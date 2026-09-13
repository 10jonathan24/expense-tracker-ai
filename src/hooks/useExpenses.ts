"use client";

import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Expense, ExpenseInput } from "@/types/expense";
import { loadExpenses, saveExpenses } from "@/lib/storage";
import { buildSeedExpenses } from "@/lib/seed";

const SEEDED_FLAG = "expense-tracker:seeded";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = loadExpenses();
    const alreadySeeded = window.localStorage.getItem(SEEDED_FLAG);
    if (stored.length === 0 && !alreadySeeded) {
      const seeded = buildSeedExpenses();
      setExpenses(seeded);
      saveExpenses(seeded);
      window.localStorage.setItem(SEEDED_FLAG, "1");
    } else {
      setExpenses(stored);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveExpenses(expenses);
    }
  }, [expenses, isLoaded]);

  const addExpense = useCallback((input: ExpenseInput) => {
    const expense: Expense = {
      ...input,
      id: uuidv4(),
      createdAt: new Date().toISOString(),
    };
    setExpenses((prev) => [expense, ...prev]);
    return expense;
  }, []);

  const updateExpense = useCallback((id: string, input: ExpenseInput) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...input } : e))
    );
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { expenses, isLoaded, addExpense, updateExpense, deleteExpense };
}

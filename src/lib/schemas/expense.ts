export type ExpenseInput = { amount: number };
export function validateExpenseInput(input: ExpenseInput) { if (!input.amount || input.amount <= 0) throw new Error('Nominal wajib diisi.'); }

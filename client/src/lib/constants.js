export const ORDER_STATUSES = ['awaiting_payment', 'confirmed', 'pending', 'in_cargo', 'arrived', 'delivering', 'delivered'];
export const CARGO_STATUSES = ['pending', 'in_transit', 'arrived', 'completed'];
export const ROLES = ['admin', 'staff'];
export const PRODUCT_STATUSES = ['active', 'inactive'];
export const PRODUCT_STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};
export const EXPENSE_CATEGORIES = [
  'transportation',
  'cargo',
  'packaging',
  'supplies',
  'salary',
  'rent',
  'utilities',
  'other',
];

export const EXPENSE_CATEGORY_COLORS = {
  transportation: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  cargo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  packaging: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  supplies: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
  salary: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  rent: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  utilities: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  other: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
};

// i18n keys for each status live under `status.order.*` and `status.cargo.*`.
export const orderStatusKey = (s) => `status.order.${s}`;
export const cargoStatusKey = (s) => `status.cargo.${s}`;

// Tailwind classes per status, light + dark. Order and cargo statuses have separate maps
// because they share some words (e.g. "pending" means different things).
export const STATUS_COLORS = {
  awaiting_payment: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  pending: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300', // bought, in hand in Bangkok
  in_cargo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
  arrived: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  delivering: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

export const CARGO_STATUS_COLORS = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-200',
  in_transit: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
  arrived: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};

export const ROLE_LABELS = { admin: 'Admin', staff: 'Staff' };

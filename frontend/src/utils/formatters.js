// ---------- Currency ----------
export const formatCurrency = (amount, currency = '₹') =>
  `${currency}${Number(amount || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ---------- Date ----------
export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatTimeAgo = (date) => {
  if (!date) return '-';
  const now = new Date();
  const then = new Date(date);
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return formatDate(date);
};

export const formatMonth = (month) => {
  if (!month) return '-';
  const [year, m] = month.split('-');
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${months[parseInt(m) - 1]} ${year}`;
};

export const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  }
  return months;
};

// ---------- Name ----------
export const getInitials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// ---------- Constants ----------
export const EXPENSE_CATEGORIES = [
  { value: 'electricity', label: 'Electricity', icon: '⚡', color: '#f59e0b' },
  { value: 'water', label: 'Water', icon: '💧', color: '#3b82f6' },
  { value: 'wifi', label: 'Wi-Fi', icon: '📶', color: '#8b5cf6' },
  { value: 'gas', label: 'Gas', icon: '🔥', color: '#ef4444' },
  { value: 'groceries', label: 'Groceries', icon: '🛒', color: '#10b981' },
  { value: 'maintenance', label: 'Maintenance', icon: '🔧', color: '#6b7280' },
  { value: 'maid', label: 'Maid', icon: '🧹', color: '#ec4899' },
  { value: 'internet', label: 'Internet', icon: '🌐', color: '#06b6d4' },
  { value: 'other', label: 'Other', icon: '📦', color: '#94a3b8' },
];

export const getCategoryInfo = (value) =>
  EXPENSE_CATEGORIES.find((c) => c.value === value) ||
  EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];

export const SPLIT_TYPES = [
  { value: 'equal', label: 'Equal Split' },
  { value: 'percentage', label: 'By Percentage' },
  { value: 'custom', label: 'Custom Amount' },
];

export const ROLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
];

export const PAYMENT_STATUSES = [
  { value: 'pending', label: 'Pending', badge: 'badge-orange' },
  { value: 'paid', label: 'Paid', badge: 'badge-green' },
  { value: 'overdue', label: 'Overdue', badge: 'badge-red' },
];

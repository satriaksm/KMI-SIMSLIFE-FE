export const formatNumber = (num) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "jt";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "rb";
  }
  return num.toString();
};

export const formatPrice = (min, max) => {
  if (max === undefined || max === null) {
    max = min;
  }
  const formatter = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formatCompact = (num) => {
    if (num >= 1000000000) {
      return "Rp " + (num / 1000000000).toFixed(1) + "M";
    }
    if (num >= 1000000) {
      return "Rp " + (num / 1000000).toFixed(1) + "jt";
    }
    return formatter.format(num);
  };

  if (min === max) {
    return formatCompact(min);
  }

  return `${formatCompact(min)} - ${formatCompact(max)}`;
};

export const formatPercent = (value) => {
  // Hilangkan .0 jika bilangan bulat
  return `${parseFloat(value) % 1 === 0 ? parseInt(value) : value}%`;
};

export const formatDateID = (dateStr) => {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date)) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};
export const formatIDR = (value) => {
  return Number(value || 0).toLocaleString('id-ID');
};

export const formatDateLong = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return '-';
  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const formatTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date)) return '-';
  return date.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

export function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
export const safePercentage = (value: number, total: number) =>
  total === 0 ? 0 : Math.round((value / total) * 1000) / 10;

export const normalizeChoiceLabel = (value: string) =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

export const formatISODate = (value?: string) => {
  if (!value) return undefined;
  return new Date(value).toISOString();
};

export const groupBy = <T, K extends string | number>(
  items: T[],
  picker: (item: T) => K,
) => {
  return items.reduce<Record<K, T[]>>((acc, item) => {
    const key = picker(item);
    acc[key] = acc[key] ?? [];
    acc[key].push(item);
    return acc;
  }, {} as Record<K, T[]>);
};

export const average = (values: number[]) => {
  if (!values.length) return 0;
  const sum = values.reduce((total, val) => total + val, 0);
  return Math.round((sum / values.length) * 10) / 10;
};

export const median = (values: number[]) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
};

export const topWords = (sentences: string[], limit = 5) => {
  const blacklist = new Set([
    "les",
    "des",
    "avec",
    "plus",
    "pour",
    "une",
    "vos",
    "nos",
    "est",
    "sur",
  ]);
  const freq: Record<string, number> = {};

  sentences.forEach((sentence) => {
    sentence
      .toLowerCase()
      .replace(/[.,;:!?]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 3 && !blacklist.has(word))
      .forEach((word) => {
        freq[word] = (freq[word] ?? 0) + 1;
      });
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
};


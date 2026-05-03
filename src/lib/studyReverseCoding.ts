const STUDY_REVERSE_ITEMS = new Set(["C5", "C6", "CF3", "CL1", "CL3", "US3", "GOV1"]);

export function isStudyReverseItem(itemKey: string): boolean {
  return STUDY_REVERSE_ITEMS.has(itemKey.trim().toUpperCase());
}

export function applyStudyReverse(itemKey: string, value: number): number {
  const key = itemKey.trim().toUpperCase();
  if (!STUDY_REVERSE_ITEMS.has(key)) return value;
  if (value >= 1 && value <= 7) return 8 - value;
  return value;
}

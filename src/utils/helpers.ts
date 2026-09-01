export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN');
}

export function getCurrentTimestamp(): string {
  return new Date().toISOString();
}

export function getSectionFileName(sectionName: string): string {
  return sectionName.replace(/\s+/g, '_').toUpperCase();
}

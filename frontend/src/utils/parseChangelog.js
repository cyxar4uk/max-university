/**
 * Парсит Markdown CHANGELOG в массив релизов для экрана «Что нового».
 * Формат: ## version - title, затем список пунктов (- или *).
 * @param {string} md - сырой текст CHANGELOG.md
 * @returns {Array<{ version: string, title: string, date?: string, items: string[] }>}
 */
export function parseChangelog(md) {
  if (!md || typeof md !== 'string') return [];
  const blocks = md.split(/\n##\s+/).filter(Boolean);
  const result = [];
  for (const block of blocks) {
    const firstLine = block.split('\n')[0] || '';
    const rest = block.slice(firstLine.length).trim();
    const match = firstLine.match(/^(.+?)(?:\s*-\s*(.+))?$/);
    const version = (match && match[1].trim()) || firstLine;
    const title = (match && match[2] && match[2].trim()) || '';
    const dateMatch = version.match(/\d{2}\.\d{2}\.\d{4}/);
    const date = dateMatch ? dateMatch[0] : undefined;
    const items = rest
      .split('\n')
      .filter((s) => /^\s*[-*]\s+/.test(s))
      .map((s) => s.replace(/^\s*[-*]\s+/, '').trim())
      .filter(Boolean);
    if (version.toLowerCase().includes('changelog')) continue;
    result.push({ version, title, date, items });
  }
  return result;
}

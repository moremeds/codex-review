import { readFile } from 'node:fs/promises';

export function fillTemplate(
  templateContent: string,
  vars: Record<string, string>,
): string {
  return templateContent.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return key in vars ? vars[key] : match;
  });
}

export async function loadTemplate(templatePath: string): Promise<string> {
  return readFile(templatePath, 'utf-8');
}

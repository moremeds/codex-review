import { describe, it, expect } from 'vitest';
import { fillTemplate } from '../src/template.js';

describe('fillTemplate', () => {
  it('replaces all placeholders with values', () => {
    const tmpl = 'Hello {{name}}, you are {{role}}.';
    const result = fillTemplate(tmpl, { name: 'Alice', role: 'admin' });
    expect(result).toBe('Hello Alice, you are admin.');
  });

  it('leaves unknown placeholders as-is', () => {
    const tmpl = '{{known}} and {{unknown}}';
    const result = fillTemplate(tmpl, { known: 'yes' });
    expect(result).toBe('yes and {{unknown}}');
  });

  it('handles multiple occurrences of same placeholder', () => {
    const tmpl = '{{x}} then {{x}} again';
    const result = fillTemplate(tmpl, { x: 'val' });
    expect(result).toBe('val then val again');
  });

  it('handles empty string value', () => {
    const tmpl = 'before {{x}} after';
    const result = fillTemplate(tmpl, { x: '' });
    expect(result).toBe('before  after');
  });
});

import { describe, it, expect } from 'vitest';
import { DomainCatalog } from '../../../application/domain/valueobjects/DomainCatalog';

class FakeCatalog extends DomainCatalog {
  constructor(code: string, name: string, description: string) {
    super(code, name, description);
  }
}

describe('DomainCatalog', () => {
  it('exposes code, name and description', () => {
    const c = new FakeCatalog('CODE', 'Name', 'Description');
    expect(c.code).toBe('CODE');
    expect(c.name).toBe('Name');
    expect(c.description).toBe('Description');
  });

  it('compares equality by value (code)', () => {
    const a = new FakeCatalog('A', 'Alpha', 'd1');
    const b = new FakeCatalog('A', 'Beta', 'd2');
    const c2 = new FakeCatalog('B', 'Alpha', 'd1');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(a)).toBe(true);
    expect(a.equals(c2)).toBe(false);
    expect(a.equals(null)).toBe(false);
    expect(a.equals(undefined)).toBe(false);
    expect(a.equals('A')).toBe(false);
    expect(a.equals(new FakeCatalog('A', 'x', 'y'))).toBe(true);
  });

  it('provides string representation', () => {
    const c = new FakeCatalog('C', 'Charlie', 'd');
    expect(c.toString()).toBe('Charlie (C)');
  });
});
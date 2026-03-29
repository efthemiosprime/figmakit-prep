import { describe, it, expect } from 'vitest';
import { NODE_ROLES } from '../../src/shared/types';
import type { NodeRole, ConfidenceSource } from '../../src/shared/types';

describe('NODE_ROLES', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(NODE_ROLES)).toBe(true);
    expect(NODE_ROLES.length).toBeGreaterThan(0);
  });

  it('includes all core roles', () => {
    const expectedRoles: NodeRole[] = [
      'text', 'heading', 'image', 'icon', 'button',
      'divider', 'spacer', 'wrapper',
      'section', 'row', 'column', 'container', 'group',
      'flex-row', 'flex-col',
      'card', 'hero', 'feature', 'cta', 'testimonial',
      'accordion', 'tabs', 'modal', 'gallery',
      'background-shape', 'mask', 'invisible',
      'unknown',
    ];
    for (const role of expectedRoles) {
      expect(NODE_ROLES, `Missing role: ${role}`).toContain(role);
    }
  });

  it('has no duplicates', () => {
    const unique = new Set(NODE_ROLES);
    expect(unique.size).toBe(NODE_ROLES.length);
  });
});

describe('type definitions compile correctly', () => {
  it('NodeRole accepts valid roles', () => {
    const roles: NodeRole[] = ['text', 'heading', 'card', 'hero', 'unknown'];
    expect(roles).toHaveLength(5);
  });

  it('ConfidenceSource accepts valid sources', () => {
    const sources: ConfidenceSource[] = [
      'override', 'type', 'role', 'structure', 'token', 'name', 'default',
    ];
    expect(sources).toHaveLength(7);
  });
});

/**
 * Safe accessors for Figma node properties.
 * Figma's sandbox uses ReadonlyArray with Symbol iterators
 * that can throw "cannot convert symbol to number" errors.
 * These helpers wrap all access in try/catch and return plain arrays.
 */

export function safeGetArray(node: any, prop: string): any[] {
  try {
    if (!node) return [];
    var val = node[prop];
    if (!val) return [];
    // Try Array.from first (handles ReadonlyArray with Symbol iterators)
    if (typeof Array.from === 'function') {
      try {
        return Array.from(val);
      } catch (e2) {
        // fallback
      }
    }
    // Fallback: manual copy
    var len = 0;
    try { len = val.length; } catch (e3) { return []; }
    if (typeof len !== 'number' || len <= 0) return [];
    var arr: any[] = [];
    for (var i = 0; i < len; i++) {
      try { arr.push(val[i]); } catch (e4) { break; }
    }
    return arr;
  } catch (e) {
    return [];
  }
}

export function safeGetFills(node: any): any[] {
  return safeGetArray(node, 'fills');
}

export function safeGetStrokes(node: any): any[] {
  return safeGetArray(node, 'strokes');
}

export function safeGetEffects(node: any): any[] {
  return safeGetArray(node, 'effects');
}

export function safeGetChildren(node: any): any[] {
  return safeGetArray(node, 'children');
}

export function safeGetNumber(node: any, prop: string, fallback: number): number {
  try {
    if (!node) return fallback;
    var val = node[prop];
    // Figma returns figma.mixed (a Symbol) for mixed values like cornerRadius
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'symbol') return fallback;
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export function safeGetString(node: any, prop: string, fallback: string): string {
  try {
    if (!node) return fallback;
    var val = node[prop];
    if (typeof val === 'string') return val;
    return fallback;
  } catch (e) {
    return fallback;
  }
}

export function safeGetBoolean(node: any, prop: string, fallback: boolean): boolean {
  try {
    if (!node) return fallback;
    var val = node[prop];
    if (typeof val === 'boolean') return val;
    return fallback;
  } catch (e) {
    return fallback;
  }
}

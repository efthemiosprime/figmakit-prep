/**
 * Mock factories for Figma plugin API types.
 * Each factory returns a plain object matching the Figma node shape,
 * with sensible defaults that can be overridden.
 */

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

// --- Paint & Effect helpers ---

export function mockSolidPaint(overrides: DeepPartial<SolidPaint> = {}): SolidPaint {
  return {
    type: 'SOLID',
    color: { r: 0.5, g: 0.5, b: 0.5 },
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL',
    ...overrides,
  } as SolidPaint;
}

export function mockImagePaint(overrides: DeepPartial<ImagePaint> = {}): ImagePaint {
  return {
    type: 'IMAGE',
    scaleMode: 'FILL',
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL',
    imageHash: 'abc123',
    ...overrides,
  } as ImagePaint;
}

export function mockGradientPaint(overrides: DeepPartial<GradientPaint> = {}): GradientPaint {
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [[1, 0, 0], [0, 1, 0]],
    gradientStops: [
      { position: 0, color: { r: 0, g: 0, b: 0, a: 1 } },
      { position: 1, color: { r: 1, g: 1, b: 1, a: 1 } },
    ],
    opacity: 1,
    visible: true,
    blendMode: 'NORMAL',
    ...overrides,
  } as GradientPaint;
}

export function mockDropShadowEffect(overrides: Partial<DropShadowEffect> = {}): DropShadowEffect {
  return {
    type: 'DROP_SHADOW',
    visible: true,
    color: { r: 0, g: 0, b: 0, a: 0.25 },
    offset: { x: 0, y: 4 },
    radius: 8,
    spread: 0,
    blendMode: 'NORMAL',
    showShadowBehindNode: false,
    ...overrides,
  } as DropShadowEffect;
}

// --- Base node properties ---

function baseNodeProps(type: string, overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id ?? `${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name ?? `${type} 1`,
    type,
    visible: true,
    opacity: 1,
    blendMode: 'PASS_THROUGH',
    removed: false,
    parent: overrides.parent ?? null,
    ...overrides,
  };
}

// --- Node factories ---

export function mockTextNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('TEXT', overrides),
    characters: overrides.characters ?? 'Sample text',
    fontSize: overrides.fontSize ?? 16,
    fontWeight: overrides.fontWeight ?? 400,
    fontName: overrides.fontName ?? { family: 'Inter', style: 'Regular' },
    textCase: overrides.textCase ?? 'ORIGINAL',
    lineHeight: overrides.lineHeight ?? { value: 24, unit: 'PIXELS' },
    letterSpacing: overrides.letterSpacing ?? { value: 0, unit: 'PIXELS' },
    textDecoration: overrides.textDecoration ?? 'NONE',
    textAlignHorizontal: overrides.textAlignHorizontal ?? 'LEFT',
    width: overrides.width ?? 200,
    height: overrides.height ?? 24,
    fills: overrides.fills ?? [mockSolidPaint({ color: { r: 0, g: 0, b: 0 } })],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    children: undefined,
  };
}

export function mockFrameNode(overrides: Record<string, unknown> = {}): any {
  const children = (overrides.children ?? []) as any[];
  const node: any = {
    ...baseNodeProps('FRAME', overrides),
    width: overrides.width ?? 400,
    height: overrides.height ?? 300,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    cornerRadius: overrides.cornerRadius ?? 0,
    clipsContent: overrides.clipsContent ?? false,
    layoutMode: overrides.layoutMode ?? 'NONE',
    primaryAxisSizingMode: overrides.primaryAxisSizingMode ?? 'AUTO',
    counterAxisSizingMode: overrides.counterAxisSizingMode ?? 'AUTO',
    paddingTop: overrides.paddingTop ?? 0,
    paddingRight: overrides.paddingRight ?? 0,
    paddingBottom: overrides.paddingBottom ?? 0,
    paddingLeft: overrides.paddingLeft ?? 0,
    itemSpacing: overrides.itemSpacing ?? 0,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    constraints: overrides.constraints ?? { horizontal: 'MIN', vertical: 'MIN' },
    children,
  };

  // Set parent reference on children
  for (const child of children) {
    child.parent = node;
  }

  return node;
}

export function mockRectangleNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('RECTANGLE', overrides),
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    cornerRadius: overrides.cornerRadius ?? 0,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

export function mockGroupNode(overrides: Record<string, unknown> = {}): any {
  const children = (overrides.children ?? []) as any[];
  const node: any = {
    ...baseNodeProps('GROUP', overrides),
    width: overrides.width ?? 400,
    height: overrides.height ?? 300,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    opacity: overrides.opacity ?? 1,
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children,
  };

  for (const child of children) {
    child.parent = node;
  }

  return node;
}

export function mockLineNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('LINE', overrides),
    width: overrides.width ?? 200,
    height: overrides.height ?? 0,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [mockSolidPaint()],
    effects: overrides.effects ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

export function mockVectorNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('VECTOR', overrides),
    width: overrides.width ?? 24,
    height: overrides.height ?? 24,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

export function mockBooleanOperationNode(overrides: Record<string, unknown> = {}): any {
  const children = (overrides.children ?? []) as any[];
  const node: any = {
    ...baseNodeProps('BOOLEAN_OPERATION', overrides),
    width: overrides.width ?? 24,
    height: overrides.height ?? 24,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    booleanOperation: overrides.booleanOperation ?? 'UNION',
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children,
  };

  for (const child of children) {
    child.parent = node;
  }

  return node;
}

export function mockEllipseNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('ELLIPSE', overrides),
    width: overrides.width ?? 100,
    height: overrides.height ?? 100,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

export function mockComponentNode(overrides: Record<string, unknown> = {}): any {
  const children = (overrides.children ?? []) as any[];
  const node: any = {
    ...baseNodeProps('COMPONENT', overrides),
    width: overrides.width ?? 400,
    height: overrides.height ?? 300,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    cornerRadius: overrides.cornerRadius ?? 0,
    layoutMode: overrides.layoutMode ?? 'NONE',
    paddingTop: overrides.paddingTop ?? 0,
    paddingRight: overrides.paddingRight ?? 0,
    paddingBottom: overrides.paddingBottom ?? 0,
    paddingLeft: overrides.paddingLeft ?? 0,
    itemSpacing: overrides.itemSpacing ?? 0,
    children,
  };

  for (const child of children) {
    child.parent = node;
  }

  return node;
}

export function mockInstanceNode(overrides: Record<string, unknown> = {}): any {
  const children = (overrides.children ?? []) as any[];
  const node: any = {
    ...baseNodeProps('INSTANCE', overrides),
    width: overrides.width ?? 400,
    height: overrides.height ?? 300,
    fills: overrides.fills ?? [],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    cornerRadius: overrides.cornerRadius ?? 0,
    layoutMode: overrides.layoutMode ?? 'NONE',
    paddingTop: overrides.paddingTop ?? 0,
    paddingRight: overrides.paddingRight ?? 0,
    paddingBottom: overrides.paddingBottom ?? 0,
    paddingLeft: overrides.paddingLeft ?? 0,
    itemSpacing: overrides.itemSpacing ?? 0,
    componentProperties: overrides.componentProperties ?? {},
    children,
  };

  for (const child of children) {
    child.parent = node;
  }

  return node;
}

export function mockStarNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('STAR', overrides),
    width: overrides.width ?? 24,
    height: overrides.height ?? 24,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

export function mockPolygonNode(overrides: Record<string, unknown> = {}): any {
  return {
    ...baseNodeProps('POLYGON', overrides),
    width: overrides.width ?? 24,
    height: overrides.height ?? 24,
    fills: overrides.fills ?? [mockSolidPaint()],
    strokes: overrides.strokes ?? [],
    effects: overrides.effects ?? [],
    x: overrides.x ?? 0,
    y: overrides.y ?? 0,
    children: undefined,
  };
}

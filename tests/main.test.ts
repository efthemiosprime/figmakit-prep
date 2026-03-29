import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the figma global before importing main
const mockPostMessage = vi.fn();
const mockShowUI = vi.fn();
const mockOn = vi.fn();
let messageHandler: ((msg: any) => void) | null = null;

const mockSelection: any[] = [];
const mockPageChildren: any[] = [];

const mockNodeStore: Record<string, any> = {};

(globalThis as any).figma = {
  showUI: mockShowUI,
  ui: {
    postMessage: mockPostMessage,
    onmessage: null,
  },
  on: mockOn,
  currentPage: {
    get selection() { return mockSelection; },
    get children() { return mockPageChildren; },
  },
  getNodeByIdAsync: vi.fn(async (id: string) => mockNodeStore[id] || null),
};

// We need __html__ for the showUI call
(globalThis as any).__html__ = '<html></html>';

import {
  mockTextNode,
  mockFrameNode,
  mockRectangleNode,
  mockVectorNode,
  mockSolidPaint,
  mockImagePaint,
} from './helpers/figma-mock';

// Import the handler setup function
import { setupMessageHandler, handleMessage } from '../src/main';

describe('plugin entry', () => {
  beforeEach(() => {
    mockPostMessage.mockClear();
    mockShowUI.mockClear();
    mockOn.mockClear();
    mockSelection.length = 0;
    mockPageChildren.length = 0;
    // Clear node store
    for (var key in mockNodeStore) { delete mockNodeStore[key]; }
  });

  describe('initialization', () => {
    it('exports setupMessageHandler', () => {
      expect(typeof setupMessageHandler).toBe('function');
    });

    it('exports handleMessage', () => {
      expect(typeof handleMessage).toBe('function');
    });
  });

  describe('handleMessage', () => {
    describe('scan messages', () => {
      it('handles scan for cleaner and posts results', () => {
        const node = mockFrameNode({
          visible: false,
          children: [mockTextNode()],
        });
        mockSelection.push(node);

        handleMessage({ type: 'scan', feature: 'cleaner' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('scan-result');
        expect(response.feature).toBe('cleaner');
        expect(response.data.removable).toBeDefined();
        expect(response.data.flattenable).toBeDefined();
        expect(response.data.safe).toBeDefined();
      });

      it('handles scan for renamer and posts results', () => {
        const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
        mockSelection.push(node);

        handleMessage({ type: 'scan', feature: 'renamer' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('scan-result');
        expect(response.feature).toBe('renamer');
        expect(response.data.actions).toBeDefined();
        expect(Array.isArray(response.data.actions)).toBe(true);
        expect(response.data.tree).toBeDefined();
      });

      it('handles scan for validator and posts report', () => {
        const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
        mockSelection.push(node);

        handleMessage({ type: 'scan', feature: 'validator' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('scan-result');
        expect(response.feature).toBe('validator');
        expect(response.data.high).toBeDefined();
        expect(response.data.needsReview).toBeDefined();
        expect(response.data.low).toBeDefined();
        expect(response.data.skipped).toBeDefined();
      });

      it('handles scan for tokens and posts token data', () => {
        const node = mockFrameNode({
          paddingTop: 16, paddingRight: 24,
          paddingBottom: 16, paddingLeft: 24,
          itemSpacing: 12,
          cornerRadius: 8,
          fills: [mockSolidPaint({ color: { r: 0.1, g: 0.1, b: 0.18 } })],
          children: [mockTextNode()],
        });
        mockSelection.push(node);

        handleMessage({ type: 'scan', feature: 'tokens' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('scan-result');
        expect(response.feature).toBe('tokens');
        expect(response.data.tokens).toBeDefined();
        expect(response.data.formatted).toBeDefined();
      });

      it('handles scan for bem and posts BEM mappings', () => {
        const children = [
          mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
          mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
          mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
        ];
        const node = mockFrameNode({
          name: 'Frame 47',
          width: 350, height: 400,
          children,
        });
        mockSelection.push(node);

        handleMessage({ type: 'scan', feature: 'bem' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('scan-result');
        expect(response.feature).toBe('bem');
        expect(Array.isArray(response.data)).toBe(true);
      });
    });

    describe('apply messages', () => {
      it('handles apply for cleaner', async () => {
        const node = mockFrameNode({ visible: false, children: [mockTextNode()] });
        node.remove = vi.fn();
        mockNodeStore[node.id] = node;
        mockSelection.push(node);

        await handleMessage({
          type: 'apply',
          feature: 'cleaner',
          actions: [{ nodeId: node.id, action: 'remove' }],
        });

        expect(node.remove).toHaveBeenCalled();
        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('apply-result');
        expect(response.feature).toBe('cleaner');
        expect(response.data.removed).toBe(1);
      });

      it('handles apply for renamer', async () => {
        const node = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
        mockNodeStore[node.id] = node;
        mockSelection.push(node);

        await handleMessage({
          type: 'apply',
          feature: 'renamer',
          actions: [
            { nodeId: node.id, suggestedName: 'text' },
          ],
        });

        expect(node.name).toBe('text');
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('apply-result');
        expect(response.data).toBe(1);
      });

      it('handles apply for labeler', () => {
        const node = mockTextNode({ name: 'My Text', fontSize: 16, fontWeight: 400 });
        mockSelection.push(node);

        handleMessage({
          type: 'apply',
          feature: 'labeler',
          role: 'text',
          mode: 'prefix',
        });

        expect(node.name).toBe('[fk:text] My Text');
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('apply-result');
        expect(response.feature).toBe('labeler');
      });

      it('handles apply for bem', () => {
        const children = [
          mockRectangleNode({ name: 'Rectangle 1', fills: [mockImagePaint()], width: 300, height: 200 }),
          mockTextNode({ name: 'Text 1', fontSize: 24, fontWeight: 700 }),
          mockTextNode({ name: 'Text 2', fontSize: 16, fontWeight: 400 }),
        ];
        const node = mockFrameNode({
          name: 'Frame 47',
          width: 350, height: 400,
          children,
        });
        mockSelection.push(node);

        handleMessage({
          type: 'apply',
          feature: 'bem',
          includeModifiers: false,
        });

        expect(children[0].name).toBe('card__image');
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('apply-result');
        expect(response.feature).toBe('bem');
      });
    });

    describe('selection handling', () => {
      it('uses page children when selection is empty', () => {
        const pageChild = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
        mockPageChildren.push(pageChild);
        // selection is empty

        handleMessage({ type: 'scan', feature: 'renamer' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.data.actions.length).toBeGreaterThanOrEqual(1);
      });

      it('uses selection when available', () => {
        const selected = mockVectorNode({ name: 'Vector 1', width: 24, height: 24 });
        const pageChild = mockTextNode({ name: 'Frame 1', fontSize: 16, fontWeight: 400 });
        mockSelection.push(selected);
        mockPageChildren.push(pageChild);

        handleMessage({ type: 'scan', feature: 'renamer' });

        const response = mockPostMessage.mock.calls[0][0];
        // Should only analyze the selected node, not page children
        const hasIcon = response.data.actions.some((a: any) => a.suggestedName === 'icon');
        expect(hasIcon).toBe(true);
      });
    });

    describe('error handling', () => {
      it('posts error for unknown feature', () => {
        handleMessage({ type: 'scan', feature: 'nonexistent' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('error');
      });

      it('posts error for unknown message type', () => {
        handleMessage({ type: 'unknown-type' });

        expect(mockPostMessage).toHaveBeenCalledTimes(1);
        const response = mockPostMessage.mock.calls[0][0];
        expect(response.type).toBe('error');
      });
    });
  });
});

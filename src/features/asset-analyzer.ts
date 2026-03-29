import type { AnalysisResult } from '../shared/types';

export interface AssetInfo {
  nodeId: string;
  name: string;
  currentName: string;
  suggestedName: string | null;
  type: 'image' | 'svg' | 'icon' | 'vector';
  format: string;
  width: number;
  height: number;
  hasGoodName: boolean;
  issues: string[];
  context: string;
}

var IMAGE_KEYWORDS = [
  'image', 'img', 'photo', 'thumbnail', 'thumb', 'avatar',
  'logo', 'picture', 'banner', 'cover', 'svg', 'icon',
  'illustration', 'graphic', 'asset',
];

var BAD_FILENAME_CHARS = /[^a-z0-9\-_\.]/gi;

function safeGetSize(node: any, prop: string): number {
  try {
    if (!node) return 0;
    var val = node[prop];
    if (typeof val === 'number' && !isNaN(val)) return val;
    return 0;
  } catch (e) {
    return 0;
  }
}

function hasImageKeyword(name: string): boolean {
  var lower = name.toLowerCase();
  for (var i = 0; i < IMAGE_KEYWORDS.length; i++) {
    if (lower.indexOf(IMAGE_KEYWORDS[i]) >= 0) return true;
  }
  return false;
}

/**
 * Check if a node has an IMAGE type fill.
 * Safely accesses the node's fills array.
 */
function hasImageFill(result: AnalysisResult): boolean {
  // Only true if the classifier already detected this as an image
  // (classifier checks for IMAGE type fills safely)
  if (result.role === 'image') return true;
  return false;
}

function isGenericName(name: string): boolean {
  return /^(Frame|Group|Rectangle|Ellipse|Vector|Boolean|Star|Polygon|Instance|Component)\s*\d*$/i.test(name);
}

function suggestAssetName(result: AnalysisResult, parentName: string): string | null {
  var name = result.name;
  if (hasImageKeyword(name) && !isGenericName(name)) return null;

  var prefix = '';
  if (parentName && !isGenericName(parentName)) {
    prefix = parentName.toLowerCase().replace(/\s+/g, '-').replace(BAD_FILENAME_CHARS, '') + '-';
  }

  if (result.role === 'icon') return prefix + 'icon';
  return prefix + 'image';
}

function getAssetFormat(result: AnalysisResult): string {
  var type = result.type;
  if (type === 'VECTOR' || type === 'BOOLEAN_OPERATION' || type === 'STAR' || type === 'POLYGON') return 'svg';
  if (result.role === 'icon') return 'svg';
  return 'png';
}

function getAssetType(result: AnalysisResult): AssetInfo['type'] {
  var type = result.type;
  var w = safeGetSize(result.node, 'width');
  var h = safeGetSize(result.node, 'height');

  if (type === 'VECTOR' || type === 'BOOLEAN_OPERATION' || type === 'STAR' || type === 'POLYGON') {
    if (w <= 64 && h <= 64) return 'icon';
    return 'vector';
  }
  if (result.role === 'icon') return 'icon';
  if (/^svg$/i.test(result.name)) return 'svg';
  return 'image';
}

function getIssues(name: string): string[] {
  var issues: string[] = [];

  if (isGenericName(name)) {
    issues.push('Generic name \u2014 use a descriptive name like "hero-image" or "product-icon"');
  }

  if (/[A-Z]/.test(name)) {
    issues.push('Uppercase \u2014 use lowercase for consistent filenames');
  }

  if (/\s/.test(name)) {
    issues.push('Spaces \u2014 use hyphens instead (e.g., "hero-image")');
  }

  var cleaned = name.replace(/[\s]/g, '');
  if (BAD_FILENAME_CHARS.test(cleaned)) {
    issues.push('Special characters \u2014 use only letters, numbers, and hyphens');
  }

  if (name.length > 100) {
    issues.push('Name too long \u2014 keep under 100 characters');
  }

  return issues;
}

/**
 * Check if a node is a top-level exportable asset.
 * Looks for containers named as images/icons/logos, nodes with image fills,
 * and standalone vectors that aren't children of an asset container.
 */
function isExportableNode(result: AnalysisResult): boolean {
  var role = result.role;
  var type = result.type;
  var name = result.name;

  // Named as image/icon/logo/svg — this is the exportable parent
  if (hasImageKeyword(name) && !isGenericName(name)) return true;

  // Image role — only if it's a leaf node (no children)
  // Frames with children + image fill are layout containers with backgrounds, not assets
  if (role === 'image' && result.children.length === 0) return true;

  // Frame named SVG
  if (/^svg$/i.test(name)) return true;

  // Standalone vector/shape — only exportable if it's the ONLY child
  // or its parent is not a container (truly standalone).
  // Vectors inside groups/frames with sibling vectors are parts of a compound graphic.
  if (type === 'VECTOR' || type === 'BOOLEAN_OPERATION' || type === 'STAR' || type === 'POLYGON') {
    // Check if this vector has sibling vectors in the same parent
    var parentNode = result.node ? result.node.parent : null;
    if (parentNode) {
      var siblings: any[] = [];
      try { siblings = Array.from(parentNode.children || []); } catch (e) { /* ignore */ }
      var vectorSiblingCount = 0;
      for (var si = 0; si < siblings.length; si++) {
        var sibType = '';
        try { sibType = siblings[si].type || ''; } catch (e2) { /* ignore */ }
        if (sibType === 'VECTOR' || sibType === 'BOOLEAN_OPERATION' || sibType === 'STAR' || sibType === 'POLYGON' || sibType === 'ELLIPSE' || sibType === 'LINE') {
          vectorSiblingCount++;
        }
      }
      // If there are multiple vector siblings, this is part of a compound graphic
      // The parent should be the exportable asset, not individual vectors
      if (vectorSiblingCount > 1) return false;
    }
    return true;
  }

  // Icon role
  if (role === 'icon') return true;

  return false;
}

/**
 * Check if all children (recursively) are only vectors, shapes, or groups of vectors.
 * This means the parent is a single compound graphic asset (logo, icon, illustration).
 */
function allChildrenAreGraphics(result: AnalysisResult): boolean {
  for (var i = 0; i < result.children.length; i++) {
    var child = result.children[i];
    var t = child.type;
    // Vectors and shapes are graphics
    if (t === 'VECTOR' || t === 'BOOLEAN_OPERATION' || t === 'STAR' || t === 'POLYGON' || t === 'ELLIPSE' || t === 'LINE') {
      continue;
    }
    // Groups/frames containing only graphics are also graphics
    if ((t === 'GROUP' || t === 'FRAME' || t === 'COMPONENT' || t === 'INSTANCE') && child.children.length > 0) {
      if (allChildrenAreGraphics(child)) continue;
    }
    // Text or other content = not a pure graphic container
    return false;
  }
  return true;
}

/**
 * Check if a node is an asset container whose children should NOT be listed
 * as separate assets. E.g., "logo" with Vector children — logo is the asset.
 */
function isAssetContainer(result: AnalysisResult): boolean {
  if (result.children.length === 0) return false;

  // Named with image keyword (logo, icon, svg, etc.)
  if (hasImageKeyword(result.name)) return true;

  // SVG container
  if (/^svg$/i.test(result.name)) return true;

  // Icon role with children (icon composed of vectors)
  if (result.role === 'icon') return true;

  // Image role with children
  if (result.role === 'image') return true;

  // Container where ALL children are vectors/shapes/groups of vectors
  // This is a compound graphic (logo, illustration) — export as one asset
  if (allChildrenAreGraphics(result)) return true;

  return false;
}

/**
 * Scan analysis results for exportable assets.
 * When inside an asset container, all descendants are skipped.
 */
export function scanAssets(results: AnalysisResult[], parentName?: string): AssetInfo[] {
  var assets: AssetInfo[] = [];

  function collect(items: AnalysisResult[], ctxParent: string, insideAsset: boolean) {
    for (var i = 0; i < items.length; i++) {
      var result = items[i];

      // If we're inside an asset container, skip everything
      if (insideAsset) continue;

      if (isExportableNode(result)) {
        var suggested = suggestAssetName(result, ctxParent);
        var issues = getIssues(result.name);
        var w = safeGetSize(result.node, 'width');
        var h = safeGetSize(result.node, 'height');

        // Check if this is an asset container (children are part of it)
        var thisIsContainer = isAssetContainer(result);

        assets.push({
          nodeId: result.id,
          name: result.name,
          currentName: result.name,
          suggestedName: suggested,
          type: getAssetType(result),
          format: getAssetFormat(result),
          width: w,
          height: h,
          hasGoodName: issues.length === 0,
          issues: issues,
          context: ctxParent ? 'inside ' + ctxParent : 'standalone',
        });

        // Recurse into children, but mark them as inside an asset if this is a container
        if (result.children.length > 0) {
          var childCtx = isGenericName(result.name) ? ctxParent : result.name;
          collect(result.children, childCtx, thisIsContainer);
        }
        continue;
      }

      // Non-exportable node — recurse into children
      if (result.children.length > 0) {
        var childCtx2 = isGenericName(result.name) ? ctxParent : result.name;
        collect(result.children, childCtx2, false);
      }
    }
  }

  collect(results, parentName || '', false);
  return assets;
}

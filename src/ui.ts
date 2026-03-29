// --- State ---
let currentFeatureData: any = null;
let currentTokenFormat: string = 'css';
let tokenFormatted: Record<string, string> = {};

// --- DOM Helpers ---
const $ = (sel: string) => document.querySelector(sel) as HTMLElement;
const $$ = (sel: string) => document.querySelectorAll(sel);

function post(msg: any) {
  parent.postMessage({ pluginMessage: msg }, '*');
}

function setStatus(text: string) {
  $('#status-text').textContent = text;
}

// --- Tab Switching ---
$$('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.tab').forEach(t => t.classList.remove('active'));
    $$('.panel').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const panelId = `panel-${(tab as HTMLElement).dataset.tab}`;
    $(`#${panelId}`)?.classList.add('active');
  });
});

// --- Token format tabs ---
$$('.token-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.token-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    currentTokenFormat = (tab as HTMLElement).dataset.format ?? 'css';
    if (tokenFormatted[currentTokenFormat]) {
      $('#token-output').textContent = tokenFormatted[currentTokenFormat];
    }
  });
});

// --- Confidence badge ---
function confBadge(confidence: number): string {
  const cls = confidence >= 90 ? 'conf-high' : confidence >= 50 ? 'conf-mid' : 'conf-low';
  return `<span class="result-confidence ${cls}">${confidence}%</span>`;
}

// --- View toggle handler (shared for clean + rename) ---
document.addEventListener('click', function(e) {
  var target = e.target as HTMLElement;
  if (!target.parentElement) return;
  var parentId = target.parentElement.id;

  if (parentId === 'rename-view-toggle') {
    var view = target.dataset.view;
    $$('#rename-view-toggle button').forEach(function(b) { b.classList.remove('active'); });
    target.classList.add('active');
    $('#rename-results').style.display = view === 'tree' ? 'none' : 'block';
    $('#rename-tree').style.display = view === 'tree' ? 'block' : 'none';
  }

  if (parentId === 'clean-view-toggle') {
    var cleanView = target.dataset.view;
    $$('#clean-view-toggle button').forEach(function(b) { b.classList.remove('active'); });
    target.classList.add('active');
    $('#clean-results').style.display = cleanView === 'tree' ? 'none' : 'block';
    $('#clean-tree').style.display = cleanView === 'tree' ? 'block' : 'none';
  }
});

// --- Clean Panel ---
$('#clean-scan').addEventListener('click', () => {
  setStatus('Scanning...');
  post({ type: 'scan', feature: 'cleaner' });
});

$('#clean-apply').addEventListener('click', function() {
  if (!currentFeatureData) return;
  var checked = Array.from($$('#clean-results input[type="checkbox"]:checked'));
  var actions = checked.map(function(cb: any) {
    var idx = parseInt(cb.dataset.index);
    var item = currentFeatureData.all[idx];
    return { nodeId: item.id, action: item.canRemove ? 'remove' : 'flatten' };
  });
  post({ type: 'apply', feature: 'cleaner', actions: actions });
  setStatus('Cleaning...');
});

// --- Rename Panel ---
$('#rename-scan').addEventListener('click', () => {
  setStatus('Scanning...');
  post({ type: 'scan', feature: 'renamer' });
});

$('#rename-apply').addEventListener('click', function() {
  if (!currentFeatureData) return;
  var checked = Array.from($$('#rename-results input[type="checkbox"]:checked'));
  var actions = checked.map(function(cb: any) {
    var idx = parseInt(cb.dataset.index);
    var item = currentFeatureData[idx];
    return { nodeId: item.nodeId, suggestedName: item.suggestedName };
  });
  post({ type: 'apply', feature: 'renamer', actions: actions });
  setStatus('Renaming...');
});

// --- Validate Panel ---
$('#validate-scan').addEventListener('click', () => {
  setStatus('Validating...');
  post({ type: 'scan', feature: 'validator' });
});

// --- Label Panel ---
$('#label-apply').addEventListener('click', () => {
  const role = ($('#label-role') as HTMLSelectElement).value;
  if (!role) return;
  const mode = (document.querySelector('input[name="label-mode"]:checked') as HTMLInputElement)?.value ?? 'prefix';
  post({ type: 'apply', feature: 'labeler', role, mode });
  setStatus('Labeling...');
});

$('#label-remove').addEventListener('click', () => {
  post({ type: 'apply', feature: 'labeler', role: '', mode: 'prefix', remove: true });
  setStatus('Removing labels...');
});

// --- BEM Panel ---
$('#bem-scan').addEventListener('click', () => {
  setStatus('Scanning BEM...');
  post({ type: 'scan', feature: 'bem' });
});

$('#bem-apply').addEventListener('click', () => {
  const includeModifiers = ($('#bem-modifiers') as HTMLInputElement).checked;
  post({ type: 'apply', feature: 'bem', includeModifiers });
  setStatus('Applying BEM...');
});

// --- Assets Panel ---
$('#assets-scan').addEventListener('click', function() {
  setStatus('Scanning assets...');
  post({ type: 'scan', feature: 'assets' });
});

$('#assets-apply').addEventListener('click', function() {
  var inputs = $$('#assets-results .asset-rename input');
  var actions: any[] = [];
  inputs.forEach(function(input: any) {
    var nodeId = input.dataset.nodeId;
    var newName = input.value.trim();
    var original = input.dataset.original;
    if (newName && newName !== original) {
      actions.push({ nodeId: nodeId, newName: newName });
    }
  });
  if (actions.length > 0) {
    post({ type: 'apply', feature: 'assets', actions: actions });
    setStatus('Renaming assets...');
  }
});

// --- Token Panel ---
$('#token-scan').addEventListener('click', function() {
  setStatus('Extracting tokens...');
  post({ type: 'scan', feature: 'tokens' });
});

$('#token-copy').addEventListener('click', () => {
  const text = $('#token-output').textContent ?? '';
  navigator.clipboard?.writeText(text).then(() => {
    const btn = $('#token-copy');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
  });
});

// --- Render functions ---

function renderCleanResults(data: any) {
  var removable = data.removable;
  var flattenable = data.flattenable;
  var safe = data.safe;
  var tree = data.tree || [];
  currentFeatureData = { all: removable.concat(flattenable) };

  $('#clean-summary').style.display = 'flex';
  $('#clean-removable-count').textContent = removable.length;
  $('#clean-flattenable-count').textContent = flattenable.length;
  $('#clean-safe-count').textContent = safe.length;

  // Show view toggle
  $('#clean-view-toggle').style.display = 'flex';

  var container = $('#clean-results');
  if (removable.length === 0 && flattenable.length === 0) {
    container.innerHTML = '<div class="results-empty">No layers to clean</div>';
    ($('#clean-apply') as HTMLButtonElement).disabled = true;
    renderCleanTree(tree);
    return;
  }

  var html = '';
  var allItems = removable.concat(flattenable);
  for (var i = 0; i < allItems.length; i++) {
    var item = allItems[i];
    var action = item.canRemove ? 'Remove' : 'Flatten';
    var actionClass = item.canRemove ? 'tree-remove' : 'tree-flatten';
    html += '<div class="result-item">' +
      '<input type="checkbox" checked data-index="' + i + '">' +
      '<span class="result-name">' + escHtml(item.name) + '</span>' +
      '<span class="result-arrow">&rarr;</span>' +
      '<span class="result-suggested ' + actionClass + '">' + action + '</span>' +
    '</div>';
  }
  container.innerHTML = html;
  ($('#clean-apply') as HTMLButtonElement).disabled = false;

  // Render tree
  renderCleanTree(tree);
}

/**
 * Build a cleaned version of the tree:
 * - Removed nodes (canRemove) are excluded
 * - Flattened nodes (canFlatten) are replaced by their children
 * Only uses flags the analyzer already validated as safe.
 */
function buildCleanedTree(nodes: any[]): any[] {
  var result: any[] = [];
  for (var i = 0; i < nodes.length; i++) {
    var node = nodes[i];
    if (node.canRemove) {
      continue;
    }
    if (node.canFlatten && node.children && node.children.length > 0) {
      var promoted = buildCleanedTree(node.children);
      for (var j = 0; j < promoted.length; j++) {
        result.push(promoted[j]);
      }
      continue;
    }
    var cleaned: any = {
      name: node.displayName || node.name,
      displayName: node.displayName,
      role: node.role,
      canRemove: false,
      canFlatten: false,
      children: node.children ? buildCleanedTree(node.children) : [],
    };
    result.push(cleaned);
  }
  return result;
}

/**
 * Shared tree renderer — renders the final/clean version of the tree
 * into the given container element.
 */
function renderTreeInto(containerId: string, tree: any[]) {
  var treeContainer = $(containerId);
  var cleanedTree = buildCleanedTree(tree);
  var lines: string[] = [];

  function renderNode(node: any, depth: number, prefix: string, isLast: boolean) {
    var indent = '';
    if (depth > 0) {
      indent = prefix + (isLast ? '\u2514\u2500 ' : '\u251C\u2500 ');
    }

    var displayName = node.displayName || node.name;
    var nameHtml = '<span class="tree-keep">' + escHtml(displayName) + '</span>';
    var roleHtml = node.role ? ' <span class="tree-role">(' + node.role + ')</span>' : '';

    lines.push('<span class="tree-indent">' + indent + '</span>' + nameHtml + roleHtml);

    if (node.children && node.children.length > 0) {
      var childPrefix = depth > 0 ? prefix + (isLast ? '   ' : '\u2502  ') : '';
      for (var i = 0; i < node.children.length; i++) {
        renderNode(node.children[i], depth + 1, childPrefix, i === node.children.length - 1);
      }
    }
  }

  for (var i = 0; i < cleanedTree.length; i++) {
    renderNode(cleanedTree[i], 0, '', i === cleanedTree.length - 1);
  }

  treeContainer.innerHTML = lines.map(function(l) { return '<div>' + l + '</div>'; }).join('');
}

function renderCleanTree(tree: any[]) {
  renderTreeInto('#clean-tree', tree);
}

let renameTreeData: any[] = [];

function renderRenameResults(data: any) {
  var actions = data.actions;
  var tree = data.tree;
  currentFeatureData = actions;
  renameTreeData = tree || [];

  $('#rename-summary').style.display = 'flex';
  $('#rename-count').textContent = String(actions.length);

  // Count total layers in tree
  var totalLayers = 0;
  function countNodes(nodes: any[]) {
    for (var i = 0; i < nodes.length; i++) {
      totalLayers++;
      if (nodes[i].children) countNodes(nodes[i].children);
    }
  }
  countNodes(renameTreeData);
  $('#rename-total').textContent = String(totalLayers);

  // Show view toggle
  $('#rename-view-toggle').style.display = 'flex';

  var container = $('#rename-results');
  if (actions.length === 0) {
    container.innerHTML = '<div class="results-empty">No layers to rename — all layers already have semantic names</div>';
    ($('#rename-apply') as HTMLButtonElement).disabled = true;
    renderRenameTree(renameTreeData);
    return;
  }

  var html = '';
  actions.forEach(function(item: any, i: number) {
    html += '<div class="result-item">' +
      '<input type="checkbox" checked data-index="' + i + '">' +
      '<span class="result-name">' + escHtml(item.currentName) + '</span>' +
      '<span class="result-arrow">&rarr;</span>' +
      '<span class="result-suggested">' + escHtml(item.suggestedName) + '</span>' +
      confBadge(item.confidence) +
    '</div>';
  });
  container.innerHTML = html;
  ($('#rename-apply') as HTMLButtonElement).disabled = false;

  // Render tree preview
  renderRenameTree(renameTreeData);
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function renderRenameTree(tree: any[]) {
  // Apply suggestedName as displayName before rendering
  function applyRenames(nodes: any[]): any[] {
    var out: any[] = [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      out.push({
        name: n.name,
        displayName: n.suggestedName || n.name,
        role: n.suggestedName || n.role,
        canRemove: n.canRemove,
        canFlatten: n.canFlatten,
        children: n.children ? applyRenames(n.children) : [],
      });
    }
    return out;
  }
  renderTreeInto('#rename-tree', applyRenames(tree));
}

function renderValidationReport(data: any) {
  $('#validate-empty').style.display = 'none';
  $('#validate-report').style.display = 'block';

  function renderTier(listId: string, countId: string, items: any[]) {
    $(countId).textContent = String(items.length);
    const container = $(listId);
    if (items.length === 0) {
      container.innerHTML = '<div class="results-empty">None</div>';
      return;
    }
    let html = '';
    items.forEach((item: any) => {
      html += `<div class="result-item">
        <span class="result-name">${item.name}</span>
        <span class="result-arrow">&rarr;</span>
        <span class="result-suggested">${item.role}</span>
        ${confBadge(item.confidence)}
      </div>`;
    });
    container.innerHTML = html;
  }

  renderTier('#validate-high-list', '#validate-high-count', data.high);
  renderTier('#validate-mid-list', '#validate-mid-count', data.needsReview);
  renderTier('#validate-low-list', '#validate-low-count', data.low);
  renderTier('#validate-skipped-list', '#validate-skipped-count', data.skipped);
}

function renderBEMResults(data: any[]) {
  const container = $('#bem-results');
  if (data.length === 0) {
    container.innerHTML = '<div class="results-empty">No BEM mappings (select a card, hero, or feature)</div>';
    ($('#bem-apply') as HTMLButtonElement).disabled = true;
    return;
  }

  let html = '';
  data.forEach((item: any) => {
    html += `<div class="result-item">
      <span class="result-name">${item.currentName}</span>
      <span class="result-arrow">&rarr;</span>
      <span class="result-suggested">${item.bemName}</span>
    </div>`;
  });
  container.innerHTML = html;
  ($('#bem-apply') as HTMLButtonElement).disabled = false;
}

function renderAssetResults(data: any[]) {
  $('#assets-summary').style.display = 'flex';
  var withIssues = data.filter(function(a: any) { return !a.hasGoodName; });
  $('#assets-total').textContent = String(data.length);
  $('#assets-issues').textContent = String(withIssues.length);
  $('#assets-ok').textContent = String(data.length - withIssues.length);

  var container = $('#assets-results');
  if (data.length === 0) {
    container.innerHTML = '<div class="results-empty">No exportable assets found</div>';
    ($('#assets-apply') as HTMLButtonElement).disabled = true;
    return;
  }

  var html = '';
  for (var i = 0; i < data.length; i++) {
    var asset = data[i];
    var typeClass = 'asset-type-' + asset.format;
    var itemClass = asset.hasGoodName ? 'asset-good' : 'asset-bad';
    var editValue = asset.suggestedName || asset.name;

    // Format dimensions (rounded)
    var w = Math.round(asset.width || 0);
    var h = Math.round(asset.height || 0);
    var sizeStr = '';
    if (w > 0 && h > 0) {
      sizeStr = w + ' &times; ' + h + 'px';
    }

    html += '<div class="asset-item ' + itemClass + '">';
    html += '<div class="asset-header">';

    // Preview thumbnail — will be filled after render
    var previewId = 'asset-preview-' + i;
    if (asset.preview && Array.isArray(asset.preview)) {
      html += '<img class="asset-preview" id="' + previewId + '" src="" alt="' + escHtml(asset.name) + '">';
    } else {
      html += '<div class="asset-preview-placeholder">' + asset.format.toUpperCase() + '</div>';
    }

    html += '<div class="asset-info">';
    html += '<div style="display:flex;align-items:center;gap:6px">';
    html += '<span class="asset-type ' + typeClass + '">' + asset.format.toUpperCase() + '</span>';
    html += '<span class="result-name">' + escHtml(asset.name) + '</span>';
    html += '</div>';
    if (sizeStr) {
      html += '<div class="asset-size"><span class="asset-size-value">' + sizeStr + '</span></div>';
    }
    html += '</div>'; // .asset-info
    html += '</div>'; // .asset-header

    if (asset.context) {
      html += '<div class="asset-context">' + escHtml(asset.context) + '</div>';
    }

    if (asset.issues.length > 0) {
      html += '<div class="asset-issues">';
      for (var j = 0; j < asset.issues.length; j++) {
        html += (j > 0 ? '<br>' : '') + '&#x26A0; ' + escHtml(asset.issues[j]);
      }
      html += '</div>';
    }

    if (!asset.hasGoodName) {
      html += '<div class="asset-rename">';
      html += '<span style="color:#6b7280;font-size:10px">Rename:</span>';
      html += '<input type="text" value="' + escHtml(editValue) + '" data-node-id="' + asset.nodeId + '" data-original="' + escHtml(asset.name) + '">';
      html += '</div>';
    }

    html += '</div>';
  }

  container.innerHTML = html;
  ($('#assets-apply') as HTMLButtonElement).disabled = withIssues.length === 0;

  // Set preview images from byte arrays → blob URLs
  for (var pi = 0; pi < data.length; pi++) {
    var pAsset = data[pi];
    if (pAsset.preview && Array.isArray(pAsset.preview)) {
      var imgEl = document.getElementById('asset-preview-' + pi) as HTMLImageElement;
      if (imgEl) {
        try {
          var uint8 = new Uint8Array(pAsset.preview);
          var blob = new Blob([uint8], { type: 'image/png' });
          imgEl.src = URL.createObjectURL(blob);
        } catch (e) {
          // ignore
        }
      }
    }
  }
}

function renderTokens(data: any) {
  if (!data.tokens) {
    $('#token-output').textContent = 'No tokens found. Select a node with styles.';
    return;
  }
  tokenFormatted = data.formatted;
  $('#token-output').textContent = tokenFormatted[currentTokenFormat] ?? '';
}

// --- Message Handler ---
window.onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg) return;

  if (msg.type === 'scan-result') {
    switch (msg.feature) {
      case 'cleaner': renderCleanResults(msg.data); break;
      case 'renamer': renderRenameResults(msg.data); break;
      case 'validator': renderValidationReport(msg.data); break;
      case 'assets': renderAssetResults(msg.data); break;
      case 'tokens': renderTokens(msg.data); break;
      case 'bem': renderBEMResults(msg.data); break;
    }
    setStatus('Scan complete');
  } else if (msg.type === 'apply-result') {
    setStatus(`Applied: ${msg.feature}`);
    // Re-enable buttons
    $$('.btn-primary').forEach(btn => {
      (btn as HTMLButtonElement).disabled = false;
    });
  } else if (msg.type === 'error') {
    setStatus(`Error: ${msg.message}`);
  } else if (msg.type === 'selection-change') {
    $('#status-selection').textContent = msg.count > 0 ? `${msg.count} selected` : 'No selection';
  }
};

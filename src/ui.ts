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

// --- Rename view toggle ---
document.addEventListener('click', function(e) {
  var target = e.target as HTMLElement;
  if (target.parentElement && target.parentElement.id === 'rename-view-toggle') {
    var view = target.dataset.view;
    $$('#rename-view-toggle button').forEach(function(b) { b.classList.remove('active'); });
    target.classList.add('active');
    if (view === 'tree') {
      $('#rename-results').style.display = 'none';
      $('#rename-tree').style.display = 'block';
    } else {
      $('#rename-results').style.display = 'block';
      $('#rename-tree').style.display = 'none';
    }
  }
});

// --- Clean Panel ---
$('#clean-scan').addEventListener('click', () => {
  setStatus('Scanning...');
  post({ type: 'scan', feature: 'cleaner' });
});

$('#clean-apply').addEventListener('click', () => {
  if (!currentFeatureData) return;
  const checked = Array.from($$('#clean-results input[type="checkbox"]:checked'));
  const actions = checked.map((cb: any) => {
    const idx = parseInt(cb.dataset.index);
    const item = currentFeatureData.all[idx];
    return { nodeId: item.id, node: item.node, action: item.canRemove ? 'remove' : 'flatten', reason: item.removeReason ?? 'flatten' };
  });
  post({ type: 'apply', feature: 'cleaner', actions });
  setStatus('Cleaning...');
});

// --- Rename Panel ---
$('#rename-scan').addEventListener('click', () => {
  setStatus('Scanning...');
  post({ type: 'scan', feature: 'renamer' });
});

$('#rename-apply').addEventListener('click', () => {
  if (!currentFeatureData) return;
  const checked = Array.from($$('#rename-results input[type="checkbox"]:checked'));
  const actions = checked.map((cb: any) => {
    const idx = parseInt(cb.dataset.index);
    return currentFeatureData[idx];
  });
  post({ type: 'apply', feature: 'renamer', actions });
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

// --- Token Panel ---
$('#token-scan').addEventListener('click', () => {
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
  const { removable, flattenable, safe } = data;
  currentFeatureData = { all: [...removable, ...flattenable] };

  $('#clean-summary').style.display = 'flex';
  $('#clean-removable-count').textContent = removable.length;
  $('#clean-flattenable-count').textContent = flattenable.length;
  $('#clean-safe-count').textContent = safe.length;

  const container = $('#clean-results');
  if (removable.length === 0 && flattenable.length === 0) {
    container.innerHTML = '<div class="results-empty">No layers to clean</div>';
    ($('#clean-apply') as HTMLButtonElement).disabled = true;
    return;
  }

  let html = '';
  [...removable, ...flattenable].forEach((item: any, i: number) => {
    const action = item.canRemove ? 'Remove' : 'Flatten';
    html += `<div class="result-item">
      <input type="checkbox" checked data-index="${i}">
      <span class="result-name">${item.name}</span>
      <span class="result-arrow">&rarr;</span>
      <span class="result-suggested">${action}</span>
    </div>`;
  });
  container.innerHTML = html;
  ($('#clean-apply') as HTMLButtonElement).disabled = false;
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
  var treeContainer = $('#rename-tree');
  var lines: string[] = [];

  function renderNode(node: any, depth: number, prefix: string, isLast: boolean) {
    var indent = '';
    if (depth > 0) {
      indent = prefix + (isLast ? '└─ ' : '├─ ');
    }

    var nameHtml = '';
    if (node.canRemove) {
      nameHtml = '<span class="tree-remove">' + escHtml(node.name) + ' [remove]</span>';
    } else if (node.canFlatten) {
      nameHtml = '<span class="tree-flatten">' + escHtml(node.name) + ' [flatten]</span>';
    } else if (node.suggestedName) {
      nameHtml = '<span class="tree-old">' + escHtml(node.name) + '</span>' +
        ' <span class="tree-indent">&rarr;</span> ' +
        '<span class="tree-new">' + escHtml(node.suggestedName) + '</span>';
    } else {
      nameHtml = '<span class="tree-keep">' + escHtml(node.name) + '</span>';
    }

    // Show role, but if renamed show the new role context instead
    var displayRole = node.role;
    if (node.suggestedName) {
      // Extract implied role from suggested name (e.g., button_label → label)
      if (node.suggestedName.indexOf('button_') === 0) displayRole = node.suggestedName;
      else if (node.suggestedName.indexOf('-') >= 0) displayRole = node.suggestedName;
      else displayRole = node.suggestedName;
    }
    var roleHtml = displayRole ? ' <span class="tree-role">(' + displayRole + ')</span>' : '';

    lines.push('<span class="tree-indent">' + indent + '</span>' + nameHtml + roleHtml);

    if (node.children && node.children.length > 0) {
      var childPrefix = depth > 0 ? prefix + (isLast ? '   ' : '│  ') : '';
      for (var i = 0; i < node.children.length; i++) {
        renderNode(node.children[i], depth + 1, childPrefix, i === node.children.length - 1);
      }
    }
  }

  for (var i = 0; i < tree.length; i++) {
    renderNode(tree[i], 0, '', i === tree.length - 1);
  }

  treeContainer.innerHTML = lines.map(function(l) { return '<div>' + l + '</div>'; }).join('');
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

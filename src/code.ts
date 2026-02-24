figma.showUI(__html__, { width: 420, height: 700 });

// Get layer tree from selected frame
function getLayerTree(node: SceneNode, depth: number): any {
  const layer: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    depth: depth
  };

  // Get styles — guard against figma.mixed (Symbol) values
  try {
    if ('fills' in node) {
      var fills = node.fills;
      if (Array.isArray(fills)) {
        layer.fills = fills.map(function(fill: Paint) {
          if (fill.type === 'SOLID') {
            var color = fill.color;
            var opacity = fill.opacity !== undefined ? fill.opacity : 1;
            return {
              type: 'SOLID',
              color: 'rgba(' + Math.round(color.r * 255) + ', ' + Math.round(color.g * 255) + ', ' + Math.round(color.b * 255) + ', ' + opacity + ')'
            };
          }
          return { type: fill.type };
        });
      }
    }
  } catch (_) {}

  // Get text content — fontSize can be figma.mixed for multi-style text
  if (node.type === 'TEXT') {
    var textNode = node as TextNode;
    layer.characters = textNode.characters;
    var fs = textNode.fontSize;
    if (typeof fs === 'number') {
      layer.fontSize = fs;
    }
  }

  // Get dimensions
  if ('width' in node) {
    layer.width = Math.round(node.width);
    layer.height = Math.round(node.height);
  }

  // Get children — skip any child that fails to parse
  if ('children' in node) {
    var parentNode = node as ChildrenMixin;
    layer.children = [];
    for (var i = 0; i < parentNode.children.length; i++) {
      try {
        layer.children.push(getLayerTree(parentNode.children[i] as SceneNode, depth + 1));
      } catch (_) {}
    }
  }

  return layer;
}

// Handle messages from UI
figma.ui.onmessage = async function(msg) {
  if (msg.type === 'scan-selection') {
    var selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Please select a frame' });
      return;
    }

    var frame = selection[0];
    
    try {
      var layerTree = getLayerTree(frame, 0);
      figma.ui.postMessage({ type: 'layer-tree', data: layerTree });
    } catch (e: any) {
      figma.ui.postMessage({ type: 'error', message: 'Scan failed: ' + (e.message || 'Unknown error') });
    }
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }

  // Storage operations
  if (msg.type === 'storage-get') {
    try {
      const value = await figma.clientStorage.getAsync(msg.key);
      figma.ui.postMessage({ type: 'storage-result', key: msg.key, value: value });
    } catch (e) {
      figma.ui.postMessage({ type: 'storage-result', key: msg.key, value: null });
    }
  }

  if (msg.type === 'storage-set') {
    try {
      await figma.clientStorage.setAsync(msg.key, msg.value);
      figma.ui.postMessage({ type: 'storage-saved', key: msg.key, success: true });
    } catch (e) {
      figma.ui.postMessage({ type: 'storage-saved', key: msg.key, success: false });
    }
  }
};
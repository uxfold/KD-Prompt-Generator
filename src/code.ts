figma.showUI(__html__, { width: 400, height: 600 });

// Get layer tree from selected frame
function getLayerTree(node: SceneNode, depth: number): any {
  const layer: any = {
    id: node.id,
    name: node.name,
    type: node.type,
    depth: depth
  };

  // Get styles if available
  if ('fills' in node && node.fills && Array.isArray(node.fills)) {
    layer.fills = node.fills.map(function(fill: Paint) {
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

  // Get text content
  if (node.type === 'TEXT') {
    var textNode = node as TextNode;
    layer.characters = textNode.characters;
    layer.fontSize = textNode.fontSize;
  }

  // Get dimensions
  if ('width' in node) {
    layer.width = Math.round(node.width);
    layer.height = Math.round(node.height);
  }

  // Get children
  if ('children' in node) {
    var parentNode = node as ChildrenMixin;
    layer.children = parentNode.children.map(function(child) {
      return getLayerTree(child as SceneNode, depth + 1);
    });
  }

  return layer;
}

// Handle messages from UI
figma.ui.onmessage = function(msg) {
  if (msg.type === 'scan-selection') {
    var selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Please select a frame' });
      return;
    }

    var frame = selection[0];
    var layerTree = getLayerTree(frame, 0);
    
    figma.ui.postMessage({ type: 'layer-tree', data: layerTree });
  }

  if (msg.type === 'notify') {
    figma.notify(msg.message);
  }
};
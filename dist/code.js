"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // src/code.ts
  var require_code = __commonJS({
    "src/code.ts"() {
      figma.showUI(__html__, { width: 400, height: 650 });
      function getLayerTree(node, depth) {
        const layer = {
          id: node.id,
          name: node.name,
          type: node.type,
          depth
        };
        if ("fills" in node && node.fills && Array.isArray(node.fills)) {
          layer.fills = node.fills.map(function(fill) {
            if (fill.type === "SOLID") {
              var color = fill.color;
              var opacity = fill.opacity !== void 0 ? fill.opacity : 1;
              return {
                type: "SOLID",
                color: "rgba(" + Math.round(color.r * 255) + ", " + Math.round(color.g * 255) + ", " + Math.round(color.b * 255) + ", " + opacity + ")"
              };
            }
            return { type: fill.type };
          });
        }
        if (node.type === "TEXT") {
          var textNode = node;
          layer.characters = textNode.characters;
          layer.fontSize = textNode.fontSize;
        }
        if ("width" in node) {
          layer.width = Math.round(node.width);
          layer.height = Math.round(node.height);
        }
        if ("children" in node) {
          var parentNode = node;
          layer.children = parentNode.children.map(function(child) {
            return getLayerTree(child, depth + 1);
          });
        }
        return layer;
      }
      figma.ui.onmessage = async function(msg) {
        if (msg.type === "scan-selection") {
          var selection = figma.currentPage.selection;
          if (selection.length === 0) {
            figma.ui.postMessage({ type: "error", message: "Please select a frame" });
            return;
          }
          var frame = selection[0];
          var layerTree = getLayerTree(frame, 0);
          figma.ui.postMessage({ type: "layer-tree", data: layerTree });
        }
        if (msg.type === "notify") {
          figma.notify(msg.message);
        }
        if (msg.type === "storage-get") {
          try {
            const value = await figma.clientStorage.getAsync(msg.key);
            figma.ui.postMessage({ type: "storage-result", key: msg.key, value });
          } catch (e) {
            figma.ui.postMessage({ type: "storage-result", key: msg.key, value: null });
          }
        }
        if (msg.type === "storage-set") {
          try {
            await figma.clientStorage.setAsync(msg.key, msg.value);
            figma.ui.postMessage({ type: "storage-saved", key: msg.key, success: true });
          } catch (e) {
            figma.ui.postMessage({ type: "storage-saved", key: msg.key, success: false });
          }
        }
      };
    }
  });
  require_code();
})();

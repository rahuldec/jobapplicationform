"use client";

import { useState } from "react";
import { Button } from "@/components/ui/primitives";
import {
  SynopsisBuilderConfig,
  Block,
  BlockType,
  createBlock,
  AVAILABLE_FIELDS,
} from "@/lib/synopsis-builder-types";

interface SynopsisVisualBuilderV2Props {
  tenantId: string;
  initialConfig?: SynopsisBuilderConfig | null;
}

const ELEMENT_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: "text", label: "Text", icon: "📝" },
  { type: "image", label: "Image", icon: "🖼️" },
  { type: "table", label: "Table", icon: "📊" },
  { type: "horizontal-line", label: "Divider", icon: "─" },
  { type: "button", label: "Button", icon: "🔘" },
  { type: "section", label: "Section", icon: "📦" },
  { type: "layout-2col", label: "2-Column", icon: "⚡" },
  { type: "layout-3col", label: "3-Column", icon: "⚡" },
  { type: "layout-1col", label: "1-Column", icon: "⚡" },
  { type: "empty", label: "Empty Block", icon: "📭" },
];

type PreviewMode = "html" | "pdf" | "none";

export function SynopsisVisualBuilderV2({
  tenantId,
  initialConfig,
}: SynopsisVisualBuilderV2Props) {
  const [config, setConfig] = useState<SynopsisBuilderConfig>(
    initialConfig || { blocks: [], version: "1.0" }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("none");
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);

  const selectedBlock = config.blocks.find((b) => b.id === selectedBlockId);

  const addBlock = (type: BlockType) => {
    const newBlock = createBlock(type, config.blocks.length);
    setConfig({
      ...config,
      blocks: [...config.blocks, newBlock],
    });
    setSelectedBlockId(newBlock.id);
  };

  const removeBlock = (id: string) => {
    setConfig({
      ...config,
      blocks: config.blocks.filter((b) => b.id !== id),
    });
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
    }
  };

  const moveBlockUp = (id: string) => {
    const idx = config.blocks.findIndex((b) => b.id === id);
    if (idx <= 0) return;
    const newBlocks = [...config.blocks];
    [newBlocks[idx], newBlocks[idx - 1]] = [newBlocks[idx - 1], newBlocks[idx]];
    setConfig({ ...config, blocks: newBlocks });
  };

  const moveBlockDown = (id: string) => {
    const idx = config.blocks.findIndex((b) => b.id === id);
    if (idx >= config.blocks.length - 1) return;
    const newBlocks = [...config.blocks];
    [newBlocks[idx], newBlocks[idx + 1]] = [newBlocks[idx + 1], newBlocks[idx]];
    setConfig({ ...config, blocks: newBlocks });
  };

  const duplicateBlock = (id: string) => {
    const block = config.blocks.find((b) => b.id === id);
    if (!block) return;
    const newBlock = { ...block, id: createBlock(block.type).id };
    const idx = config.blocks.findIndex((b) => b.id === id);
    const newBlocks = [...config.blocks.slice(0, idx + 1), newBlock, ...config.blocks.slice(idx + 1)];
    setConfig({ ...config, blocks: newBlocks });
  };

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setConfig({
      ...config,
      blocks: config.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
  };

  const generatePreview = async () => {
    setPreviewLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/synopsis-builder-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPreviewHtml(data.html);
      setPreviewMode("html");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/synopsis-builder-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, config }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen gap-0 bg-gray-100">
      {/* Left Sidebar - Elements */}
      <div className="w-48 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Elements</h3>
        <div className="space-y-2 flex-1">
          {ELEMENT_TYPES.map((elem) => (
            <button
              key={elem.type}
              onClick={() => addBlock(elem.type)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-50 text-sm font-medium text-gray-700 transition-colors border border-transparent hover:border-blue-200"
            >
              <span className="mr-2">{elem.icon}</span>
              {elem.label}
            </button>
          ))}
        </div>
        <div className="space-y-2 border-t border-gray-200 pt-4">
          <Button
            onClick={generatePreview}
            disabled={previewLoading || config.blocks.length === 0}
            size="sm"
            className="w-full"
            variant={previewMode === "html" ? "primary" : "ghost"}
          >
            {previewLoading ? "Loading..." : "Preview HTML"}
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 bg-white overflow-y-auto p-6 border-r border-gray-200">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Template Blocks</h2>
          {config.blocks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-sm">
                Drag elements from the left to start building your template
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {config.blocks.map((block, idx) => (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer group ${
                    selectedBlockId === block.id
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 bg-gray-50 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-lg">
                        {ELEMENT_TYPES.find((e) => e.type === block.type)?.icon}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {ELEMENT_TYPES.find((e) => e.type === block.type)?.label}
                        </p>
                        {block.properties.content && (
                          <p className="text-xs text-gray-500 truncate max-w-xs">
                            {block.properties.content}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlockUp(block.id);
                        }}
                        className="p-1 hover:bg-gray-300 rounded text-gray-600 text-xs"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveBlockDown(block.id);
                        }}
                        className="p-1 hover:bg-gray-300 rounded text-gray-600 text-xs"
                        title="Move down"
                      >
                        ↓
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          duplicateBlock(block.id);
                        }}
                        className="p-1 hover:bg-gray-300 rounded text-gray-600 text-xs"
                        title="Duplicate"
                      >
                        📋
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeBlock(block.id);
                        }}
                        className="p-1 hover:bg-red-200 rounded text-red-600 text-xs"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-72 bg-white overflow-y-auto border-l border-gray-200 flex flex-col">
        {selectedBlock ? (
          <div className="flex-1 p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Block Properties</h3>

            {selectedBlock.type === "text" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Content
                  </label>
                  <textarea
                    value={selectedBlock.properties.content || ""}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: {
                          ...selectedBlock.properties,
                          content: e.target.value,
                        },
                      })
                    }
                    className="w-full text-xs border border-gray-300 rounded p-2 font-mono"
                    rows={3}
                    placeholder="Enter text or {{fieldName}}"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Font Size
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.properties.fontSize || "14px"}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: {
                          ...selectedBlock.properties,
                          fontSize: e.target.value,
                        },
                      })
                    }
                    className="w-full text-xs border border-gray-300 rounded p-2"
                    placeholder="14px"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === "section" && (
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Section Title
                </label>
                <input
                  type="text"
                  value={selectedBlock.properties.title || ""}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      properties: {
                        ...selectedBlock.properties,
                        title: e.target.value,
                      },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-2"
                  placeholder="e.g., Personal Info"
                />
              </div>
            )}

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600 font-medium mb-2">Quick Insert Fields:</p>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(AVAILABLE_FIELDS)
                  .slice(0, 8)
                  .map(([key]) => (
                    <button
                      key={key}
                      onClick={() => {
                        const currentContent = selectedBlock.properties.content || "";
                        updateBlock(selectedBlock.id, {
                          properties: {
                            ...selectedBlock.properties,
                            content: currentContent + `{{${key}}}`,
                          },
                        });
                      }}
                      className="block w-full text-left px-2 py-1 hover:bg-blue-100 rounded text-xs text-gray-600 font-mono"
                    >
                      {`{{${key}}}`}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-xs text-gray-500">Select a block to edit properties</p>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border-t border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewMode === "html" && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-96 overflow-hidden flex flex-col">
            <div className="bg-gray-100 p-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">HTML Preview</h3>
              <button
                onClick={() => setPreviewMode("none")}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>
            <iframe
              srcDoc={previewHtml}
              className="flex-1 border-0"
              title="Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}

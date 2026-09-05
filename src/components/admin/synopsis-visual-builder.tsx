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

interface SynopsisVisualBuilderProps {
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

export function SynopsisVisualBuilder({
  tenantId,
  initialConfig,
}: SynopsisVisualBuilderProps) {
  const [config, setConfig] = useState<SynopsisBuilderConfig>(
    initialConfig || { blocks: [], version: "1.0" }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const updateBlock = (id: string, updates: Partial<Block>) => {
    setConfig({
      ...config,
      blocks: config.blocks.map((b) => (b.id === id ? { ...b, ...updates } : b)),
    });
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
    <div className="flex h-[800px] gap-4 bg-slate-50 rounded-lg overflow-hidden border border-slate-200">
      {/* Left Sidebar - Elements Palette */}
      <div className="w-48 bg-white border-r border-slate-200 p-4 overflow-y-auto">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Elements</h3>
        <div className="space-y-2">
          {ELEMENT_TYPES.map((elem) => (
            <button
              key={elem.type}
              onClick={() => addBlock(elem.type)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors"
            >
              <span className="mr-2">{elem.icon}</span>
              {elem.label}
            </button>
          ))}
        </div>
      </div>

      {/* Center - Canvas */}
      <div className="flex-1 bg-white overflow-y-auto p-6">
        <div className="space-y-3 max-w-2xl mx-auto">
          {config.blocks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">
                Drag elements from the left to start building your template
              </p>
            </div>
          ) : (
            config.blocks.map((block) => (
              <div
                key={block.id}
                onClick={() => setSelectedBlockId(block.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  selectedBlockId === block.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 bg-slate-50 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-slate-700">
                    {ELEMENT_TYPES.find((e) => e.type === block.type)?.label}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeBlock(block.id);
                    }}
                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                  >
                    Remove
                  </button>
                </div>
                {block.properties.content && (
                  <p className="text-xs text-slate-600 mt-2 truncate">
                    {block.properties.content}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Sidebar - Properties */}
      <div className="w-64 bg-white border-l border-slate-200 p-4 overflow-y-auto">
        {selectedBlock ? (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Properties</h3>

            {selectedBlock.type === "text" && (
              <>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
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
                    className="w-full text-xs border border-slate-300 rounded p-2 font-mono"
                    rows={3}
                    placeholder="Enter text or {{fieldName}}"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
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
                    className="w-full text-xs border border-slate-300 rounded p-2"
                    placeholder="14px"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === "image" && (
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Image Source
                </label>
                <select
                  value={selectedBlock.properties.source || "url"}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      properties: {
                        ...selectedBlock.properties,
                        source: e.target.value as "url" | "field",
                      },
                    })
                  }
                  className="w-full text-xs border border-slate-300 rounded p-2"
                >
                  <option value="url">URL</option>
                  <option value="field">Field</option>
                </select>
              </div>
            )}

            {selectedBlock.type === "section" && (
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
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
                  className="w-full text-xs border border-slate-300 rounded p-2"
                  placeholder="e.g., Personal Info"
                />
              </div>
            )}

            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500 font-medium mb-2">Available Fields:</p>
              <div className="space-y-1 text-xs">
                {Object.entries(AVAILABLE_FIELDS).map(([key, field]) => (
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
                    className="block w-full text-left px-2 py-1 hover:bg-blue-100 rounded text-slate-600"
                  >
                    {`{{${key}}}`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Select a block to edit properties</p>
        )}
      </div>

      {/* Save Button */}
      <div className="absolute bottom-4 right-4 flex gap-2">
        {error && <span className="text-xs text-red-600">{error}</span>}
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save Template"}
        </Button>
      </div>
    </div>
  );
}

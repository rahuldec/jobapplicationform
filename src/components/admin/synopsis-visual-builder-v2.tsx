"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import {
  SynopsisBuilderConfig,
  Block,
  BlockType,
  createBlock,
  AVAILABLE_FIELDS,
} from "@/lib/synopsis-builder-types";

interface FormFieldOption {
  id: string;
  label: string;
  sectionName: string;
}

interface SynopsisVisualBuilderV2Props {
  tenantId: string;
  initialConfig?: SynopsisBuilderConfig | null;
  formFields?: FormFieldOption[];
}

function groupBySection(fields: FormFieldOption[]): Record<string, FormFieldOption[]> {
  const groups: Record<string, FormFieldOption[]> = {};
  for (const field of fields) {
    (groups[field.sectionName] ??= []).push(field);
  }
  return groups;
}

function findBlockById(blocks: Block[], id: string): Block | undefined {
  for (const b of blocks) {
    if (b.id === id) return b;
    if (b.children) {
      const found = findBlockById(b.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

function findParentBlock(blocks: Block[], childId: string): Block | undefined {
  for (const b of blocks) {
    if (b.children?.some((c) => c.id === childId)) return b;
    if (b.children) {
      const found = findParentBlock(b.children, childId);
      if (found) return found;
    }
  }
  return undefined;
}

function updateBlockInList(blocks: Block[], id: string, updates: Partial<Block>): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...updates };
    if (b.children) return { ...b, children: updateBlockInList(b.children, id, updates) };
    return b;
  });
}

function removeBlockFromList(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) => (b.children ? { ...b, children: removeBlockFromList(b.children, id) } : b));
}

const COLUMN_CHILD_TYPES: BlockType[] = ["text", "image", "horizontal-line", "button"];

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

export function SynopsisVisualBuilderV2({
  tenantId,
  initialConfig,
  formFields = [],
}: SynopsisVisualBuilderV2Props) {
  const [config, setConfig] = useState<SynopsisBuilderConfig>(
    initialConfig || { blocks: [], version: "1.0" }
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);
  // The live-preview auto-refresh re-renders this component every ~400ms
  // while typing, and React resets a controlled <textarea>'s cursor to the
  // end on some of those re-renders. Reading `selectionStart` off the live
  // element at click-time is unreliable as a result, so track the selection
  // continuously instead and insert at the last known-good position.
  const lastSelectionRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const selectedBlock = selectedBlockId ? findBlockById(config.blocks, selectedBlockId) : undefined;
  const parentBlock = selectedBlockId ? findParentBlock(config.blocks, selectedBlockId) : undefined;

  useEffect(() => {
    const len = (selectedBlock?.properties.content || "").length;
    lastSelectionRef.current = { start: len, end: len };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlockId]);

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
      blocks: removeBlockFromList(config.blocks, id),
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
      blocks: updateBlockInList(config.blocks, id, updates),
    });
  };

  const addChildBlock = (parentId: string, type: BlockType) => {
    const parent = findBlockById(config.blocks, parentId);
    if (!parent) return;
    const newBlock = createBlock(type, parent.children?.length ?? 0);
    updateBlock(parentId, { children: [...(parent.children ?? []), newBlock] });
    setSelectedBlockId(newBlock.id);
  };

  const trackCursorPos = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    lastSelectionRef.current = {
      start: e.currentTarget.selectionStart,
      end: e.currentTarget.selectionEnd,
    };
  };

  const insertIntoContent = (token: string) => {
    if (!selectedBlock) return;
    const currentContent = selectedBlock.properties.content || "";
    const len = currentContent.length;
    const start = Math.min(lastSelectionRef.current.start, len);
    const end = Math.min(Math.max(lastSelectionRef.current.end, start), len);
    // Replace the selection if there is one (like any normal text editor),
    // otherwise insert at the cursor.
    const newContent = currentContent.slice(0, start) + token + currentContent.slice(end);
    const newPos = start + token.length;
    updateBlock(selectedBlock.id, {
      properties: { ...selectedBlock.properties, content: newContent },
    });
    lastSelectionRef.current = { start: newPos, end: newPos };
    // Clicking the button steals focus from the textarea — restore it and
    // land the cursor right after the inserted token so the field appears
    // where the user was actually typing, not tacked onto the end.
    requestAnimationFrame(() => {
      const el = contentTextareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(newPos, newPos);
    });
  };

  useEffect(() => {
    if (config.blocks.length === 0) {
      setPreviewHtml("");
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setPreviewLoading(true);
      try {
        const res = await fetch("/api/admin/synopsis-builder-preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, formFields }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setPreviewHtml(data.html);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to generate preview");
      } finally {
        setPreviewLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

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
    <div className="flex h-[640px] gap-0 bg-gray-100 overflow-x-auto">
      {/* Left Sidebar - Elements */}
      <div className="w-44 bg-white border-r border-gray-200 p-4 overflow-y-auto flex flex-col shrink-0">
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
            onClick={handleSave}
            disabled={saving}
            size="sm"
            className="w-full bg-orange-600 hover:bg-orange-700"
          >
            {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      {/* Block list + Properties */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto p-4 shrink-0">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Template Blocks</h2>
        <div className="space-y-4">
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-lg shrink-0">
                        {ELEMENT_TYPES.find((e) => e.type === block.type)?.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-700">
                          {ELEMENT_TYPES.find((e) => e.type === block.type)?.label}
                        </p>
                        {block.properties.content && (
                          <p className="text-xs text-gray-500 truncate max-w-[9rem]">
                            {block.properties.content}
                          </p>
                        )}
                        {block.type.startsWith("layout-") && (
                          <p className="text-xs text-gray-500">
                            {block.children?.length ?? 0} item{(block.children?.length ?? 0) === 1 ? "" : "s"}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
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

      {/* Properties */}
      <div className="w-64 bg-white overflow-y-auto border-r border-gray-200 flex flex-col shrink-0">
        {selectedBlock ? (
          <div className="flex-1 p-4 space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Block Properties</h3>

            {parentBlock && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
                This is 1 of {parentBlock.children?.length ?? 1} block
                {(parentBlock.children?.length ?? 1) === 1 ? "" : "s"} in the{" "}
                <button
                  onClick={() => setSelectedBlockId(parentBlock.id)}
                  className="font-semibold underline hover:no-underline"
                >
                  {ELEMENT_TYPES.find((e) => e.type === parentBlock.type)?.label}
                </button>{" "}
                layout above. Each column needs its own block — put one field per block, not
                several fields in one block, or they&apos;ll all land in the same column.
              </div>
            )}

            {selectedBlock.type === "text" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Content
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Type text here. Click a field below to insert it at your cursor — it becomes
                    a real value (e.g. the candidate&apos;s name) in the preview and the PDF.
                  </p>
                  <textarea
                    ref={contentTextareaRef}
                    value={selectedBlock.properties.content || ""}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: {
                          ...selectedBlock.properties,
                          content: e.target.value,
                        },
                      })
                    }
                    onSelect={trackCursorPos}
                    onKeyUp={trackCursorPos}
                    onClick={trackCursorPos}
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
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Section Title
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    A heading shown above this section, e.g. &quot;Personal Info&quot;.
                  </p>
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
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Content
                  </label>
                  <p className="text-xs text-gray-500 mb-1">
                    Text shown below the title. Click a field below to insert it at your cursor.
                  </p>
                  <textarea
                    ref={contentTextareaRef}
                    value={selectedBlock.properties.content || ""}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: {
                          ...selectedBlock.properties,
                          content: e.target.value,
                        },
                      })
                    }
                    onSelect={trackCursorPos}
                    onKeyUp={trackCursorPos}
                    onClick={trackCursorPos}
                    className="w-full text-xs border border-gray-300 rounded p-2 font-mono"
                    rows={3}
                    placeholder="Enter text or {{fieldName}}"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === "image" && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
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
                    className="w-full text-xs border border-gray-300 rounded p-2"
                  >
                    <option value="url">Image URL</option>
                    <option value="field">Candidate Field</option>
                  </select>
                </div>
                {selectedBlock.properties.source === "field" ? (
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Field
                    </label>
                    <select
                      value={selectedBlock.properties.fieldKey || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          properties: {
                            ...selectedBlock.properties,
                            fieldKey: e.target.value as typeof selectedBlock.properties.fieldKey,
                          },
                        })
                      }
                      className="w-full text-xs border border-gray-300 rounded p-2"
                    >
                      <option value="">Select field</option>
                      <option value="logoUrl">Organization Logo</option>
                      <option value="signatureImageUrl">Candidate Signature</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="text-xs font-medium text-gray-700 block mb-1">
                      Image URL
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.properties.imageUrl || ""}
                      onChange={(e) =>
                        updateBlock(selectedBlock.id, {
                          properties: { ...selectedBlock.properties, imageUrl: e.target.value },
                        })
                      }
                      className="w-full text-xs border border-gray-300 rounded p-2"
                      placeholder="https://example.com/logo.png"
                    />
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Max Width
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.properties.maxWidth || "100%"}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: { ...selectedBlock.properties, maxWidth: e.target.value },
                      })
                    }
                    className="w-full text-xs border border-gray-300 rounded p-2"
                    placeholder="100%"
                  />
                </div>
              </>
            )}

            {selectedBlock.type === "button" && (
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Button Label
                </label>
                <input
                  type="text"
                  value={selectedBlock.properties.label || ""}
                  onChange={(e) =>
                    updateBlock(selectedBlock.id, {
                      properties: { ...selectedBlock.properties, label: e.target.value },
                    })
                  }
                  className="w-full text-xs border border-gray-300 rounded p-2"
                  placeholder="e.g., View Application"
                />
              </div>
            )}

            {selectedBlock.type.startsWith("layout-") && (
              <>
                <div>
                  <label className="text-xs font-medium text-gray-700 block mb-1">
                    Column Gap
                  </label>
                  <input
                    type="text"
                    value={selectedBlock.properties.gap || "20px"}
                    onChange={(e) =>
                      updateBlock(selectedBlock.id, {
                        properties: { ...selectedBlock.properties, gap: e.target.value },
                      })
                    }
                    className="w-full text-xs border border-gray-300 rounded p-2"
                    placeholder="20px"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Column Contents</p>
                  <p className="text-xs text-gray-500 mb-2">
                    Blocks fill the columns in order, wrapping to the next row.
                  </p>
                  {(selectedBlock.children ?? []).length === 0 ? (
                    <p className="text-xs text-gray-400 mb-2">No blocks added yet.</p>
                  ) : (
                    <div className="space-y-1 mb-2">
                      {(selectedBlock.children ?? []).map((child) => (
                        <div
                          key={child.id}
                          onClick={() => setSelectedBlockId(child.id)}
                          className={`flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer border ${
                            selectedBlockId === child.id
                              ? "border-blue-400 bg-blue-50"
                              : "border-transparent hover:bg-gray-100"
                          }`}
                        >
                          <span className="truncate">
                            {ELEMENT_TYPES.find((e) => e.type === child.type)?.icon}{" "}
                            {ELEMENT_TYPES.find((e) => e.type === child.type)?.label}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeBlock(child.id);
                            }}
                            className="text-red-500 hover:bg-red-100 rounded px-1 shrink-0"
                            title="Remove"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs font-medium text-gray-700 mb-1">Add to column:</p>
                  <div className="flex gap-1">
                    {COLUMN_CHILD_TYPES.map((t) => (
                      <button
                        key={t}
                        onClick={() => addChildBlock(selectedBlock.id, t)}
                        title={`Add ${ELEMENT_TYPES.find((e) => e.type === t)?.label}`}
                        className="flex-1 border border-gray-300 rounded p-1.5 hover:bg-blue-50 text-sm"
                      >
                        {ELEMENT_TYPES.find((e) => e.type === t)?.icon}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {(selectedBlock.type === "horizontal-line" || selectedBlock.type === "empty") && (
              <p className="text-xs text-gray-500">This block has no configurable properties.</p>
            )}

            {selectedBlock.type === "table" && (
              <p className="text-xs text-gray-500">
                Automatically lists every answered field from the application form, grouped by
                section.
              </p>
            )}

            {(selectedBlock.type === "text" || selectedBlock.type === "section") && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-2">
                  Candidate fields <span className="font-normal text-gray-400">(click to insert)</span>
                </p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {Object.entries(AVAILABLE_FIELDS)
                    .filter(([key]) => key !== "formSections")
                    .map(([key]) => (
                      <button
                        key={key}
                        onClick={() => insertIntoContent(`{{${key}}}`)}
                        className="block w-full text-left px-2 py-1 hover:bg-blue-100 rounded text-xs text-gray-600 font-mono"
                      >
                        {`{{${key}}}`}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {(selectedBlock.type === "text" || selectedBlock.type === "section") && formFields.length > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-600 font-medium mb-2">
                  Application form fields <span className="font-normal text-gray-400">(click to insert)</span>
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {Object.entries(groupBySection(formFields)).map(([sectionName, fields]) => (
                    <div key={sectionName}>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide px-2">
                        {sectionName}
                      </p>
                      {fields.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => insertIntoContent(`{{field_${f.id}}}`)}
                          className="block w-full text-left px-2 py-1 hover:bg-blue-100 rounded text-xs text-gray-600"
                          title={`{{field_${f.id}}}`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* Live Preview */}
      <div className="flex-1 bg-gray-200 flex flex-col min-w-[360px]">
        <div className="px-4 py-2 bg-white border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Live Preview</h3>
            <p className="text-xs text-gray-400">
              Updates automatically as you edit — inserted fields show made-up sample data here;
              real applications get real values.
            </p>
          </div>
          <span className="text-xs text-gray-400 shrink-0 ml-2">
            {previewLoading ? "Updating…" : "Sample data"}
          </span>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {config.blocks.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                Add elements to see a live preview here
              </p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto bg-white shadow-lg min-h-full">
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0"
                style={{ height: "1400px" }}
                title="Live Preview"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

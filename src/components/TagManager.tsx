/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Trash2, Tag as TagIcon } from 'lucide-react';
import { Tag } from '../types';

interface TagManagerProps {
  tags: Tag[];
  onChange: (tags: Tag[]) => void;
}

export default function TagManager({ tags, onChange }: TagManagerProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim()) return;

    // Check for duplicate key
    if (tags.some((t) => t.key.toLowerCase() === newKey.trim().toLowerCase())) {
      alert('Esta chave de tag já existe.');
      return;
    }

    const updated = [...tags, { key: newKey.trim(), value: newValue.trim() }];
    onChange(updated);
    setNewKey('');
    setNewValue('');
  };

  const handleRemoveTag = (index: number) => {
    const updated = tags.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleUpdateTagValue = (index: number, value: string) => {
    const updated = tags.map((tag, i) => (i === index ? { ...tag, value } : tag));
    onChange(updated);
  };

  return (
    <div className="space-y-4" id="tag-manager-container">

      <form onSubmit={handleAddTag} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <input
            type="text"
            id="tag-key-input"
            placeholder="Chave (ex: Owner)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            id="tag-value-input"
            placeholder="Valor (ex: SRE-Team)"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full text-xs px-3 py-2 bg-[#161B22] border border-[#2D333B] rounded text-[#E0E2E7] placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <button
            type="submit"
            id="add-tag-button"
            className="px-3 bg-blue-600 hover:bg-blue-500 text-white rounded transition flex items-center justify-center font-semibold"
            title="Adicionar Tag"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {tags.length > 0 ? (
        <div className="max-h-80 overflow-y-auto border border-[#2D333B] rounded bg-[#0D1117] p-2 space-y-1.5" id="tags-list">
          {tags.map((tag, index) => (
            <div key={index} className="flex items-center justify-between bg-[#161B22] px-3 py-1.5 rounded border border-[#2D333B] text-xs gap-2">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-mono text-blue-400 font-semibold select-none min-w-[130px] sm:min-w-[150px] truncate">{tag.key}:</span>
                <input
                  type="text"
                  value={tag.value}
                  onChange={(e) => handleUpdateTagValue(index, e.target.value)}
                  className="flex-1 text-xs px-2 py-0.5 bg-[#0D1117] border border-[#2D333B] rounded text-[#E0E2E7] placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  placeholder="Valor..."
                />
              </div>
              <button
                type="button"
                onClick={() => handleRemoveTag(index)}
                className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition flex-shrink-0"
                title="Excluir Tag"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-slate-500 italic" id="empty-tags-message">Nenhuma tag cadastrada. Tags padrão como Env e Project serão injetadas automaticamente.</p>
      )}
    </div>
  );
}

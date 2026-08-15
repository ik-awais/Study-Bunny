import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Play, AlertCircle, Sparkles, Check, X, Shield } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import { useToastStore } from '../../store/useToastStore';
import { BUILT_IN_COMMANDS, checkCommandConflict, executeResolvedCommand } from '../../lib/CommandRegistry';
import type { CustomVoiceCommand } from '../../lib/db';
import { Card, Button, Input, Select } from '../ui/SharedUI';


const ACTION_OPTIONS = [
  { group: 'Navigation', label: 'Open Dashboard', type: 'NAVIGATE', target: '/' },
  { group: 'Navigation', label: 'Open Timer', type: 'NAVIGATE', target: '/timer' },
  { group: 'Navigation', label: 'Open Planner', type: 'NAVIGATE', target: '/planner' },
  { group: 'Navigation', label: 'Open Goals', type: 'NAVIGATE', target: '/goals' },
  { group: 'Navigation', label: 'Open Statistics', type: 'NAVIGATE', target: '/stats' },
  { group: 'Navigation', label: 'Open Settings', type: 'NAVIGATE', target: '/settings' },
  { group: 'Timer', label: 'Start Timer', type: 'TIMER', target: 'START' },
  { group: 'Timer', label: 'Pause Timer', type: 'TIMER', target: 'PAUSE' },
  { group: 'Timer', label: 'Resume Timer', type: 'TIMER', target: 'RESUME' },
  { group: 'Timer', label: 'Stop Session', type: 'TIMER', target: 'STOP' },
  { group: 'Timer', label: 'Reset Timer', type: 'TIMER', target: 'RESET' },
] as const;

export const CustomCommandsTab = () => {
  const { customCommands, createCustomCommand, updateCustomCommand, deleteCustomCommand, toggleCustomCommand } = useDataStore();

  const [isModalOpen, setModalOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<CustomVoiceCommand | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [phrase, setPhrase] = useState('');
  const [aliasInput, setAliasInput] = useState('');
  const [aliases, setAliases] = useState<string[]>([]);
  const [selectedActionIndex, setSelectedActionIndex] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const openCreateModal = () => {
    setEditingCommand(null);
    setPhrase('');
    setAliases([]);
    setAliasInput('');
    setSelectedActionIndex(0);
    setEnabled(true);
    setErrorMessage('');
    setModalOpen(true);
  };

  const openEditModal = (cmd: CustomVoiceCommand) => {
    setEditingCommand(cmd);
    setPhrase(cmd.phrase);
    setAliases([...cmd.aliases]);
    setAliasInput('');
    const idx = ACTION_OPTIONS.findIndex(opt => opt.type === cmd.actionType && opt.target === cmd.actionTarget);
    setSelectedActionIndex(idx >= 0 ? idx : 0);
    setEnabled(cmd.enabled);
    setErrorMessage('');
    setModalOpen(true);
  };

  const handleAddAlias = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter') return;
    e.preventDefault();
    const clean = aliasInput.trim();
    if (!clean) return;
    if (aliases.includes(clean) || clean.toLowerCase() === phrase.toLowerCase()) {
      setErrorMessage('Alias already exists.');
      return;
    }
    setAliases([...aliases, clean]);
    setAliasInput('');
    setErrorMessage('');
  };

  const handleRemoveAlias = (aliasToRemove: string) => {
    setAliases(aliases.filter(a => a !== aliasToRemove));
  };

  const handleSave = async () => {
    if (!phrase.trim()) {
      setErrorMessage('Primary phrase cannot be empty.');
      return;
    }

    const action = ACTION_OPTIONS[selectedActionIndex];
    const conflict = checkCommandConflict(phrase, aliases, customCommands, editingCommand?.id);
    if (conflict.hasConflict) {
      setErrorMessage(conflict.reason || 'Phrase conflict detected.');
      return;
    }

    if (editingCommand) {
      await updateCustomCommand(editingCommand.id, {
        phrase: phrase.trim(),
        aliases,
        actionType: action.type,
        actionTarget: action.target,
        enabled
      });
    } else {
      await createCustomCommand({
        phrase: phrase.trim(),
        aliases,
        actionType: action.type,
        actionTarget: action.target,
        enabled
      });
    }

    setModalOpen(false);
  };

  const handleTest = (cmd: CustomVoiceCommand) => {
    // Safely route the test through the new deterministic execution layer
    const result = executeResolvedCommand({
      source: 'CUSTOM',
      intentId: cmd.id,
      actionType: cmd.actionType,
      actionTarget: cmd.actionTarget,
      parameters: {}, // Testing bypasses natural language parameter parsing
      phrase: cmd.phrase
    });
    
    const toast = useToastStore.getState().addToast;
    if (result.success) toast(`Test: ${result.message}`, 'success');
    else toast(`Test failed: ${result.message}`, 'error');
  };

  const getActionLabel = (type: string, target: string) => {
    const opt = ACTION_OPTIONS.find(o => o.type === type && o.target === target);
    return opt ? opt.label : `${type}: ${target}`;
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-4">
      {/* Top Action Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-bunny-border shadow-sm">
        <div>
          <h3 className="font-bold text-base text-bunny-text flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-bunny-primary" />
            My Voice Commands
          </h3>
          <p className="text-xs text-bunny-muted">Say any phrase or alias to trigger immediate actions.</p>
        </div>
        <Button onClick={openCreateModal} className="gap-2 text-xs py-2 px-3">
          <Plus className="w-4 h-4" /> Add Command
        </Button>
      </div>

      {/* User Custom Commands List */}
      <div className="space-y-3">
        {customCommands.length === 0 ? (
          <div className="py-8 text-center bg-white/70 rounded-2xl border border-bunny-border/70 p-6">
            <Sparkles className="w-8 h-8 text-bunny-primary/30 mx-auto mb-2" />
            <p className="text-sm font-bold text-bunny-text">No custom commands yet</p>
            <p className="text-xs text-bunny-muted mt-1 max-w-xs mx-auto">
              Create commands like "Focus time" to start your timer or "Take me home" to jump to Dashboard.
            </p>
          </div>
        ) : (
          customCommands.map(cmd => (
            <Card key={cmd.id} className="p-4 bg-white border-bunny-border transition-all hover:shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-bunny-text text-sm truncate">
                      "{cmd.phrase}"
                    </span>
                    {!cmd.enabled && (
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-500">
                        Disabled
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-bunny-primary/10 text-bunny-primary font-bold px-2 py-0.5 rounded-md">
                      {getActionLabel(cmd.actionType, cmd.actionTarget)}
                    </span>
                    {cmd.aliases.length > 0 && (
                      <span className="text-bunny-muted text-[11px]">
                        Aliases: {cmd.aliases.map(a => `"${a}"`).join(', ')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => toggleCustomCommand(cmd.id, !cmd.enabled)}
                    className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                      cmd.enabled ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    title={cmd.enabled ? 'Enabled - Click to disable' : 'Disabled - Click to enable'}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        cmd.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>

                  <Button
                    onClick={() => handleTest(cmd)}
                    variant="outline"
                    className="text-xs py-1 px-2.5 gap-1 text-bunny-primary border-bunny-primary/30 hover:bg-bunny-primary/10"
                    title="Test command simulation"
                  >
                    <Play className="w-3 h-3" /> Test
                  </Button>

                  <button
                    onClick={() => openEditModal(cmd)}
                    className="p-1.5 text-bunny-muted hover:text-bunny-primary hover:bg-bunny-cream rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {deleteConfirmId === cmd.id ? (
                    <div className="flex items-center gap-1 bg-red-50 p-1 rounded-lg border border-red-200">
                      <button
                        onClick={() => {
                          deleteCustomCommand(cmd.id);
                          setDeleteConfirmId(null);
                        }}
                        className="p-1 text-red-600 hover:bg-red-100 rounded"
                        title="Confirm Delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(cmd.id)}
                      className="p-1.5 text-bunny-muted hover:text-bunny-error hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Built-in Commands Section */}
      <div className="pt-4 border-t border-bunny-border/60">
        <h4 className="text-xs font-bold uppercase tracking-wider text-bunny-muted mb-3 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5" />
          Standard Built-in Commands
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {BUILT_IN_COMMANDS.map(b => (
            <div key={b.id} className="p-3 bg-white/70 rounded-xl border border-bunny-border/50 text-xs flex flex-col justify-between">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-bunny-text">{b.name}</span>
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-bunny-primary/10 text-bunny-primary">
                  Built-in
                </span>
              </div>
              <p className="text-bunny-muted text-[11px] mb-2">{b.description}</p>
              <div className="text-[10px] text-bunny-muted bg-bunny-cream/60 p-1.5 rounded-lg border border-bunny-border/40">
                <span className="font-semibold text-bunny-text">Examples: </span>
                {b.examplePhrases.map(ex => `"${ex}"`).join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Command Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <Card className="w-full max-w-md bg-white border-bunny-border shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-bunny-border pb-3">
              <h3 className="font-bold text-lg text-bunny-text font-rounded">
                {editingCommand ? 'Edit Custom Command' : 'New Voice Command'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-bunny-muted hover:text-bunny-text">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1 block mb-1">
                  Trigger Phrase <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Open my schedule"
                  value={phrase}
                  onChange={e => setPhrase(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1 block mb-1">
                  Optional Aliases
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. Show schedule (press Enter)"
                    value={aliasInput}
                    onChange={e => setAliasInput(e.target.value)}
                    onKeyDown={handleAddAlias}
                  />
                  <Button onClick={handleAddAlias} variant="outline" className="text-xs px-3">
                    Add
                  </Button>
                </div>
                {aliases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {aliases.map(alias => (
                      <span
                        key={alias}
                        className="text-xs bg-bunny-cream px-2 py-1 rounded-lg border border-bunny-border flex items-center gap-1 font-medium"
                      >
                        "{alias}"
                        <button
                          type="button"
                          onClick={() => handleRemoveAlias(alias)}
                          className="text-bunny-muted hover:text-bunny-error ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-bunny-muted uppercase ml-1 block mb-1">
                  Action To Execute
                </label>
                <Select
                  value={selectedActionIndex}
                  onChange={e => setSelectedActionIndex(Number(e.target.value))}
                >
                  {ACTION_OPTIONS.map((opt, index) => (
                    <option key={`${opt.type}-${opt.target}`} value={index}>
                      [{opt.group}] {opt.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-bunny-cream/60 rounded-xl border border-bunny-border/50">
                <div>
                  <p className="text-xs font-bold text-bunny-text">Enable Command</p>
                  <p className="text-[10px] text-bunny-muted">Command is actively monitored when voice is ON</p>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={e => setEnabled(e.target.checked)}
                  className="w-4 h-4 accent-bunny-primary rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setModalOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSave} className="flex-1 shadow-md">
                {editingCommand ? 'Save Changes' : 'Create Command'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
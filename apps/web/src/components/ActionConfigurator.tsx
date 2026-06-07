import React from 'react';
import { ActionType, ActionPayload } from '@smartdeck/protocol';
import { Trash2, Plus, ArrowDown, ArrowUp } from 'lucide-react';

interface ActionItem {
  id: string;
  action_type: ActionType;
  payload: ActionPayload;
  delay_ms: number;
}

interface ActionConfiguratorProps {
  actions: ActionItem[];
  onChange: (actions: ActionItem[]) => void;
}

export default function ActionConfigurator({ actions, onChange }: ActionConfiguratorProps) {
  const addAction = () => {
    const newAction: ActionItem = {
      id: 'act_' + Math.random().toString(36).substring(2, 10),
      action_type: 'open_url',
      payload: { url: 'https://google.com' },
      delay_ms: 0
    };
    onChange([...actions, newAction]);
  };

  const removeAction = (index: number) => {
    const copy = [...actions];
    copy.splice(index, 1);
    onChange(copy);
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === actions.length - 1) return;
    
    const copy = [...actions];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    
    onChange(copy);
  };

  const updateActionType = (index: number, type: ActionType) => {
    const copy = [...actions];
    copy[index].action_type = type;
    
    // Default payload based on type
    if (type === 'launch_app') copy[index].payload = { path: 'C:\\Windows\\System32\\notepad.exe', args: [] };
    else if (type === 'open_url') copy[index].payload = { url: 'https://google.com' };
    else if (type === 'shortcut') copy[index].payload = { keys: ['Ctrl', 'C'] };
    else if (type === 'text') copy[index].payload = { text: 'Hello World' };
    else if (type === 'media') copy[index].payload = { mediaCommand: 'play' };
    else if (type === 'http') copy[index].payload = { httpMethod: 'GET', httpUrl: 'https://api.github.com' };
    
    onChange(copy);
  };

  const updatePayloadField = (index: number, field: keyof ActionPayload, value: any) => {
    const copy = [...actions];
    copy[index].payload = {
      ...copy[index].payload,
      [field]: value
    };
    onChange(copy);
  };

  const updateDelay = (index: number, val: number) => {
    const copy = [...actions];
    copy[index].delay_ms = val;
    onChange(copy);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-semibold tracking-wide uppercase text-accent-cyan">Macro / Action Chain</h4>
        <button
          onClick={addAction}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary hover:bg-primary-hover text-white rounded transition"
        >
          <Plus size={14} /> Add Action
        </button>
      </div>

      {actions.length === 0 ? (
        <div className="border border-dashed border-gray-800 rounded-lg p-6 text-center text-sm text-gray-400">
          No actions assigned. Press a button or click Add Action to trigger.
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((act, idx) => (
            <div key={act.id} className="border border-card-border bg-card rounded-lg p-3 relative space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-card-border">
                <span className="text-xs font-medium text-gray-400 uppercase">Step {idx + 1}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveAction(idx, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowUp size={14} />
                  </button>
                  <button
                    onClick={() => moveAction(idx, 'down')}
                    disabled={idx === actions.length - 1}
                    className="p-1 text-gray-400 hover:text-white disabled:opacity-30"
                  >
                    <ArrowDown size={14} />
                  </button>
                  <button
                    onClick={() => removeAction(idx)}
                    className="p-1 text-gray-400 hover:text-accent-rose ml-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Action type selector */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Action Type</label>
                <select
                  value={act.action_type}
                  onChange={(e) => updateActionType(idx, e.target.value as ActionType)}
                  className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                >
                  <option value="launch_app">Launch Executable</option>
                  <option value="open_url">Open Web URL</option>
                  <option value="shortcut">Simulate Shortcut</option>
                  <option value="text">Inject Text / Paste</option>
                  <option value="media">Media Control</option>
                  <option value="http">HTTP Webhook Request</option>
                </select>
              </div>

              {/* Delay setting */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Pre-execution Delay (ms)</label>
                <input
                  type="number"
                  value={act.delay_ms}
                  onChange={(e) => updateDelay(idx, parseInt(e.target.value) || 0)}
                  className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                  placeholder="0"
                />
              </div>

              {/* Dynamic Payload Form */}
              {act.action_type === 'launch_app' && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Executable Path</label>
                    <input
                      type="text"
                      value={act.payload.path || ''}
                      onChange={(e) => updatePayloadField(idx, 'path', e.target.value)}
                      className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                      placeholder="e.g. C:\Windows\System32\notepad.exe"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Arguments (comma separated)</label>
                    <input
                      type="text"
                      value={(act.payload.args || []).join(', ')}
                      onChange={(e) => updatePayloadField(idx, 'args', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                      placeholder="e.g. document.txt"
                    />
                  </div>
                </div>
              )}

              {act.action_type === 'open_url' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Target Web URL</label>
                  <input
                    type="text"
                    value={act.payload.url || ''}
                    onChange={(e) => updatePayloadField(idx, 'url', e.target.value)}
                    className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                    placeholder="https://example.com"
                  />
                </div>
              )}

              {act.action_type === 'shortcut' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Keys (e.g. Ctrl, Shift, R)</label>
                  <input
                    type="text"
                    value={(act.payload.keys || []).join(', ')}
                    onChange={(e) => updatePayloadField(idx, 'keys', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                    className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                    placeholder="Ctrl, Shift, R"
                  />
                </div>
              )}

              {act.action_type === 'text' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Inject Text Content</label>
                  <textarea
                    value={act.payload.text || ''}
                    onChange={(e) => updatePayloadField(idx, 'text', e.target.value)}
                    rows={2}
                    className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary resize-none"
                    placeholder="Write text to auto-type..."
                  />
                </div>
              )}

              {act.action_type === 'media' && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Media Commands</label>
                  <select
                    value={act.payload.mediaCommand || 'play'}
                    onChange={(e) => updatePayloadField(idx, 'mediaCommand', e.target.value)}
                    className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                  >
                    <option value="play">Play / Pause toggle</option>
                    <option value="next">Next Track</option>
                    <option value="prev">Previous Track</option>
                    <option value="mute">Mute System Audio</option>
                    <option value="vol_up">Volume Increase (+2%)</option>
                    <option value="vol_down">Volume Decrease (-2%)</option>
                  </select>
                </div>
              )}

              {act.action_type === 'http' && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <select
                      value={act.payload.httpMethod || 'GET'}
                      onChange={(e) => updatePayloadField(idx, 'httpMethod', e.target.value)}
                      className="w-24 bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                    <input
                      type="text"
                      value={act.payload.httpUrl || ''}
                      onChange={(e) => updatePayloadField(idx, 'httpUrl', e.target.value)}
                      className="flex-1 bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                      placeholder="https://api.webhook.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Request Body (JSON)</label>
                    <textarea
                      value={act.payload.httpBody || ''}
                      onChange={(e) => updatePayloadField(idx, 'httpBody', e.target.value)}
                      rows={2}
                      className="w-full bg-[#0B0F19] border border-card-border text-gray-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary resize-none font-mono"
                      placeholder='{"key": "value"}'
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { AppDetectionRule, Profile } from '@smartdeck/protocol';
import { Plus, Trash2, Sliders, ShieldAlert } from 'lucide-react';

interface AppRulesManagerProps {
  token: string;
  profiles: Profile[];
  currentProfileId: string;
}

export default function AppRulesManager({ token, profiles, currentProfileId }: AppRulesManagerProps) {
  const [rules, setRules] = useState<AppDetectionRule[]>([]);
  const [targetProfileId, setTargetProfileId] = useState('');
  const [processName, setProcessName] = useState('');
  const [windowTitle, setWindowTitle] = useState('');
  const [priority, setPriority] = useState(1);
  const [activeWindowInfo, setActiveWindowInfo] = useState<{ processName: string; windowTitle: string } | null>(null);

  useEffect(() => {
    if (profiles.length > 0 && !targetProfileId) {
      setTargetProfileId(profiles[0].id);
    }
  }, [profiles, targetProfileId]);

  const fetchRules = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5001/api/app-detection/rules', {
        headers: { 'x-pairing-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setRules(data);
      }
    } catch (err) {
      console.error('Failed to fetch app rules:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchRules();
    }
  }, [token]);

  const addRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProfileId) return;

    try {
      const res = await fetch('http://127.0.0.1:5001/api/app-detection/rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pairing-token': token
        },
        body: JSON.stringify({
          profileId: targetProfileId,
          processName,
          windowTitlePattern: windowTitle,
          priority
        })
      });

      if (res.ok) {
        setProcessName('');
        setWindowTitle('');
        setPriority(1);
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to create app rule:', err);
    }
  };

  const deleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:5001/api/app-detection/rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'x-pairing-token': token }
      });
      if (res.ok) {
        fetchRules();
      }
    } catch (err) {
      console.error('Failed to delete app rule:', err);
    }
  };

  return (
    <div className="glass rounded-xl p-5 border border-card-border space-y-5">
      <div className="flex items-center gap-2">
        <Sliders className="text-accent-cyan" size={18} />
        <h3 className="text-md font-bold text-gray-200">App Detection Rules</h3>
      </div>

      {/* Rules list */}
      <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
        {rules.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center">
            No rules set. Profile will stay active unless changed manually.
          </div>
        ) : (
          rules.map(rule => {
            const matchedProfile = profiles.find(p => p.id === rule.profileId);
            return (
              <div key={rule.id} className="flex justify-between items-center p-2.5 bg-[#0B0F19] border border-card-border rounded-lg text-xs">
                <div className="space-y-1">
                  <div className="font-semibold text-accent-cyan">
                    Switch to: {matchedProfile?.name || rule.profileId}
                  </div>
                  <div className="text-gray-400">
                    {rule.processName && <span>Proc: <code className="text-accent-purple">{rule.processName}</code></span>}
                    {rule.processName && rule.windowTitlePattern && <span className="mx-1.5">|</span>}
                    {rule.windowTitlePattern && <span>Title: <code className="text-accent-purple">*{rule.windowTitlePattern}*</code></span>}
                  </div>
                  <div className="text-[10px] text-gray-500">Priority: {rule.priority}</div>
                </div>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 text-gray-500 hover:text-accent-rose rounded bg-card hover:bg-gray-800 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Add rule form */}
      <form onSubmit={addRule} className="p-3 bg-[#0B0F19] border border-card-border rounded-lg space-y-3 text-xs">
        <div className="font-semibold text-gray-300">Create Auto-Switch Rule</div>
        
        <div>
          <label className="block text-gray-400 mb-1">Target Profile</label>
          <select
            value={targetProfileId}
            onChange={(e) => setTargetProfileId(e.target.value)}
            className="w-full bg-card border border-card-border text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
          >
            {profiles.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-gray-400 mb-1">Process Name (.exe)</label>
            <input
              type="text"
              value={processName}
              onChange={(e) => setProcessName(e.target.value)}
              className="w-full bg-card border border-card-border text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
              placeholder="e.g. chrome"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1">Window Title Match</label>
            <input
              type="text"
              value={windowTitle}
              onChange={(e) => setWindowTitle(e.target.value)}
              className="w-full bg-card border border-card-border text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary"
              placeholder="e.g. YouTube"
            />
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-gray-400 mb-1">Rule Priority ({priority})</label>
            <input
              type="range"
              min="1"
              max="10"
              value={priority}
              onChange={(e) => setPriority(parseInt(e.target.value) || 1)}
              className="w-full accent-primary"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-1 px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded transition self-end"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </form>
    </div>
  );
}

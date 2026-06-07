'use client';

import React, { useState, useEffect } from 'react';
import { Profile, Page, Button } from '@smartdeck/protocol';
import ActionConfigurator from '../components/ActionConfigurator';
import AppRulesManager from '../components/AppRulesManager';
import DeviceSimulator from '../components/DeviceSimulator';
import { 
  FolderPlus, Save, RefreshCw, Cpu, Layers, HardDrive, Wifi, WifiOff, LayoutGrid, Smartphone, ChevronRight, Sliders, LogOut, Check
} from 'lucide-react';

export default function DashboardPage() {
  const [token, setToken] = useState<string>('');
  const [pairingCode, setPairingCode] = useState<string>('000000'); // Default dev code
  const [paired, setPaired] = useState<boolean>(false);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [activeProfileDetails, setActiveProfileDetails] = useState<Profile | null>(null);
  
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [selectedButton, setSelectedButton] = useState<Button | null>(null);
  const [selectedButtonActions, setSelectedButtonActions] = useState<any[]>([]);
  const [selectedButtonLabel, setSelectedButtonLabel] = useState<string>('');

  const [newProfileName, setNewProfileName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [bridgeConnected, setBridgeConnected] = useState<boolean>(false);
  const [showSimulator, setShowSimulator] = useState<boolean>(true);

  // Check Local Bridge connection health
  const checkHealth = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5001/api/health');
      if (res.ok) {
        setBridgeConnected(true);
      } else {
        setBridgeConnected(false);
      }
    } catch {
      setBridgeConnected(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle local pair flow (mocking pairing/confirm)
  const handlePair = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5001/api/pairing/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pairingCode, clientName: 'SmartDeck Web Admin' })
      });
      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        setPaired(true);
        // Save token to local storage
        localStorage.setItem('sd_pairing_token', data.token);
      } else {
        alert('Pairing failed. Ensure Local Bridge is running and check pairing code.');
      }
    } catch (err) {
      alert('Cannot connect to Local Bridge. Start the bridge first.');
    }
  };

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem('sd_pairing_token');
    if (savedToken) {
      setToken(savedToken);
      setPaired(true);
    }
  }, []);

  // Fetch profiles when paired
  const fetchProfiles = async () => {
    if (!paired || !token) return;
    try {
      const res = await fetch('http://127.0.0.1:5001/api/profiles', {
        headers: { 'x-pairing-token': token }
      });
      if (res.ok) {
        const data = await res.json();
        setProfiles(data);
        if (data.length > 0 && !selectedProfileId) {
          setSelectedProfileId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch profiles:', err);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, [paired, token]);

  // Fetch full profile details
  const fetchProfileDetails = async (id: string) => {
    if (!token || !id) return;
    try {
      const res = await fetch(`http://127.0.0.1:5001/api/profiles/${id}`, {
        headers: { 'x-pairing-token': token }
      });
      if (res.ok) {
        const data = (await res.json()) as Profile;
        setActiveProfileDetails(data);
        setCurrentPageIndex(0);
        setSelectedButton(null);
      }
    } catch (err) {
      console.error('Failed to fetch profile details:', err);
    }
  };

  useEffect(() => {
    if (selectedProfileId) {
      fetchProfileDetails(selectedProfileId);
    }
  }, [selectedProfileId]);

  // Handle creating profile
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;

    try {
      const res = await fetch('http://127.0.0.1:5001/api/profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-pairing-token': token
        },
        body: JSON.stringify({ name: newProfileName })
      });

      if (res.ok) {
        const newProf = await res.json();
        setNewProfileName('');
        await fetchProfiles();
        setSelectedProfileId(newProf.id);
      }
    } catch (err) {
      console.error('Failed to create profile:', err);
    }
  };

  // Button Clicked inside editor
  const handleSelectButton = (btn: Button) => {
    setSelectedButton(btn);
    setSelectedButtonLabel(btn.label || '');
    // Fetch actions for this button
    const activePage = activeProfileDetails?.pages[currentPageIndex];
    if (activePage) {
      const fullBtn = activePage.buttons.find((b: any) => b.id === btn.id);
      setSelectedButtonActions((fullBtn as any)?.actions || []);
    }
  };

  // Save changes to active button
  const handleSaveButton = async () => {
    if (!activeProfileDetails || !selectedButton || !token) return;
    setIsSaving(true);

    try {
      // Create cloned profile payload
      const updatedProfile = { ...activeProfileDetails };
      const page = updatedProfile.pages[currentPageIndex];
      const btnIdx = page.buttons.findIndex((b: any) => b.id === selectedButton.id);
      
      if (btnIdx !== -1) {
        page.buttons[btnIdx] = {
          ...page.buttons[btnIdx],
          label: selectedButtonLabel,
          actions: selectedButtonActions
        } as any;
      }

      const res = await fetch(`http://127.0.0.1:5001/api/profiles/${activeProfileDetails.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-pairing-token': token
        },
        body: JSON.stringify(updatedProfile)
      });

      if (res.ok) {
        await fetchProfileDetails(activeProfileDetails.id);
        alert('Button profile synchronized successfully.');
      } else {
        alert('Failed to sync settings.');
      }
    } catch (err) {
      console.error(err);
      alert('Error connecting to Local Bridge.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokePairing = () => {
    localStorage.removeItem('sd_pairing_token');
    setToken('');
    setPaired(false);
    setActiveProfileDetails(null);
    setProfiles([]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation */}
      <header className="glass border-b border-card-border px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Smartphone className="text-primary" size={24} />
          <span className="font-extrabold text-lg tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent-purple">
            SMARTDECK PRO
          </span>
          <span className="text-[10px] uppercase tracking-widest bg-gray-900 border border-gray-800 text-gray-400 px-2 py-0.5 rounded font-mono">
            MVP Engine v1.0
          </span>
        </div>

        <div className="flex items-center gap-6 text-sm">
          {/* Bridge Status */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Local Bridge:</span>
            {bridgeConnected ? (
              <span className="flex items-center gap-1.5 text-accent-green font-semibold">
                <Wifi size={14} /> Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-accent-rose font-semibold">
                <WifiOff size={14} /> Offline
              </span>
            )}
          </div>

          {paired && (
            <button
              onClick={handleRevokePairing}
              className="flex items-center gap-1 text-gray-400 hover:text-accent-rose transition text-xs font-semibold uppercase tracking-wider"
            >
              <LogOut size={13} /> Disconnect
            </button>
          )}
        </div>
      </header>

      {/* Main UI */}
      {!paired ? (
        <div className="flex-1 flex items-center justify-center p-6 bg-gradient-to-tr from-[#07090F] to-[#0D1525]">
          <div className="glass max-w-md w-full rounded-2xl p-8 border border-card-border space-y-6 text-center shadow-glow-primary">
            <Smartphone className="mx-auto text-primary animate-pulse" size={48} />
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">Pair Command Center</h2>
              <p className="text-sm text-gray-400">
                Connect this web browser dashboard to your SmartDeck Pro Local Bridge daemon.
              </p>
            </div>

            <div className="p-4 bg-[#05070B] rounded-lg border border-card-border space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Bridge Pairing Code</label>
                <input
                  type="text"
                  value={pairingCode}
                  onChange={(e) => setPairingCode(e.target.value)}
                  className="w-full bg-card border border-card-border rounded px-3 py-2 text-center text-lg font-mono tracking-widest text-primary focus:outline-none focus:border-primary"
                  placeholder="000000"
                />
              </div>

              <button
                onClick={handlePair}
                className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-2.5 rounded-lg transition"
              >
                Establish Pairing
              </button>
            </div>

            <div className="text-[11px] text-gray-500 font-mono">
              Ensure you started the bridge server via: <code className="text-accent-purple">pnpm dev</code> inside apps/bridge
            </div>
          </div>
        </div>
      ) : (
        <main className="flex-1 grid grid-cols-12 gap-6 p-6">
          
          {/* LEFT COLUMN: Profiles & Detection Rules */}
          <div className="col-span-12 lg:col-span-3 space-y-6">
            
            {/* Profiles Card */}
            <div className="glass rounded-xl p-5 border border-card-border space-y-4">
              <div className="flex items-center gap-2">
                <LayoutGrid className="text-primary" size={18} />
                <h3 className="text-md font-bold text-gray-200">Profiles</h3>
              </div>

              {/* Profiles list */}
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {profiles.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition flex justify-between items-center ${
                      selectedProfileId === p.id 
                        ? 'bg-primary/15 border border-primary text-primary font-bold shadow-[0_0_10px_rgba(59,130,246,0.1)]' 
                        : 'bg-[#0B0F19] border border-card-border text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    <span>{p.name}</span>
                    {p.is_fallback === 1 || p.isFallback ? (
                      <span className="text-[9px] uppercase tracking-wide bg-primary/20 text-primary px-1.5 py-0.5 rounded font-mono">
                        Default
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Create Profile Form */}
              <form onSubmit={handleCreateProfile} className="flex gap-2 pt-2 border-t border-card-border">
                <input
                  type="text"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="flex-1 bg-[#0B0F19] border border-card-border text-gray-300 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-primary"
                  placeholder="New Profile Name..."
                />
                <button
                  type="submit"
                  className="p-1.5 bg-primary hover:bg-primary-hover text-white rounded transition"
                >
                  <FolderPlus size={16} />
                </button>
              </form>
            </div>

            {/* App Rules Card */}
            <AppRulesManager token={token} profiles={profiles} currentProfileId={selectedProfileId} />

            {/* Simulator Toggle Control */}
            <div className="glass rounded-xl p-4 border border-card-border flex justify-between items-center text-xs">
              <span className="text-gray-400 font-semibold uppercase tracking-wider">Show Virtual Device</span>
              <button
                onClick={() => setShowSimulator(!showSimulator)}
                className={`px-3 py-1.5 rounded font-bold uppercase transition ${
                  showSimulator ? 'bg-accent-green/10 text-accent-green border border-accent-green/30' : 'bg-gray-800 text-gray-400'
                }`}
              >
                {showSimulator ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* MIDDLE COLUMN: Interactive 3x4 Touch Grid Editor */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            <div className="glass rounded-xl p-5 border border-card-border space-y-5">
              
              <div className="flex justify-between items-center border-b border-card-border pb-3">
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-gray-200">
                    {activeProfileDetails?.name || 'Loading Profile...'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Configure layout actions. Selection updates in real-time.
                  </p>
                </div>
                
                {/* Save Button */}
                <button
                  onClick={handleSaveButton}
                  disabled={isSaving || !selectedButton}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-gray-800 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition disabled:opacity-40"
                >
                  <Save size={14} /> Synchronize
                </button>
              </div>

              {activeProfileDetails ? (
                <div className="space-y-6">
                  {/* Pages tabs */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 mr-2 uppercase font-semibold">Pages:</span>
                    {activeProfileDetails.pages.map((p, idx) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setCurrentPageIndex(idx);
                          setSelectedButton(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${
                          currentPageIndex === idx
                            ? 'bg-accent-purple/10 border border-accent-purple/40 text-accent-purple'
                            : 'bg-card border border-card-border text-gray-400 hover:text-white'
                        }`}
                      >
                        {p.name || `Page ${idx + 1}`}
                      </button>
                    ))}
                  </div>

                  {/* 3x4 grid editor */}
                  <div className="aspect-[4/3] w-full max-w-md mx-auto grid grid-cols-4 gap-3.5 bg-[#05070B] border border-gray-950 p-4 rounded-xl relative shadow-inner">
                    {activeProfileDetails.pages[currentPageIndex]?.buttons.map((btn) => {
                      const isSelected = selectedButton?.id === btn.id;
                      const hasActions = (btn as any).actions && (btn as any).actions.length > 0;
                      
                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleSelectButton(btn)}
                          className={`aspect-square relative rounded-xl border flex flex-col items-center justify-center p-2 transition-all ${
                            isSelected
                              ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-[1.02] z-10'
                              : 'bg-card border-card-border hover:border-gray-600 hover:bg-[#1C2433] hover:scale-[1.01]'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-gray-200 truncate w-full">
                            {btn.label || ''}
                          </span>
                          
                          {btn.label ? null : (
                            <span className="text-[9px] text-gray-600 uppercase font-mono">
                              {btn.rowIdx},{btn.colIdx}
                            </span>
                          )}

                          {hasActions && (
                            <span className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-accent-cyan shadow-[0_0_5px_#06B6D4]"></span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="h-64 flex flex-col items-center justify-center text-center">
                  <RefreshCw className="animate-spin text-gray-600 mb-2" size={32} />
                  <span className="text-sm text-gray-500">Retrieving profile parameters...</span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Button Action Configurator & Device Simulator */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            
            {selectedButton ? (
              <div className="glass rounded-xl p-5 border border-card-border space-y-5">
                
                {/* Header */}
                <div className="flex justify-between items-center border-b border-card-border pb-3">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-mono tracking-widest text-accent-purple">Configure Button</span>
                    <h3 className="text-md font-bold text-gray-200">
                      Grid Index: {selectedButton.rowIdx}, {selectedButton.colIdx}
                    </h3>
                  </div>
                </div>

                {/* Form fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase mb-2">Display Label</label>
                    <input
                      type="text"
                      value={selectedButtonLabel}
                      onChange={(e) => setSelectedButtonLabel(e.target.value)}
                      className="w-full bg-[#0B0F19] border border-card-border text-gray-200 rounded px-3 py-2 text-xs focus:outline-none focus:border-primary"
                      placeholder="e.g. Chrome / Notepad / volume"
                    />
                  </div>

                  {/* Configurator */}
                  <ActionConfigurator
                    actions={selectedButtonActions}
                    onChange={(actions) => setSelectedButtonActions(actions)}
                  />
                </div>
              </div>
            ) : (
              <div className="glass rounded-xl p-6 border border-card-border text-center h-48 flex flex-col items-center justify-center text-gray-500">
                <LayoutGrid size={32} className="text-gray-700 mb-2" />
                <span className="text-xs">Select a button in the layout grid to edit triggers.</span>
              </div>
            )}

            {/* Simulated hardware viewport */}
            {showSimulator && (
              <div className="flex flex-col items-center justify-center">
                <DeviceSimulator token={token} />
              </div>
            )}

          </div>

        </main>
      )}
    </div>
  );
}

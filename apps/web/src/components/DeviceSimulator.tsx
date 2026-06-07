import React, { useState, useEffect, useRef } from 'react';
import { MessageEnvelope, PROTOCOL_VERSION, Button, Page } from '@smartdeck/protocol';
import { Cpu, Server, Wifi, WifiOff, HardDrive, Smartphone, ChevronLeft, ChevronRight } from 'lucide-react';

interface DeviceSimulatorProps {
  token: string;
}

export default function DeviceSimulator({ token }: DeviceSimulatorProps) {
  const [connected, setConnected] = useState(false);
  const [activeProfile, setActiveProfile] = useState<{ id: string; name: string; pages: Page[] } | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [widgetData, setWidgetData] = useState<Record<string, string>>({
    'system.cpu': '0%',
    'system.ram': '0%',
    'system.time': '00:00'
  });
  const [lastExecutedResult, setLastExecutedResult] = useState<{ btnId: string; success: boolean; error?: string } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    // Connect to Local Bridge WebSocket
    const connect = () => {
      console.log('[Simulator] Connecting to local bridge WebSocket...');
      const ws = new WebSocket('ws://127.0.0.1:5001/events');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[Simulator] Connected to bridge.');
        setConnected(true);

        // Send device.hello
        const helloMsg: MessageEnvelope = {
          protocolVersion: PROTOCOL_VERSION,
          id: `sim_hello_${Date.now()}`,
          type: 'device.hello',
          timestamp: new Date().toISOString(),
          source: 'device',
          target: 'bridge',
          payload: {
            deviceId: 'sim_device_esp32_s3_v1',
            firmwareVersion: '1.0.0-sim',
            hardwareModel: 'LAFVIN ESP32-S3 4.0"',
            gridRows: 3,
            gridCols: 4
          }
        };
        ws.send(JSON.stringify(helloMsg));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as MessageEnvelope;
          
          if (msg.type === 'profile.sync') {
            const profile = msg.payload.activeProfile;
            console.log('[Simulator] Profile sync received:', profile.name);
            setActiveProfile(profile);
            setCurrentPageIndex(0); // reset page index on sync
          } 
          else if (msg.type === 'widget.update') {
            const widget = msg.payload;
            setWidgetData(prev => ({
              ...prev,
              [widget.type]: widget.data.value
            }));
          }
          else if (msg.type === 'action.execute') {
            const { buttonId, success, error } = msg.payload;
            setLastExecutedResult({ btnId: buttonId, success, error });
            setTimeout(() => setLastExecutedResult(null), 3000);
          }
        } catch (err) {
          console.error('[Simulator] Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        console.log('[Simulator] WS closed.');
        setConnected(false);
        setActiveProfile(null);
        // Try reconnecting in 3 seconds
        setTimeout(connect, 3000);
      };

      ws.onerror = (err) => {
        console.error('[Simulator] WS error:', err);
        ws.close();
      };
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const handleButtonPress = (btn: Button) => {
    if (!connected || !wsRef.current) return;

    // Send button.press
    const pressMsg: MessageEnvelope = {
      protocolVersion: PROTOCOL_VERSION,
      id: `sim_press_${Date.now()}`,
      type: 'button.press',
      timestamp: new Date().toISOString(),
      source: 'device',
      target: 'bridge',
      payload: {
        rowIdx: btn.rowIdx,
        colIdx: btn.colIdx,
        buttonId: btn.id
      }
    };

    wsRef.current.send(JSON.stringify(pressMsg));

    // Send button.release 100ms later
    setTimeout(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const releaseMsg: MessageEnvelope = {
          protocolVersion: PROTOCOL_VERSION,
          id: `sim_release_${Date.now()}`,
          type: 'button.release',
          timestamp: new Date().toISOString(),
          source: 'device',
          target: 'bridge',
          payload: {
            buttonId: btn.id
          }
        };
        wsRef.current.send(JSON.stringify(releaseMsg));
      }
    }, 100);
  };

  const activePage = activeProfile?.pages[currentPageIndex];
  
  // Create a 3x4 grid structure populated with synced buttons
  const grid = Array(3).fill(null).map(() => Array(4).fill(null));
  if (activePage?.buttons) {
    for (const btn of activePage.buttons) {
      if (btn.rowIdx >= 0 && btn.rowIdx < 3 && btn.colIdx >= 0 && btn.colIdx < 4) {
        grid[btn.rowIdx][btn.colIdx] = btn;
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      {/* Outer casing */}
      <div className="relative p-6 bg-gradient-to-br from-[#1E2530] to-[#0D1117] rounded-3xl border border-gray-700 shadow-2xl w-[450px]">
        {/* Anti-slip rubber grips detail */}
        <div className="absolute top-1/2 -left-1 w-1 h-12 bg-gray-800 rounded-r-md transform -translate-y-1/2"></div>
        <div className="absolute top-1/2 -right-1 w-1 h-12 bg-gray-800 rounded-l-md transform -translate-y-1/2"></div>

        {/* Screen Bezel */}
        <div className="bg-black p-4 rounded-xl border border-gray-800">
          
          {/* Status Bar */}
          <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pb-2 border-b border-gray-900 mb-3 px-1">
            <div className="flex items-center gap-1.5">
              <Smartphone size={10} className="text-primary" />
              <span>SmartDeck ESP32-S3</span>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-0.5">
                <Cpu size={9} /> CPU: {widgetData['system.cpu']}
              </span>
              <span className="flex items-center gap-0.5">
                <HardDrive size={9} /> RAM: {widgetData['system.ram']}
              </span>
              <span className="font-semibold text-gray-300">
                {widgetData['system.time']}
              </span>
              {connected ? (
                <Wifi size={11} className="text-accent-green" />
              ) : (
                <WifiOff size={11} className="text-accent-rose" />
              )}
            </div>
          </div>

          {/* Actual Touchscreen Viewport */}
          <div className="bg-[#05070B] rounded-lg p-2 min-h-[200px] border border-gray-950 flex flex-col justify-between select-none">
            {activeProfile ? (
              <div className="flex-1 flex flex-col justify-between">
                
                {/* Profile Header on Device */}
                <div className="flex justify-between items-center px-1 mb-2">
                  <div className="text-[11px] font-bold text-gray-300 truncate max-w-[150px]">
                    {activeProfile.name}
                  </div>
                  <div className="text-[9px] bg-gray-900 text-gray-400 px-1.5 py-0.5 rounded">
                    Page {currentPageIndex + 1}/{activeProfile.pages.length}
                  </div>
                </div>

                {/* 3x4 Touch Grid */}
                <div className="grid grid-cols-4 gap-2 flex-1 items-center">
                  {grid.map((row, rIdx) => 
                    row.map((btn: Button | null, cIdx) => {
                      if (!btn) return <div key={`empty-${rIdx}-${cIdx}`} className="aspect-square bg-gray-900/10 rounded-md border border-gray-900/40"></div>;
                      
                      const isTargetOfExecution = lastExecutedResult?.btnId === btn.id;

                      return (
                        <button
                          key={btn.id}
                          onClick={() => handleButtonPress(btn)}
                          className={`aspect-square relative rounded-lg text-center flex flex-col items-center justify-center p-1 border transition-all duration-150 ${
                            isTargetOfExecution
                              ? lastExecutedResult.success
                                ? 'bg-accent-green/20 border-accent-green scale-95 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                : 'bg-accent-rose/20 border-accent-rose scale-95 shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                              : 'bg-card border-card-border hover:border-gray-600 active:scale-95 active:bg-gray-800'
                          }`}
                        >
                          <span className="text-[10px] font-semibold tracking-wide text-gray-200 truncate w-full px-0.5">
                            {btn.label || `B${rIdx},${cIdx}`}
                          </span>
                          
                          {/* Optional widget indicator inside button */}
                          {btn.label?.toLowerCase() === 'cpu' && (
                            <span className="text-[9px] text-accent-cyan font-mono mt-1">
                              {widgetData['system.cpu']}
                            </span>
                          )}
                          {btn.label?.toLowerCase() === 'ram' && (
                            <span className="text-[9px] text-accent-purple font-mono mt-1">
                              {widgetData['system.ram']}
                            </span>
                          )}
                          {btn.label?.toLowerCase() === 'time' && (
                            <span className="text-[9px] text-yellow-500 font-mono mt-1">
                              {widgetData['system.time']}
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Page Navigation Controls on touchscreen */}
                {activeProfile.pages.length > 1 && (
                  <div className="flex justify-between items-center mt-3 pt-1.5 border-t border-gray-900/50">
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                      disabled={currentPageIndex === 0}
                      className="p-1 rounded bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="text-[10px] text-gray-500 font-mono">Swipe / Tap Nav</span>
                    <button
                      onClick={() => setCurrentPageIndex(prev => Math.min(activeProfile.pages.length - 1, prev + 1))}
                      disabled={currentPageIndex === activeProfile.pages.length - 1}
                      className="p-1 rounded bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white disabled:opacity-30 transition"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                )}

              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
                <Smartphone className="text-gray-700 animate-pulse mb-2" size={32} />
                <span className="text-xs text-gray-500">
                  {connected 
                    ? 'Syncing active profile...' 
                    : 'Waiting for Local Bridge connection...'}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* Brand logo details */}
        <div className="text-center mt-4 text-[10px] text-gray-600 font-mono tracking-wider">
          SMARTDECK PRO VIRTUAL SCREEN
        </div>
      </div>
      
      {/* execution status banner */}
      {lastExecutedResult && (
        <div className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
          lastExecutedResult.success 
            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green' 
            : 'bg-accent-rose/10 border-accent-rose/30 text-accent-rose'
        }`}>
          {lastExecutedResult.success 
            ? '✓ Action executed successfully' 
            : `✗ Failed: ${lastExecutedResult.error}`}
        </div>
      )}
    </div>
  );
}

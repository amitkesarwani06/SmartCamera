import { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, getAutomationStatus, toggleAutomation } from '../api/client';

/**
 * SettingsPanel — slide-out panel for automation configuration.
 *
 * Controls: monitoring interval, max screenshots, alert keywords,
 * automation on/off toggle, and live scheduler status.
 */
export default function SettingsPanel({ isOpen, onClose }) {
  const [settings, setSettings] = useState(null);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [newKeyword, setNewKeyword] = useState('');

  // ── Load settings & status on open ───────────────────────────────────────
  const loadData = useCallback(async () => {
    try {
      const [s, st] = await Promise.all([getSettings(), getAutomationStatus()]);
      setSettings(s);
      setStatus(st);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setMessage('⚠ Failed to load settings');
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadData();
  }, [isOpen, loadData]);

  // ── Poll status every 10s while panel is open ───────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(async () => {
      try {
        const st = await getAutomationStatus();
        setStatus(st);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await updateSettings({
        interval_seconds: settings.interval_seconds,
        max_screenshots: settings.max_screenshots,
        alert_keywords: settings.alert_keywords,
        enable_webhook: settings.enable_webhook,
        webhook_url: settings.webhook_url,
      });
      setSettings(res.settings);
      setMessage('✓ Settings saved');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('⚠ Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    try {
      const res = await toggleAutomation();
      setStatus(prev => ({ ...prev, is_running: res.is_running }));
    } catch (err) {
      setMessage('⚠ Failed to toggle');
    }
  };

  const addKeyword = () => {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !settings.alert_keywords.includes(kw)) {
      setSettings(prev => ({
        ...prev,
        alert_keywords: [...prev.alert_keywords, kw],
      }));
      setNewKeyword('');
    }
  };

  const removeKeyword = (kw) => {
    setSettings(prev => ({
      ...prev,
      alert_keywords: prev.alert_keywords.filter(k => k !== kw),
    }));
  };

  if (!isOpen) return null;

  // ── Minutes display for interval ─────────────────────────────────────────
  const intervalMin = settings ? Math.round(settings.interval_seconds / 60) : '—';

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 998, backdropFilter: 'blur(4px)',
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '420px', maxWidth: '90vw',
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)',
        borderLeft: '1px solid rgba(99,102,241,0.3)',
        zIndex: 999,
        display: 'flex', flexDirection: 'column',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: '#e2e8f0',
        boxShadow: '-8px 0 30px rgba(0,0,0,0.5)',
        animation: 'slideIn 0.3s ease',
      }}>

        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#fff' }}>
              ⚙ Automation Settings
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Configure VLM monitoring & alerts
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            color: '#94a3b8', width: '36px', height: '36px', borderRadius: '10px',
            cursor: 'pointer', fontSize: '18px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.target.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.target.style.background = 'rgba(255,255,255,0.05)'}
          >✕</button>
        </div>

        {/* Content (scrollable) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {!settings ? (
            <p style={{ color: '#94a3b8', textAlign: 'center', marginTop: '40px' }}>Loading...</p>
          ) : (
            <>
              {/* ── Automation Toggle ─────────────────────────── */}
              <Section title="Automation Control">
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', borderRadius: '12px',
                  background: status?.is_running
                    ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${status?.is_running ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: status?.is_running ? '#4ade80' : '#f87171' }}>
                      {status?.is_running ? '● Running' : '○ Stopped'}
                    </div>
                    {status?.last_run_time && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                        Last scan: {new Date(status.last_run_time).toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                  <button onClick={handleToggle} style={{
                    padding: '8px 20px', borderRadius: '8px', border: 'none',
                    fontWeight: 600, fontSize: '13px', cursor: 'pointer',
                    background: status?.is_running
                      ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                      : 'linear-gradient(135deg, #22c55e, #16a34a)',
                    color: '#fff', transition: 'transform 0.15s',
                  }}
                    onMouseDown={e => e.target.style.transform = 'scale(0.95)'}
                    onMouseUp={e => e.target.style.transform = 'scale(1)'}
                  >
                    {status?.is_running ? 'Stop' : 'Start'}
                  </button>
                </div>
              </Section>

              {/* ── Monitoring Interval ──────────────────────── */}
              <Section title="Monitoring Interval">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range" min={60} max={1800} step={30}
                    value={settings.interval_seconds}
                    onChange={e => setSettings(prev => ({ ...prev, interval_seconds: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#6366f1' }}
                  />
                  <span style={{
                    minWidth: '60px', textAlign: 'center', padding: '6px 10px',
                    background: 'rgba(99,102,241,0.15)', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 600, color: '#a5b4fc',
                  }}>
                    {intervalMin} min
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>
                  Screenshots are taken every {intervalMin} minute{intervalMin !== 1 ? 's' : ''} and analyzed by VLM
                </p>
              </Section>

              {/* ── Max Cached Screenshots ───────────────────── */}
              <Section title="Screenshot Cache">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range" min={5} max={50} step={1}
                    value={settings.max_screenshots}
                    onChange={e => setSettings(prev => ({ ...prev, max_screenshots: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#6366f1' }}
                  />
                  <span style={{
                    minWidth: '50px', textAlign: 'center', padding: '6px 10px',
                    background: 'rgba(99,102,241,0.15)', borderRadius: '8px',
                    fontSize: '13px', fontWeight: 600, color: '#a5b4fc',
                  }}>
                    {settings.max_screenshots}
                  </span>
                </div>
                <p style={{ fontSize: '11px', color: '#64748b', margin: '8px 0 0' }}>
                  Keep the last {settings.max_screenshots} screenshots in cache
                </p>
              </Section>

              {/* ── Alert Keywords ───────────────────────────── */}
              <Section title="Alert Keywords">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                  {settings.alert_keywords.map(kw => (
                    <span key={kw} style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '4px 10px', borderRadius: '20px', fontSize: '12px',
                      background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                      color: '#fca5a5',
                    }}>
                      {kw}
                      <button onClick={() => removeKeyword(kw)} style={{
                        background: 'none', border: 'none', color: '#f87171',
                        cursor: 'pointer', padding: 0, fontSize: '14px', lineHeight: 1,
                      }}>×</button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addKeyword()}
                    placeholder="Add keyword..."
                    style={{
                      flex: 1, padding: '8px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                      fontSize: '13px', outline: 'none',
                    }}
                  />
                  <button onClick={addKeyword} style={{
                    padding: '8px 14px', borderRadius: '8px', border: 'none',
                    background: 'rgba(99,102,241,0.2)', color: '#a5b4fc',
                    cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  }}>Add</button>
                </div>
              </Section>

              {/* ── Webhook ──────────────────────────────────── */}
              <Section title="Webhook Notifications">
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontSize: '13px',
                }}>
                  <input
                    type="checkbox"
                    checked={settings.enable_webhook}
                    onChange={e => setSettings(prev => ({ ...prev, enable_webhook: e.target.checked }))}
                    style={{ accentColor: '#6366f1', width: '16px', height: '16px' }}
                  />
                  Enable webhook alerts
                </label>
                {settings.enable_webhook && (
                  <input
                    value={settings.webhook_url}
                    onChange={e => setSettings(prev => ({ ...prev, webhook_url: e.target.value }))}
                    placeholder="https://discord.com/api/webhooks/..."
                    style={{
                      width: '100%', marginTop: '10px', padding: '8px 12px',
                      borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.05)', color: '#e2e8f0',
                      fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                )}
              </Section>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 24px', borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {message && (
            <span style={{
              fontSize: '13px', fontWeight: 500,
              color: message.startsWith('✓') ? '#4ade80' : '#f97316',
            }}>{message}</span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', color: '#94a3b8',
              cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{
              padding: '10px 24px', borderRadius: '10px', border: 'none',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 700,
              opacity: saving ? 0.6 : 1, transition: 'all 0.2s',
              boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
            }}>
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}


// ── Reusable Section wrapper ─────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h3 style={{
        fontSize: '12px', fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '1px', color: '#64748b', marginBottom: '10px',
      }}>{title}</h3>
      {children}
    </div>
  );
}

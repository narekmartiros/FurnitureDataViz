'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box3DPrimitive,
  CutListPart,
  DEFAULT_STUDIO_PARAMS,
  DeducedSheetContext,
  HARDWARE_CATALOG,
  HardwareSlideProfile,
  SheetCutItem,
  StudioParams,
  TopologyTemplateType,
  buildCutList,
  buildTopology3D,
  deduceModelFromSheetRows,
  packCutListOnSheet,
  parseDelimitedSheetText,
  runEngineeringAudit
} from '@furniture-dataviz/parametric-engine';
import { Canvas3D } from '../components/Canvas3D';

const DEFAULT_SHEET =
  'https://docs.google.com/spreadsheets/d/1LHzcGKNfRrf2AiFofQuMi6__1n4H9Pac4hNHvcn7oNU/edit?gid=1016798837#gid=1016798837';

const TOPOLOGY_LABEL: Record<TopologyTemplateType, string> = {
  CABINET_CARGO_PULLOUT: 'Cargo pull-out',
  CABINET_MULTI_DRAWER: 'Multi-drawer',
  TABLE_WORKBENCH_DRAWER: 'Workbench table'
};

const PART_COLORS = ['#C4A574', '#7DD3FC', '#E8C39E', '#5C7A5C', '#F5D0A6', '#B08968'];

function cutItemsToParts(items: SheetCutItem[], thick: number): CutListPart[] {
  return items.map((item, i) => {
    const n = item.name.toLowerCase();
    const group: CutListPart['group'] = /table|top|столеш/.test(n)
      ? 'tabletop'
      : /drawer|ящик|facade|фасад/.test(n)
        ? 'drawer'
        : 'carcass';
    return {
      id: `sheet-${i}-${item.name}`,
      name: item.name,
      group,
      w: item.w,
      h: item.h,
      t: thick,
      qty: item.qty,
      cellRef: 'sheet',
      formula: `${item.w} × ${item.h}`,
      sheetFormulaE: String(item.w),
      sheetFormulaF: String(item.h),
      color: PART_COLORS[i % PART_COLORS.length],
      desc: 'From Google Sheet cut-list'
    };
  });
}

export default function StudioPage() {
  const [params, setParams] = useState<StudioParams>(DEFAULT_STUDIO_PARAMS.CABINET_CARGO_PULLOUT);
  const [deducedReason, setDeducedReason] = useState('Load a sheet to map labeled dimensions and cut parts.');
  const [sheetCuts, setSheetCuts] = useState<SheetCutItem[]>([]);
  const [hardwareId, setHardwareId] = useState<HardwareSlideProfile['id']>('gtv_meridian');
  const [pullOutPct, setPullOutPct] = useState(28);
  const [explodePct, setExplodePct] = useState(0);
  const [xrayMode, setXrayMode] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [cameraPreset, setCameraPreset] = useState<'iso' | 'front' | 'side' | 'top' | null>('iso');
  const [tab, setTab] = useState<'params' | 'cutlist' | 'audit'>('params');
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET);
  const [pasteText, setPasteText] = useState('');
  const [sync, setSync] = useState({ loading: false, ok: true, message: 'Ready', paste: false });
  const [visibleGroups, setVisibleGroups] = useState<Record<Box3DPrimitive['group'], boolean>>({
    frame: true,
    carcass: true,
    drawer: true,
    tabletop: true,
    railings: true
  });

  const applyDeduction = useCallback((deduced: DeducedSheetContext, message: string) => {
    setParams(deduced.params);
    setDeducedReason(deduced.confidenceReason);
    setSheetCuts(deduced.cutItems);
    setSync({ loading: false, ok: true, message, paste: false });
  }, []);

  const tryBrowserGviz = useCallback((url: string): Promise<(string | number)[][] | null> => {
    return new Promise((resolve) => {
      const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
      if (!idMatch) {
        resolve(null);
        return;
      }
      const cbName = `__sheetcraft_${Date.now()}`;
      const script = document.createElement('script');
      let settled = false;
      const cleanup = () => {
        delete (window as unknown as Record<string, unknown>)[cbName];
        script.remove();
      };
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve(null);
        }
      }, 4000);
      (window as unknown as Record<string, unknown>)[cbName] = (payload: {
        table?: { rows?: { c?: ({ v?: string | number | null; f?: string | null } | null)[] }[] };
      }) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        cleanup();
        const rawRows = payload?.table?.rows;
        if (!rawRows?.length) {
          resolve(null);
          return;
        }
        resolve(
          rawRows.map((r) =>
            (r.c || []).map((cell) => {
              if (!cell) return '';
              if (typeof cell.v === 'number') return cell.v;
              if (cell.v !== undefined && cell.v !== null) return String(cell.v);
              return cell.f ?? '';
            })
          )
        );
      };
      const gidParam = gidMatch ? `gid=${gidMatch[1]}` : 'sheet=Sheet20';
      script.src = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq?${gidParam}&headers=0&tqx=responseHandler:${cbName}`;
      script.onerror = () => {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          cleanup();
          resolve(null);
        }
      };
      document.body.appendChild(script);
    });
  }, []);

  const syncSheet = useCallback(
    async (rawText?: string) => {
      setSync((s) => ({ ...s, loading: true, message: 'Reading sheet…' }));
      try {
        if (!rawText) {
          const rows = await tryBrowserGviz(sheetUrl);
          if (rows && rows.length > 1) {
            applyDeduction(deduceModelFromSheetRows(rows), `Mapped ${rows.length} rows`);
            return;
          }
        }
        const res = await fetch('/api/sheet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(rawText ? { rawText } : { sheetUrl })
        });
        const data = await res.json();
        if (data.ok && data.deduced) {
          applyDeduction(data.deduced, `Mapped ${data.rowCount} rows`);
        } else {
          setSync({ loading: false, ok: false, message: 'Sheet is private — paste cells', paste: true });
        }
      } catch {
        setSync({ loading: false, ok: false, message: 'Sync failed — paste cells', paste: true });
      }
    },
    [applyDeduction, sheetUrl, tryBrowserGviz]
  );

  useEffect(() => {
    void syncSheet();
    // First load only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const text = e.clipboardData?.getData('text/plain');
      if (text && (text.includes('\t') || text.includes('\n'))) {
        const rows = parseDelimitedSheetText(text);
        if (rows.length >= 2) applyDeduction(deduceModelFromSheetRows(rows), `Pasted ${rows.length} rows`);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [applyDeduction]);

  const updateParam = <K extends keyof StudioParams>(key: K, value: StudioParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const boxes = useMemo(() => buildTopology3D(params), [params]);
  const generatedCut = useMemo(() => buildCutList(params), [params]);
  const cutList = useMemo(
    () => (sheetCuts.length ? cutItemsToParts(sheetCuts, params.woodThick) : generatedCut),
    [sheetCuts, params.woodThick, generatedCut]
  );
  const nesting = useMemo(() => packCutListOnSheet(cutList, 2440, 1220, 4), [cutList]);
  const audit = useMemo(() => runEngineeringAudit(params), [params]);
  const hardware = HARDWARE_CATALOG[hardwareId];
  const warnCount = audit.filter((f) => f.severity !== 'ok').length;

  const selectedPart = useMemo(() => {
    if (!selectedPartId) return null;
    const part = cutList.find((p) => p.id === selectedPartId);
    const box = boxes.find((b) => b.partId === selectedPartId || b.id === selectedPartId);
    if (!part && !box) return null;
    return {
      name: part?.name ?? box?.name ?? 'Part',
      dims: part ? `${part.w} × ${part.h} × ${part.t} mm` : `${box?.dims} mm`
    };
  }, [selectedPartId, cutList, boxes]);

  return (
    <div className="studio">
      <header className="topbar">
        <div className="brand">
          <div className="mark">S</div>
          <div>
            <h1>Sheetcraft</h1>
            <p>{TOPOLOGY_LABEL[params.topology]}</p>
          </div>
        </div>
        <div className="sync">
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="Google Sheets URL"
            aria-label="Google Sheets URL"
          />
          <button className="btn" disabled={sync.loading} onClick={() => void syncSheet()}>
            {sync.loading ? 'Syncing' : 'Sync'}
          </button>
          <button className="btn ghost" onClick={() => setSync((s) => ({ ...s, paste: !s.paste }))}>
            Paste
          </button>
        </div>
        <div className="status">
          <span className={`dot ${sync.ok ? '' : 'warn'}`} />
          {sync.message}
        </div>
      </header>

      {sync.paste && (
        <div className="paste">
          <div>
            Share the sheet with <strong>anyone who has the link</strong>, or paste cells here.
          </div>
          <input
            value={pasteText}
            placeholder="Ctrl/Cmd+V"
            onChange={(e) => setPasteText(e.target.value)}
            onPaste={(e) => {
              const clip = e.clipboardData.getData('text/plain');
              if (clip) {
                e.preventDefault();
                setPasteText(clip);
                void syncSheet(clip);
              }
            }}
          />
        </div>
      )}

      <div className="workspace">
        <main className="viewport">
          <Canvas3D
            boxes={boxes}
            params={params}
            selectedPartId={selectedPartId}
            onSelectPart={setSelectedPartId}
            pullOutPct={pullOutPct}
            explodePct={explodePct}
            xrayMode={xrayMode}
            visibleGroups={visibleGroups}
            cameraPreset={cameraPreset}
          />

          <div className="hud tl">
            {(['iso', 'front', 'side', 'top'] as const).map((preset) => (
              <button
                key={preset}
                className={`chip ${cameraPreset === preset ? 'on' : ''}`}
                onClick={() => setCameraPreset(preset)}
              >
                {preset}
              </button>
            ))}
            <div className="sep" />
            <button className={`chip ${xrayMode ? 'on' : ''}`} onClick={() => setXrayMode((v) => !v)}>
              X-ray
            </button>
            <div className="sep" />
            {(
              [
                ['frame', 'Frame', '#8a8378'],
                ['carcass', 'Carcass', '#C4A574'],
                ['drawer', 'Drawer', '#7DD3FC'],
                ['railings', 'Slides', '#E11D48']
              ] as const
            ).map(([grp, label, color]) => (
              <button
                key={grp}
                className="chip layer"
                onClick={() => setVisibleGroups((prev) => ({ ...prev, [grp]: !prev[grp] }))}
                style={{ opacity: visibleGroups[grp] ? 1 : 0.4 }}
              >
                <span className="swatch" style={{ background: color }} />
                {label}
              </button>
            ))}
          </div>

          {selectedPart && (
            <div className="hud tr">
              <div>
                <strong>{selectedPart.name}</strong>
                <div className="mono">{selectedPart.dims}</div>
              </div>
              <button className="chip" onClick={() => setSelectedPartId(null)}>
                Close
              </button>
            </div>
          )}

          <div className="hud bc">
            <label className="range">
              Open
              <input type="range" min={0} max={100} value={pullOutPct} onChange={(e) => setPullOutPct(Number(e.target.value))} />
              <span className="mono">{pullOutPct}%</span>
            </label>
            <div className="sep" />
            <label className="range">
              Explode
              <input type="range" min={0} max={100} value={explodePct} onChange={(e) => setExplodePct(Number(e.target.value))} />
              <span className="mono">{explodePct}%</span>
            </label>
          </div>
        </main>

        <aside className="inspector">
          <div className="hero">
            <div className="kicker">From sheet context</div>
            <h2>{TOPOLOGY_LABEL[params.topology]}</h2>
            <div className="reason">{deducedReason}</div>
            <div className="metrics">
              <div className="metric">
                <span>Envelope</span>
                <strong>
                  {params.envWidth}×{params.envHeight}×{params.envDepth}
                </strong>
              </div>
              <div className="metric">
                <span>Drawer</span>
                <strong>
                  {(params.drawerBoxWidth || params.drawerInnerWidth + 2 * params.woodThick) || '—'}×{params.drawerHeight}
                </strong>
              </div>
              <div className="metric">
                <span>Facade</span>
                <strong>
                  {params.facadeWidth || '—'}×{params.facadeHeight || '—'}
                </strong>
              </div>
            </div>
          </div>

          <div className="tabs">
            <button className={tab === 'params' ? 'on' : ''} onClick={() => setTab('params')}>
              Spec
            </button>
            <button className={tab === 'cutlist' ? 'on' : ''} onClick={() => setTab('cutlist')}>
              Parts {cutList.length}
            </button>
            <button className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')}>
              Audit{warnCount ? ` ${warnCount}` : ''}
            </button>
          </div>

          <div className="panel">
            {tab === 'params' && (
              <>
                <div className="group">
                  <h3>Model</h3>
                  <select
                    className="full"
                    value={params.topology}
                    onChange={(e) => {
                      const topology = e.target.value as TopologyTemplateType;
                      setParams((prev) => ({ ...prev, topology }));
                    }}
                  >
                    {Object.entries(TOPOLOGY_LABEL).map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="group">
                  <h3>Envelope</h3>
                  {(
                    [
                      ['envWidth', 'Width', 200, 2000, 5],
                      ['envHeight', 'Height', 400, 1200, 5],
                      ['envDepth', 'Depth', 300, 1000, 5],
                      ['metalSize', 'Steel', 15, 50, 5],
                      ['woodThick', 'Board', 12, 32, 1]
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <div className="field" key={key}>
                      <div className="field-row">
                        <label>{label}</label>
                        <div className="val">
                          <input
                            type="number"
                            value={params[key]}
                            onChange={(e) => updateParam(key, Number(e.target.value))}
                          />
                          <span className="cell">mm</span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={params[key]}
                        onChange={(e) => updateParam(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
                <div className="group">
                  <h3>Hardware</h3>
                  <select
                    className="full"
                    value={hardwareId}
                    onChange={(e) => {
                      const id = e.target.value as HardwareSlideProfile['id'];
                      setHardwareId(id);
                      updateParam('railingGap', Math.round(HARDWARE_CATALOG[id].sideClearanceMm * 10) / 10);
                    }}
                  >
                    {Object.values(HARDWARE_CATALOG).map((hw) => (
                      <option key={hw.id} value={hw.id}>
                        {hw.brand} {hw.model}
                      </option>
                    ))}
                  </select>
                  <div className="note">
                    <span>System 32</span>
                    <strong className="mono">{hardware.system32HoleOffsets.join(' · ')}</strong>
                  </div>
                  {(
                    [
                      ['railingGap', 'Slide gap', 10, 20, 0.5],
                      ['drawerHeight', 'Drawer height', 80, 700, 5],
                      ['drawerDepth', 'Slide length', 300, 550, 50],
                      ['sidePanelHeight', 'Side wall', 80, 240, 5],
                      ['facadeGap', 'Facade reveal', 1, 5, 0.5]
                    ] as const
                  ).map(([key, label, min, max, step]) => (
                    <div className="field" key={key}>
                      <div className="field-row">
                        <label>{label}</label>
                        <strong className="mono">{params[key]} mm</strong>
                      </div>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={params[key]}
                        onChange={(e) => updateParam(key, Number(e.target.value))}
                      />
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === 'cutlist' && (
              <>
                <div className="note">
                  <span>
                    {nesting.netAreaM2.toFixed(2)} m² · {nesting.edgeBandingMeters.toFixed(1)} m edge
                  </span>
                  <strong className="mono">{nesting.utilizationPct.toFixed(0)}% yield</strong>
                </div>
                <table className="list">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Size</th>
                      <th>Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cutList.map((part) => (
                      <tr
                        key={part.id}
                        className={selectedPartId === part.id ? 'active' : ''}
                        onClick={() => setSelectedPartId(selectedPartId === part.id ? null : part.id)}
                      >
                        <td>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <span className="swatch" style={{ background: part.color }} />
                            {part.name}
                          </div>
                        </td>
                        <td className="mono">
                          {part.w}×{part.h}
                        </td>
                        <td className="mono">×{part.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="group" style={{ marginTop: 18 }}>
                  <h3>Nesting</h3>
                  <svg
                    viewBox={`0 0 ${nesting.stockWidth} ${nesting.stockHeight}`}
                    style={{ width: '100%', background: '#fff', border: '1px solid var(--line)', borderRadius: 8 }}
                  >
                    {nesting.placed.map((rect, idx) => (
                      <rect
                        key={idx}
                        x={rect.x}
                        y={rect.y}
                        width={rect.w}
                        height={rect.h}
                        fill={rect.color}
                        fillOpacity={0.75}
                        stroke="#1c1915"
                        strokeWidth={3}
                      />
                    ))}
                  </svg>
                </div>
              </>
            )}

            {tab === 'audit' &&
              audit.map((f) => {
                const warn = f.severity !== 'ok';
                return (
                  <div key={f.ruleId} className={`finding ${warn ? 'warn' : ''}`}>
                    <div className="hd">
                      {f.title}
                      <span className={`badge ${warn ? 'warn' : ''}`}>{warn ? 'CHECK' : 'OK'}</span>
                    </div>
                    <p style={{ margin: '6px 0 0', color: 'var(--ink-2)', lineHeight: 1.45 }}>{f.description}</p>
                  </div>
                );
              })}
          </div>
        </aside>
      </div>
    </div>
  );
}

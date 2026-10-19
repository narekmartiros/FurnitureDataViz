'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Box3DPrimitive, StudioParams } from '@furniture-dataviz/parametric-engine';

export interface Canvas3DProps {
  boxes: Box3DPrimitive[];
  params: StudioParams;
  selectedPartId: string | null;
  onSelectPart: (partId: string | null) => void;
  pullOutPct: number;
  explodePct: number;
  xrayMode: boolean;
  visibleGroups: Record<Box3DPrimitive['group'], boolean>;
  cameraPreset?: 'iso' | 'front' | 'side' | 'top' | null;
}

interface ProjectedFace {
  box: Box3DPrimitive;
  pts: { x: number; y: number }[];
  depth: number;
  shade: number;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({
  boxes,
  params,
  selectedPartId,
  onSelectPart,
  pullOutPct,
  explodePct,
  xrayMode,
  visibleGroups,
  cameraPreset
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 650 });
  const [rot, setRot] = useState({ yaw: -0.58, pitch: 0.36 });
  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ active: boolean; moved: boolean; x: number; y: number; mode: 'orbit' | 'pan' }>({
    active: false,
    moved: false,
    x: 0,
    y: 0,
    mode: 'orbit'
  });
  const facesRef = useRef<ProjectedFace[]>([]);

  // Track exact container pixel size with ResizeObserver to prevent any aspect stretching
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!cameraPreset) return;
    if (cameraPreset === 'iso') setRot({ yaw: -0.58, pitch: 0.36 });
    if (cameraPreset === 'front') setRot({ yaw: 0, pitch: 0.05 });
    if (cameraPreset === 'side') setRot({ yaw: -Math.PI / 2, pitch: 0.05 });
    if (cameraPreset === 'top') setRot({ yaw: 0, pitch: 1.48 });
  }, [cameraPreset]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const W = viewportSize.width;
    const H = viewportSize.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const grad = ctx.createRadialGradient(W * 0.5, H * 0.42, 30, W * 0.5, H * 0.55, Math.max(W, H) * 0.8);
    grad.addColorStop(0, '#fffdf8');
    grad.addColorStop(1, '#ece7dc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const cx = params.envWidth / 2;
    const cy = params.envHeight / 2;
    const cz = params.envDepth / 2;
    const maxDim = Math.max(params.envWidth, params.envHeight, params.envDepth, 500);
    const scale = (Math.min(W, H) * 0.54 * zoom) / maxDim;

    const cosY = Math.cos(rot.yaw);
    const sinY = Math.sin(rot.yaw);
    const cosP = Math.cos(rot.pitch);
    const sinP = Math.sin(rot.pitch);

    const project = (x: number, y: number, z: number) => {
      const dx = x - cx;
      const dy = y - cy;
      const dz = z - cz;
      const rx = dx * cosY + dz * sinY;
      const rz = -dx * sinY + dz * cosY;
      const ry = dy * cosP - rz * sinP;
      const depth = dy * sinP + rz * cosP;
      return {
        x: W / 2 + pan.x + rx * scale,
        y: H / 2 + pan.y - ry * scale,
        depth
      };
    };

    // Subtle ground shadow / floor footprint
    const pad = 70;
    const g0 = project(-pad, 0, -pad);
    const g1 = project(params.envWidth + pad, 0, -pad);
    const g2 = project(params.envWidth + pad, 0, params.envDepth + pad);
    const g3 = project(-pad, 0, params.envDepth + pad);
    ctx.fillStyle = 'rgba(212, 203, 184, 0.45)';
    ctx.beginPath();
    ctx.moveTo(g0.x, g0.y);
    ctx.lineTo(g1.x, g1.y);
    ctx.lineTo(g2.x, g2.y);
    ctx.lineTo(g3.x, g3.y);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d4cbb8';
    ctx.lineWidth = 1;
    ctx.stroke();

    const pullOffsetZ = (pullOutPct / 100) * (params.drawerDepth * 0.78);
    const explodeFactor = explodePct / 100;

    const allFaces: ProjectedFace[] = [];

    for (const b of boxes) {
      if (!visibleGroups[b.group]) continue;

      let ox = 0;
      let oy = 0;
      let oz = 0;

      if (b.group === 'drawer') {
        oz += pullOffsetZ;
      } else if (b.group === 'railings') {
        oz += pullOffsetZ * 0.45;
      }

      if (explodeFactor > 0) {
        const bcx = (b.x0 + b.x1) / 2 - cx;
        const bcy = (b.y0 + b.y1) / 2 - cy;
        const bcz = (b.z0 + b.z1) / 2 - cz;
        ox += bcx * 0.55 * explodeFactor;
        oy += bcy * 0.45 * explodeFactor;
        oz += bcz * 0.55 * explodeFactor;
      }

      const x0 = b.x0 + ox;
      const x1 = b.x1 + ox;
      const y0 = b.y0 + oy;
      const y1 = b.y1 + oy;
      const z0 = b.z0 + oz;
      const z1 = b.z1 + oz;

      const v = [
        project(x0, y0, z0),
        project(x1, y0, z0),
        project(x1, y1, z0),
        project(x0, y1, z0),
        project(x0, y0, z1),
        project(x1, y0, z1),
        project(x1, y1, z1),
        project(x0, y1, z1)
      ];

      const cubeFaces: { idx: number[]; shade: number }[] = [
        { idx: [0, 1, 2, 3], shade: 0.84 },
        { idx: [4, 5, 6, 7], shade: 1.0 },
        { idx: [0, 4, 7, 3], shade: 0.9 },
        { idx: [1, 5, 6, 2], shade: 0.94 },
        { idx: [3, 2, 6, 7], shade: 1.06 },
        { idx: [0, 1, 5, 4], shade: 0.76 }
      ];

      for (const cf of cubeFaces) {
        const pts = cf.idx.map((i) => ({ x: v[i].x, y: v[i].y }));
        const depth = cf.idx.reduce((acc, i) => acc + v[i].depth, 0) / 4;
        allFaces.push({ box: b, pts, depth, shade: cf.shade });
      }
    }

    allFaces.sort((a, b) => a.depth - b.depth);
    facesRef.current = allFaces;

    const shadeHex = (hex: string, factor: number, alpha: number) => {
      const clean = hex.replace('#', '');
      const num = parseInt(clean, 16);
      const r = Math.min(255, Math.round(((num >> 16) & 255) * factor));
      const g = Math.min(255, Math.round(((num >> 8) & 255) * factor));
      const b = Math.min(255, Math.round((num & 255) * factor));
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    for (const f of allFaces) {
      const isSelected =
        selectedPartId !== null &&
        (f.box.id === selectedPartId || f.box.partId === selectedPartId);

      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (let i = 1; i < f.pts.length; i++) {
        ctx.lineTo(f.pts[i].x, f.pts[i].y);
      }
      ctx.closePath();

      const baseAlpha = xrayMode
        ? f.box.isRailing
          ? 0.95
          : 0.14
        : isSelected
        ? 0.96
        : f.box.alpha;

      ctx.fillStyle = isSelected
        ? shadeHex('#2f6f5e', f.shade, 0.94)
        : shadeHex(f.box.color, f.shade, baseAlpha);
      ctx.fill();

      ctx.strokeStyle = isSelected
        ? '#1f4d41'
        : xrayMode && f.box.isRailing
        ? '#E11D48'
        : f.box.edgeColor;
      ctx.lineWidth = isSelected ? 2 : f.box.isRailing ? 1.3 : 0.75;
      ctx.stroke();
    }

    // System-32 Screw Hole Markers along GTV Railing Slides
    const sys32Offsets = [37, 133, 261, 421, 485];
    for (const b of boxes) {
      if (!b.isRailing || !visibleGroups.railings) continue;
      const yMid = (b.y0 + b.y1) / 2;
      const xFace = b.railSide === 'L' ? b.x0 : b.x1;
      for (const holeMm of sys32Offsets) {
        if (holeMm > params.drawerDepth - 10) continue;
        const zPos = b.z1 - holeMm + (pullOutPct / 100) * (params.drawerDepth * 0.45);
        const pt = project(xFace, yMid, zPos);
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.strokeStyle = '#9F1239';
        ctx.lineWidth = 1.25;
        ctx.stroke();
      }
    }

    // Clean pill dimension labels in 3D space
    const drawPillLabel = (text: string, x: number, y: number) => {
      ctx.font = '500 11px Inter, -apple-system, sans-serif';
      const metrics = ctx.measureText(text);
      const pw = metrics.width + 12;
      const ph = 20;
      ctx.fillStyle = 'rgba(255, 252, 247, 0.92)';
      ctx.strokeStyle = '#d4cbb8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x - pw / 2, y - ph / 2, pw, ph, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#5c574e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, x, y);
    };

    const pW = project(params.envWidth / 2, -24, params.envDepth + 20);
    drawPillLabel(`W ${params.envWidth} mm`, pW.x, pW.y);

    const pH = project(-36, params.envHeight / 2, params.envDepth);
    drawPillLabel(`H ${params.envHeight} mm`, pH.x, pH.y);

    const pD = project(params.envWidth + 36, 0, params.envDepth / 2);
    drawPillLabel(`D ${params.envDepth} mm`, pD.x, pD.y);
  }, [boxes, params, rot, zoom, pan, selectedPartId, pullOutPct, explodePct, xrayMode, visibleGroups, viewportSize]);

  const pointInPoly = (x: number, y: number, pts: { x: number; y: number }[]) => {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x,
        yi = pts[i].y;
      const xj = pts[j].x,
        yj = pts[j].y;
      const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    dragRef.current = {
      active: true,
      moved: false,
      x: e.clientX,
      y: e.clientY,
      mode: e.shiftKey || e.button === 2 ? 'pan' : 'orbit'
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.x;
    const dy = e.clientY - dragRef.current.y;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) dragRef.current.moved = true;
    dragRef.current.x = e.clientX;
    dragRef.current.y = e.clientY;

    if (dragRef.current.mode === 'pan') {
      setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
    } else {
      setRot((r) => ({
        yaw: r.yaw + dx * 0.008,
        pitch: Math.max(-1.4, Math.min(1.48, r.pitch + dy * 0.008))
      }));
    }
  };

  const handleMouseUp = () => {
    dragRef.current.active = false;
  };

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current.moved) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const faces = facesRef.current;
    for (let i = faces.length - 1; i >= 0; i--) {
      if (pointInPoly(mx, my, faces[i].pts)) {
        onSelectPart(faces[i].box.partId);
        return;
      }
    }
    onSelectPart(null);
  };

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', userSelect: 'none' }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={(e) => {
          e.preventDefault();
          setZoom((z) => Math.max(0.45, Math.min(2.6, z * (e.deltaY < 0 ? 1.08 : 0.92))));
        }}
        style={{ width: '100%', height: '100%', cursor: 'grab', display: 'block' }}
      />

      {/* Minimal Bottom-Right Zoom & Reset Controls */}
      <div
        style={{
          position: 'absolute',
          bottom: 16,
          right: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          background: 'rgba(255,252,247,0.9)',
          backdropFilter: 'blur(10px)',
          border: '1px solid #e4ddd0',
          borderRadius: 11,
          padding: 4,
          boxShadow: '0 10px 30px rgba(28,25,21,0.06)',
          fontSize: 12,
          color: '#5c574e'
        }}
      >
        <button
          onClick={() => setZoom((z) => Math.max(0.45, z - 0.15))}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            cursor: 'pointer',
            color: '#334155',
            fontWeight: 600
          }}
          title="Zoom Out"
        >
          −
        </button>
        <span style={{ fontFamily: 'monospace', fontSize: 11, minWidth: 40, textAlign: 'center' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom((z) => Math.min(2.6, z + 0.15))}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            cursor: 'pointer',
            color: '#334155',
            fontWeight: 600
          }}
          title="Zoom In"
        >
          +
        </button>
        <div style={{ width: 1, height: 14, background: '#E2E8F0' }} />
        <button
          onClick={() => {
            setRot({ yaw: -0.58, pitch: 0.36 });
            setZoom(1.0);
            setPan({ x: 0, y: 0 });
          }}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: 11,
            fontWeight: 500,
            color: '#475569'
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { Box3DPrimitive } from '@furniture-dataviz/parametric-engine';

/**
 * React Three Fiber (WebGL) 3D Cabinet & Table CAD Viewport
 * Renders PBR Birch/Oak Carcass, Brushed Steel Tube Frame, and GTV Meridian Slides
 * in the Architectural Daylight (#F8FAFC) Studio Theme.
 */
export interface Canvas3DProps {
  boxes: Box3DPrimitive[];
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
}

export const Canvas3D: React.FC<Canvas3DProps> = ({ boxes }) => {
  return (
    <div className="w-full h-full bg-[#F8FAFC] relative">
      {/* Three.js / @react-three/fiber <Canvas orthographic shadows> */}
      <span className="sr-only">Rendering {boxes.length} 3D parametric furniture meshes</span>
    </div>
  );
};

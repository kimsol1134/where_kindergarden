'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import GripVertical from 'lucide-react/dist/esm/icons/grip-vertical';

interface PanelResizerProps {
  onResize: (width: number) => void;
  minWidth: number;
  maxWidth: number;
  initialWidth: number;
}

export function PanelResizer({
  onResize,
  minWidth,
  maxWidth,
  initialWidth,
}: PanelResizerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(initialWidth);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = initialWidth;
    },
    [initialWidth]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      setIsDragging(true);
      startXRef.current = e.touches[0].clientX;
      startWidthRef.current = initialWidth;
    },
    [initialWidth]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startXRef.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + deltaX)
      );
      onResize(newWidth);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - startXRef.current;
      const newWidth = Math.min(
        maxWidth,
        Math.max(minWidth, startWidthRef.current + deltaX)
      );
      onResize(newWidth);
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, minWidth, maxWidth, onResize]);

  return (
    <div
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
      className={`hidden md:flex items-center justify-center w-2 bg-gray-100 hover:bg-emerald-100 cursor-col-resize transition-colors group z-30 ${
        isDragging ? 'bg-emerald-200' : ''
      }`}
    >
      <div
        className={`p-1 rounded bg-gray-200 group-hover:bg-emerald-300 transition-colors ${
          isDragging ? 'bg-emerald-400' : ''
        }`}
      >
        <GripVertical className="w-3 h-3 text-gray-400 group-hover:text-emerald-600" />
      </div>
    </div>
  );
}

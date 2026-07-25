import { useEffect, useRef, useState } from 'react';

export type PopoverTip = {
  x: number;
  y: number;
  title: string;
  lines: string[];
};

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function usePopoverTooltip() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tip, setTip] = useState<PopoverTip | null>(null);

  useEffect(() => {
    if (!tip) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = containerRef.current;
      if (!el) return;
      if (el.contains(e.target as Node)) return;
      setTip(null);
    };
    window.addEventListener('pointerdown', onPointerDown, { capture: true });
    return () =>
      window.removeEventListener('pointerdown', onPointerDown, {
        capture: true,
      } as AddEventListenerOptions);
  }, [tip]);

  const show = (
    e:
      | Pick<React.MouseEvent, 'clientX' | 'clientY'>
      | Pick<React.PointerEvent, 'clientX' | 'clientY'>,
    next: Omit<PopoverTip, 'x' | 'y'>,
  ) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = clamp(rawX, 64, rect.width - 64);
    const y = clamp(rawY, 36, rect.height - 12);
    setTip({ x, y, ...next });
  };

  const hide = () => setTip(null);

  return { containerRef, tip, show, hide };
}

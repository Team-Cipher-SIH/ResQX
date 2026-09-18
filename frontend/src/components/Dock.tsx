'use client';

import {
  motion,
  MotionValue,
  useMotionValue,
  useSpring,
  useTransform,
  type SpringOptions,
  AnimatePresence,
} from 'motion/react';

import React, {
  Children,
  cloneElement,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type DockItemData = {
  icon: React.ReactNode;
  label: React.ReactNode;
  onClick: () => void;
  className?: string;
};

export type DockProps = {
  items?: DockItemData[];
  className?: string;
  distance?: number;
  panelHeight?: number;
  baseItemSize?: number;
  dockHeight?: number;
  magnification?: number;
  spring?: SpringOptions;
};

type DockItemProps = {
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  mouseX: MotionValue<number>;
  spring: SpringOptions;
  distance: number;
  baseItemSize: number;
  magnification: number;
  label?: React.ReactNode;
};

function DockItem({
  children,
  className = '',
  onClick,
  mouseX,
  spring,
  distance,
  magnification,
  baseItemSize,
  label,
}: DockItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isHovered = useMotionValue(0);

  const mouseDistance = useTransform(mouseX, (val) => {
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    };

    return val - rect.x - baseItemSize / 2;
  });

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  );

  const size = useSpring(targetSize, spring);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>
  ) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <motion.div
      ref={ref}
      style={{
        width: size,
        height: size,
      }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={`
        relative inline-flex
        items-center justify-center
        rounded-full
        border-2 border-slate-200
        bg-white
        shadow-sm
        transition-shadow
        hover:shadow-md
        ${className}
      `}
      tabIndex={0}
      role="button"
      aria-label={
        typeof label === 'string'
          ? label
          : undefined
      }
    >
      {Children.map(children, (child) => {
        if (!React.isValidElement(child)) {
          return child;
        }

        return cloneElement(
          child as React.ReactElement<{
            isHovered?: MotionValue<number>;
          }>,
          {
            isHovered,
          }
        );
      })}
    </motion.div>
  );
}

type DockLabelProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockLabel({
  children,
  className = '',
  isHovered,
}: DockLabelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isHovered) return;

    const unsubscribe = isHovered.on(
      'change',
      (latest) => {
        setIsVisible(latest === 1);
      }
    );

    return () => unsubscribe();
  }, [isHovered]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{
            opacity: 0,
            y: 0,
          }}
          animate={{
            opacity: 1,
            y: -10,
          }}
          exit={{
            opacity: 0,
            y: 0,
          }}
          transition={{
            duration: 0.2,
          }}
          className={`
            absolute
            -top-7
            left-1/2
            z-50
            w-fit
            -translate-x-1/2
            whitespace-nowrap
            rounded-md
            border
            border-slate-700
            bg-slate-900
            px-2
            py-1
            text-[10px]
            font-medium
            text-white
            shadow-lg
            ${className}
          `}
          role="tooltip"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type DockIconProps = {
  className?: string;
  children: React.ReactNode;
  isHovered?: MotionValue<number>;
};

function DockIcon({
  children,
  className = '',
}: DockIconProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
    >
      {children}
    </div>
  );
}

export default function Dock({
  items = [],
  className = '',
  spring = {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  },
  magnification = 52,
  distance = 135,
  panelHeight = 50,
  dockHeight = 64,
  baseItemSize = 36,
}: DockProps) {
  const mouseX = useMotionValue(Infinity);
  const isHovered = useMotionValue(0);

  /*
   * Extra safety:
   * Even if the component temporarily receives
   * an undefined value during development/HMR,
   * the render will not crash.
   */
  const safeItems = Array.isArray(items) ? items : [];

  const maxHeight = useMemo(
    () =>
      Math.max(
        dockHeight,
        magnification + magnification / 2 + 4
      ),
    [dockHeight, magnification]
  );

  const heightRow = useTransform(
    isHovered,
    [0, 1],
    [panelHeight, maxHeight]
  );

  const height = useSpring(
    heightRow,
    spring
  );

  return (
    <motion.div
      style={{
        height,
        scrollbarWidth: 'none',
      }}
      className="relative mx-2 flex h-full max-w-full items-center justify-center"
    >
      <motion.div
        onMouseMove={(event) => {
          isHovered.set(1);
          mouseX.set(event.clientX);
        }}
        onMouseLeave={() => {
          isHovered.set(0);
          mouseX.set(Infinity);
        }}
        className={`
          absolute
          left-1/2
          top-1/2
          z-20
          flex
          w-fit
          -translate-x-1/2
          -translate-y-1/2
          items-end
          gap-2
          rounded-2xl
          border
          border-slate-200
          bg-white/95
          px-3
          py-1.5
          shadow-sm
          backdrop-blur-md
          ${className}
        `}
        style={{
          height: panelHeight,
        }}
        role="toolbar"
        aria-label="Application dock"
      >
        {safeItems.map((item, index) => (
          <DockItem
            key={index}
            onClick={item.onClick}
            className={item.className}
            mouseX={mouseX}
            spring={spring}
            distance={distance}
            magnification={magnification}
            baseItemSize={baseItemSize}
            label={item.label}
          >
            <DockIcon>
              {item.icon}
            </DockIcon>

            <DockLabel>
              {item.label}
            </DockLabel>
          </DockItem>
        ))}
      </motion.div>
    </motion.div>
  );
}
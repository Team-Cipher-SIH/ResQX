'use client';

import {
  useEffect,
  useRef,
  type CSSProperties,
  type MouseEventHandler,
  type ReactNode,
} from 'react';

import {
  Renderer,
  Program,
  Mesh,
  Triangle,
  Color,
} from 'ogl';

type ButtonSize = 'sm' | 'md' | 'lg';

export interface SpecularButtonProps {
  children?: ReactNode;
  size?: ButtonSize;
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

interface ShaderProps {
  radius: number;
  lineColor: string;
  baseColor: string;
  intensity: number;
  shineSize: number;
  shineFade: number;
  thickness: number;
  speed: number;
  followMouse: boolean;
  proximity: number;
  autoAnimate: boolean;
}

const PAD = 20;

const SIZES: Record<ButtonSize, string> = {
  sm: 'text-[0.85rem] px-[22px] py-[10px]',
  md: 'text-[1rem] px-[30px] py-[14px]',
  lg: 'text-[1.15rem] px-10 py-[18px]',
};

const VERT = `#version 300 es
in vec2 position;

void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 uCenter;
uniform vec2 uHalfSize;
uniform float uRadius;
uniform float uAngle;
uniform float uPx;
uniform vec3 uLineColor;
uniform vec3 uBaseColor;
uniform float uIntensity;
uniform float uShineSize;
uniform float uShineFade;
uniform float uThickness;
uniform float uBaseWidth;

out vec4 fragColor;

float sdRoundedRect(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

float shapeSDF(vec2 p) {
  return sdRoundedRect(p, uHalfSize, uRadius);
}

float gaussianLine(float d, float sigma) {
  float x = d / (sigma + 1e-6);
  float k = mix(1.0, 1.6, smoothstep(0.0, 1.5, x));
  return exp(-k * x * x);
}

void main() {
  vec2 p = gl_FragCoord.xy - uCenter;

  float d = shapeSDF(p);

  vec2 L = vec2(
    cos(uAngle),
    sin(uAngle)
  );

  float base =
    (1.0 - smoothstep(
      0.0,
      uBaseWidth,
      abs(d)
    )) * 0.45;

  vec2 nEll =
    normalize(
      p / (uHalfSize * uHalfSize) + 1e-6
    );

  float phi =
    acos(
      clamp(
        abs(dot(nEll, L)),
        0.0,
        1.0
      )
    );

  float rim =
    1.0 -
    smoothstep(
      uShineSize - uShineFade,
      uShineSize + uShineFade + 1e-4,
      phi
    );

  float line =
    gaussianLine(
      d,
      uThickness
    );

  float edgeClamp =
    1.0 -
    smoothstep(
      0.5 * uPx,
      3.0 * uPx,
      abs(d)
    );

  float hi =
    line *
    rim *
    edgeClamp *
    uIntensity;

  vec3 col =
    uBaseColor * base +
    uLineColor * hi;

  float a =
    clamp(
      base + hi,
      0.0,
      1.0
    );

  fragColor =
    vec4(col, a);
}
`;

const SpecularButton = ({
  children = 'Get Started',
  size = 'lg',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity = 250,
  autoAnimate = false,
  disabled = false,
  onClick,
  className = '',
  type = 'button',
}: SpecularButtonProps) => {
  const btnRef =
    useRef<HTMLButtonElement>(null);

  const fxRef =
    useRef<HTMLSpanElement>(null);

  const propsRef =
    useRef<ShaderProps>({
      radius,
      lineColor,
      baseColor,
      intensity,
      shineSize,
      shineFade,
      thickness,
      speed,
      followMouse,
      proximity,
      autoAnimate,
    });

  // Keep latest props available to the animation loop.
  propsRef.current = {
    radius,
    lineColor,
    baseColor,
    intensity,
    shineSize,
    shineFade,
    thickness,
    speed,
    followMouse,
    proximity,
    autoAnimate,
  };

  useEffect(() => {
    const btn = btnRef.current;
    const fx = fxRef.current;

    if (!btn || !fx) {
      return;
    }

    const dpr =
      window.devicePixelRatio || 1;

    const renderer = new Renderer({
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      dpr,
    });

    const gl = renderer.gl;

    gl.clearColor(0, 0, 0, 0);

    gl.enable(gl.BLEND);

    gl.blendFunc(
      gl.ONE,
      gl.ONE_MINUS_SRC_ALPHA
    );

    const geometry = new Triangle(gl);

    if (geometry.attributes.uv) {
      delete geometry.attributes.uv;
    }

    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uCenter: {
          value: [0, 0],
        },

        uHalfSize: {
          value: [1, 1],
        },

        uRadius: {
          value: 0,
        },

        uAngle: {
          value: 2.4,
        },

        uPx: {
          value: dpr,
        },

        uLineColor: {
          value: [1, 1, 1],
        },

        uBaseColor: {
          value: [0.32, 0.32, 0.32],
        },

        uIntensity: {
          value: 1,
        },

        uShineSize: {
          value: 0.17,
        },

        uShineFade: {
          value: 0.7,
        },

        uThickness: {
          value: 1,
        },

        uBaseWidth: {
          value: dpr,
        },
      },
    });

    const mesh = new Mesh(gl, {
      geometry,
      program,
    });

    fx.appendChild(gl.canvas);

    const sizeRef = {
      w: 1,
      h: 1,
    };

    const resize = () => {
      const rect =
        btn.getBoundingClientRect();

      const width = rect.width;
      const height = rect.height;

      sizeRef.w = width;
      sizeRef.h = height;

      renderer.setSize(
        width + PAD * 2,
        height + PAD * 2
      );

      program.uniforms.uCenter.value = [
        (PAD + width / 2) * dpr,
        (PAD + height / 2) * dpr,
      ];

      program.uniforms.uHalfSize.value = [
        (width / 2) * dpr,
        (height / 2) * dpr,
      ];

      program.uniforms.uPx.value = dpr;
      program.uniforms.uBaseWidth.value =
        dpr;
    };

    const resizeObserver =
      new ResizeObserver(resize);

    resizeObserver.observe(btn);

    resize();

    // =====================================================
    // POINTER / SHINE STATE
    // =====================================================

    let pointerAngle: number | null = null;
    let proximityT = 0;

    const onPointerMove = (
      event: PointerEvent
    ) => {
      const rect =
        btn.getBoundingClientRect();

      const centerX =
        rect.left + rect.width / 2;

      const centerY =
        rect.top + rect.height / 2;

      const dx = Math.max(
        rect.left - event.clientX,
        0,
        event.clientX - rect.right
      );

      const dy = Math.max(
        rect.top - event.clientY,
        0,
        event.clientY - rect.bottom
      );

      const distanceFromButton =
        Math.hypot(dx, dy);

      if (distanceFromButton === 0) {
        const halfWidth =
          Math.max(
            rect.width / 2,
            1
          );

        const halfHeight =
          Math.max(
            rect.height / 2,
            1
          );

        const normalizedX =
          (event.clientX - centerX) /
          halfWidth;

        const normalizedY =
          (centerY - event.clientY) /
          halfHeight;

        pointerAngle =
          Math.atan2(
            2 / Math.max(rect.height, 1),
            -2 / Math.max(rect.width, 1)
          ) +
          normalizedX * 0.3 +
          normalizedY * 0.15;
      } else {
        pointerAngle =
          Math.atan2(
            centerY - event.clientY,
            event.clientX - centerX
          );
      }

      const configuredProximity =
        Math.max(
          propsRef.current.proximity,
          1
        );

      const normalizedProximity =
        Math.max(
          0,
          1 -
            distanceFromButton /
              configuredProximity
        );

      // Smoothstep interpolation
      proximityT =
        normalizedProximity *
        normalizedProximity *
        (3 -
          2 *
            normalizedProximity);
    };

    window.addEventListener(
      'pointermove',
      onPointerMove
    );

    // =====================================================
    // ANIMATION STATE
    // =====================================================

    let angle = 2.4;
    let idleAngle = 2.4;
    let brightness = 0;

    let lastTime =
      performance.now();

    let animationFrame = 0;

    const lineColor =
      new Color();

    const baseColor =
      new Color();

    const update = (
      now: number
    ) => {
      animationFrame =
        requestAnimationFrame(update);

      const deltaTime = Math.min(
        (now - lastTime) / 1000,
        0.05
      );

      lastTime = now;

      const props =
        propsRef.current;

      // Slow background sweep
      idleAngle +=
        props.speed *
        deltaTime;

      // ===================================================
      // Determine target angle
      // ===================================================

      const shouldFollowPointer =
        props.followMouse &&
        pointerAngle !== null &&
        (
          !props.autoAnimate ||
          proximityT > 0
        );

      const targetAngle: number =
        shouldFollowPointer &&
        pointerAngle !== null
          ? pointerAngle
          : idleAngle;

      // ===================================================
      // Smooth angle transition
      // ===================================================

      const angleDifference =
        (
          (
            targetAngle -
            angle +
            Math.PI * 3
          ) %
            (Math.PI * 2)
        ) -
        Math.PI;

      angle +=
        angleDifference *
        (
          1 -
          Math.exp(
            -deltaTime * 7
          )
        );

      // ===================================================
      // Brightness
      // ===================================================

      const targetBrightness: number =
        props.autoAnimate
          ? 1
          : proximityT;

      brightness +=
        (
          targetBrightness -
          brightness
        ) *
        (
          1 -
          Math.exp(
            -deltaTime * 8
          )
        );

      // ===================================================
      // Shader colors
      // ===================================================

      lineColor.set(
        props.lineColor
      );

      baseColor.set(
        props.baseColor
      );

      // ===================================================
      // Shader uniforms
      // ===================================================

      program.uniforms.uAngle.value =
        angle;

      program.uniforms.uRadius.value =
        Math.min(
          props.radius,
          Math.min(
            sizeRef.w,
            sizeRef.h
          ) / 2
        ) * dpr;

      program.uniforms.uLineColor.value =
        [
          lineColor.r,
          lineColor.g,
          lineColor.b,
        ];

      program.uniforms.uBaseColor.value =
        [
          baseColor.r,
          baseColor.g,
          baseColor.b,
        ];

      program.uniforms.uIntensity.value =
        props.intensity *
        brightness;

      program.uniforms.uShineSize.value =
        (
          props.shineSize *
          Math.PI
        ) / 180;

      program.uniforms.uShineFade.value =
        (
          props.shineFade *
          Math.PI
        ) / 180;

      program.uniforms.uThickness.value =
        props.thickness *
        dpr;

      renderer.render({
        scene: mesh,
      });
    };

    animationFrame =
      requestAnimationFrame(update);

    // =====================================================
    // CLEANUP
    // =====================================================

    return () => {
      cancelAnimationFrame(
        animationFrame
      );

      resizeObserver.disconnect();

      window.removeEventListener(
        'pointermove',
        onPointerMove
      );

      if (
        gl.canvas.parentNode ===
        fx
      ) {
        fx.removeChild(
          gl.canvas
        );
      }

      gl
        .getExtension(
          'WEBGL_lose_context'
        )
        ?.loseContext();
    };
  }, []);

  const buttonBackground =
    tintOpacity >= 1
      ? tint
      : `color-mix(in srgb, ${tint} ${Math.max(
          0,
          Math.min(1, tintOpacity)
        ) * 100}%, transparent)`;

  return (
    <button
      ref={btnRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`
        relative
        m-0
        inline-flex
        cursor-pointer
        items-center
        justify-center
        border
        font-medium
        leading-none
        tracking-[0.01em]
        outline-none
        transition-all
        duration-200

        active:scale-[0.97]

        disabled:cursor-default
        disabled:opacity-55
        disabled:active:scale-100

        focus-visible:outline-2
        focus-visible:outline-offset-[3px]

        ${SIZES[size] || SIZES.md}

        ${className}
      `}
      style={{
        color: textColor,
        background: buttonBackground,
        borderColor: lineColor,
        borderRadius: `${radius}px`,
        backdropFilter: `blur(${blur}px)`,
        WebkitBackdropFilter: `blur(${blur}px)`,
        boxSizing: 'border-box',
      }}
    >
      <span
        ref={fxRef}
        aria-hidden="true"
        className="
          pointer-events-none
          absolute
          -inset-5
          z-[1]

          [&_canvas]:block
          [&_canvas]:h-full
          [&_canvas]:w-full
        "
      />

      <span
        className="
          relative
          z-[10]
          flex
          items-center
          justify-center
          text-current
        "
      >
        {children}
      </span>
    </button>
  );
};

export default SpecularButton;
import type { SvgFillDefinition } from "@/features/editor/fill-styles";

export function SvgFillDefinitions({
  definitions,
}: {
  definitions: readonly SvgFillDefinition[];
}) {
  if (definitions.length === 0) return null;

  return (
    <defs>
      {definitions.map((definition) => (
        <SvgFillDefinitionNode key={definition.id} definition={definition} />
      ))}
    </defs>
  );
}

function SvgFillDefinitionNode({
  definition,
}: {
  definition: SvgFillDefinition;
}) {
  if (definition.type === "linear-gradient") {
    return (
      <linearGradient
        id={definition.id}
        x1="0%"
        y1="0%"
        x2="100%"
        y2="0%"
        gradientTransform={`rotate(${definition.angle} .5 .5)`}
      >
        <stop offset="0%" stopColor={definition.from} />
        <stop offset="100%" stopColor={definition.to} />
      </linearGradient>
    );
  }

  if (definition.type === "radial-gradient") {
    return (
      <radialGradient id={definition.id} cx="50%" cy="50%" r="70%">
        <stop offset="0%" stopColor={definition.from} />
        <stop offset="100%" stopColor={definition.to} />
      </radialGradient>
    );
  }

  const halfScale = definition.scale / 2;

  if (definition.type === "pattern") {
    return (
      <pattern
        id={definition.id}
        width={definition.scale}
        height={definition.scale}
        patternUnits="userSpaceOnUse"
      >
        <rect width="100%" height="100%" fill={definition.background} />
        {definition.pattern === "dot-grid" ? (
          <circle
            cx={halfScale}
            cy={halfScale}
            r={Math.max(1, definition.scale * 0.1)}
            fill={definition.color}
            opacity={definition.opacity}
          />
        ) : null}
        {definition.pattern === "checker" ? (
          <>
            <rect
              x="0"
              y="0"
              width={halfScale}
              height={halfScale}
              fill={definition.color}
              opacity={definition.opacity}
            />
            <rect
              x={halfScale}
              y={halfScale}
              width={halfScale}
              height={halfScale}
              fill={definition.color}
              opacity={definition.opacity}
            />
          </>
        ) : null}
        {definition.pattern === "diagonal-stripes" ? (
          <path
            d={`M ${-halfScale} ${halfScale} L ${halfScale} ${-halfScale} M 0 ${definition.scale} L ${definition.scale} 0 M ${halfScale} ${definition.scale + halfScale} L ${definition.scale + halfScale} ${halfScale}`}
            stroke={definition.color}
            strokeWidth={2}
            strokeLinecap="square"
            opacity={definition.opacity}
          />
        ) : null}
      </pattern>
    );
  }

  return (
    <pattern
      id={definition.id}
      width={definition.scale}
      height={definition.scale}
      patternUnits="userSpaceOnUse"
    >
      <rect width="100%" height="100%" fill={definition.background} />
      {definition.pattern === "grain" ? (
        <>
          <circle
            cx={definition.scale * 0.22}
            cy={definition.scale * 0.3}
            r={1}
            fill={definition.color}
            opacity={definition.opacity}
          />
          <circle
            cx={definition.scale * 0.72}
            cy={definition.scale * 0.62}
            r={1.15}
            fill={definition.color}
            opacity={definition.opacity * 0.85}
          />
          <circle
            cx={definition.scale * 0.44}
            cy={definition.scale * 0.84}
            r={0.9}
            fill={definition.color}
            opacity={definition.opacity * 0.65}
          />
        </>
      ) : null}
      {definition.pattern === "linen" ? (
        <>
          <path
            d={`M 0 ${halfScale} H ${definition.scale}`}
            stroke={definition.color}
            strokeWidth={1}
            opacity={definition.opacity}
          />
          <path
            d={`M ${halfScale} 0 V ${definition.scale}`}
            stroke={definition.color}
            strokeWidth={1}
            opacity={definition.opacity * 0.8}
          />
        </>
      ) : null}
      {definition.pattern === "paper" ? (
        <>
          <path
            d={`M 0 0 L ${definition.scale} ${definition.scale}`}
            stroke={definition.color}
            strokeWidth={1}
            opacity={definition.opacity * 0.65}
          />
          <path
            d={`M ${halfScale} 0 L ${definition.scale} ${halfScale}`}
            stroke={definition.color}
            strokeWidth={1}
            opacity={definition.opacity * 0.45}
          />
        </>
      ) : null}
    </pattern>
  );
}

"use client";

export type BannerVariant = "error" | "warn" | "info";

const variantStyles: Record<BannerVariant, React.CSSProperties> = {
  error: {
    background: "var(--danger-muted)",
    borderColor: "var(--danger)",
    color: "var(--danger-text)",
  },
  warn: {
    background: "var(--warning-muted)",
    borderColor: "var(--warning)",
    color: "var(--warning-text)",
  },
  info: {
    background: "var(--info-muted)",
    borderColor: "var(--info)",
    color: "var(--info-text)",
  },
};

export function Banner({
  variant,
  children,
  style,
}: {
  variant: BannerVariant;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="analyst-panel"
      style={{
        marginBottom: 16,
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

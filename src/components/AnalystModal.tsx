"use client";

export interface AnalystModalProps {
  /** When false, nothing is rendered. */
  open: boolean;
  onClose?: () => void;
  title?: string;
  /** Use for 480px max-width scrollable content. */
  wide?: boolean;
  /** Use for max-height 90vh + overflow auto. */
  scroll?: boolean;
  /** Optional max-width in px when scroll is true (e.g. 520). */
  maxWidth?: number;
  children: React.ReactNode;
}

/**
 * Overlay + content box for dialogs/drawers.
 * Uses analyst-modalOverlay and analyst-modalContent classes.
 */
export default function AnalystModal({
  open,
  onClose,
  title,
  wide,
  scroll,
  maxWidth,
  children,
}: AnalystModalProps) {
  if (!open) return null;
  const contentClass = [
    "analyst-modalContent",
    wide ? "analyst-modalContentWide" : "",
    scroll ? "analyst-modalContentScroll" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const style = scroll && maxWidth != null ? { maxWidth } : undefined;
  return (
    <div
      className="analyst-modalOverlay"
      onClick={onClose != null ? onClose : undefined}
      onKeyDown={
        onClose != null
          ? (e) => e.key === "Escape" && onClose()
          : undefined
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={contentClass}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {title != null && <h3 className="analyst-modalTitle">{title}</h3>}
        {children}
      </div>
    </div>
  );
}

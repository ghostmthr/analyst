"use client";

import { useEffect, useMemo,useRef, useState } from "react";

export type GroupedOption = { value: string; label: string };
export type GroupedTypeaheadGroup = { heading: string; options: GroupedOption[] };

/** Single flattened option after filtering; heading kept for rendering groups. */
type VisibleOption = { heading: string; value: string; label: string };

export type GroupedTypeaheadPickerProps = {
  groups: GroupedTypeaheadGroup[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
};

const DROPDOWN_MAX_HEIGHT = 280;

export default function GroupedTypeaheadPicker({
  groups,
  value,
  onChange,
  placeholder = "Select…",
}: GroupedTypeaheadPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedLabel = useMemo(() => {
    if (value == null || value === "") return null;
    for (const g of groups) {
      const opt = g.options.find((o) => o.value === value);
      if (opt) return opt.label;
    }
    const raw = value.startsWith("CUSTOM:") ? value.slice(7) : value;
    return raw
      .split("_")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }, [groups, value]);

  const q = query.trim().toLowerCase();
  const visibleOptions: VisibleOption[] = useMemo(() => {
    const out: VisibleOption[] = [];
    for (const g of groups) {
      const options = q
        ? g.options.filter(
            (o) =>
              o.label.toLowerCase().includes(q) ||
              o.value.toLowerCase().includes(q)
          )
        : g.options;
      if (options.length === 0) continue;
      for (const o of options) {
        out.push({ heading: g.heading, value: o.value, label: o.label });
      }
    }
    return out;
  }, [groups, q]);

  const optionCount = visibleOptions.length;

  useEffect(() => {
    setHighlightIndex(0);
  }, [query, optionCount]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (!el) return;
    const highlighted = el.querySelector("[data-highlighted='true']");
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex, open]);

  useEffect(() => {
    function handlePointerDown(ev: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(ev.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => (i < optionCount - 1 ? i + 1 : i));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => (i > 0 ? i - 1 : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = visibleOptions[highlightIndex];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
        setQuery("");
      }
      return;
    }
  };

  const handleSelectOption = (opt: VisibleOption) => {
    onChange(opt.value);
    setOpen(false);
    setQuery("");
  };

  const groupedVisible = useMemo(() => {
    const byHeading = new Map<string, VisibleOption[]>();
    for (const opt of visibleOptions) {
      const list = byHeading.get(opt.heading) ?? [];
      list.push(opt);
      byHeading.set(opt.heading, list);
    }
    return Array.from(byHeading.entries()).map(([heading, options]) => ({
      heading,
      options,
    }));
  }, [visibleOptions]);

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="grouped-typeahead-list"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "8px 12px",
          minHeight: 40,
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius, 6px)",
          color: "var(--text)",
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        {open ? (
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            autoFocus
            style={{
              width: "100%",
              padding: 0,
              border: "none",
              background: "transparent",
              color: "var(--text)",
              fontFamily: "inherit",
              fontSize: "inherit",
              outline: "none",
            }}
            onKeyDown={handleKeyDown}
          />
        ) : (
          <span
            style={{
              color: selectedLabel ? "var(--text)" : "var(--text-muted)",
            }}
          >
            {selectedLabel ?? placeholder}
          </span>
        )}
      </div>

      {open && (
        <div
          id="grouped-typeahead-list"
          ref={listRef}
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 4,
            maxHeight: DROPDOWN_MAX_HEIGHT,
            overflowY: "auto",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius, 6px)",
            zIndex: 50,
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {optionCount === 0 ? (
            <div
              style={{
                padding: "12px 14px",
                color: "var(--text-muted)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              No matches
            </div>
          ) : (
            (() => {
              let runningIdx = 0;
              return groupedVisible.map(({ heading, options }) => (
                <div key={heading}>
                  <div
                    aria-hidden="true"
                    style={{
                      padding: "8px 12px 4px",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      borderBottom: "1px solid var(--border)",
                    }}
                  >
                    {heading}
                  </div>
                  {options.map((opt) => {
                    const currentIdx = runningIdx++;
                    const isHighlighted = currentIdx === highlightIndex;
                    return (
                      <div
                        key={`${opt.heading}-${opt.value}`}
                        role="option"
                        aria-selected={value === opt.value}
                        data-highlighted={isHighlighted ? "true" : undefined}
                        onClick={() => handleSelectOption(opt)}
                        onMouseEnter={() => setHighlightIndex(currentIdx)}
                        style={{
                          padding: "8px 12px",
                          fontSize: 14,
                          fontFamily: "inherit",
                          cursor: "pointer",
                          background: isHighlighted
                            ? "var(--blue)"
                            : "transparent",
                          color: isHighlighted ? "white" : "var(--text)",
                        }}
                      >
                        {opt.label}
                      </div>
                    );
                  })}
                </div>
              ));
            })()
          )}
        </div>
      )}
    </div>
  );
}

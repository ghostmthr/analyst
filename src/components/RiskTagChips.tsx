"use client";

import { useEffect,useRef, useState } from "react";

import {
  customKeyFromLabel,
  getRiskFlagLabel,
  matchesRiskFlag,
} from "@/lib/riskFlagLookup";
import { RISK_FLAGS } from "@/lib/riskFlags";

export type RiskTagChipsProps = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  max?: number;
};

function exactLabelMatch(typed: string): string | null {
  const t = typed.trim().toLowerCase();
  if (!t) return null;
  const found = RISK_FLAGS.find((f) => f.label.toLowerCase() === t);
  return found?.key ?? null;
}

export default function RiskTagChips({
  value,
  onChange,
  placeholder = "Type to search or add tag...",
  max,
}: RiskTagChipsProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = input.trim()
    ? RISK_FLAGS.filter((f) => matchesRiskFlag(input, f))
    : [];
  const exactKey = exactLabelMatch(input);
  const showCreateNew =
    input.trim().length > 0 &&
    !exactKey &&
    !value.some((k) => k.toLowerCase() === customKeyFromLabel(input.trim()).toLowerCase());

  const options = showCreateNew
    ? [...suggestions, { type: "create" as const, label: input.trim() }]
    : suggestions;

  const addKey = (key: string) => {
    const keyLower = key.toLowerCase();
    if (value.some((k) => k.toLowerCase() === keyLower)) return;
    const next = max != null && value.length >= max ? value : [...value, key];
    if (max != null && next.length > max) next.splice(max);
    onChange(next);
    setInput("");
    setOpen(false);
    setHighlight(0);
  };

  const removeKey = (key: string) => {
    onChange(value.filter((k) => k.toLowerCase() !== key.toLowerCase()));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !input && value.length > 0) {
      removeKey(value[value.length - 1]);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setHighlight(0);
      inputRef.current?.blur();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h < options.length - 1 ? h + 1 : h));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h > 0 ? h - 1 : 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (options.length === 0) return;
      const opt = options[highlight];
      if (opt && "type" in opt && opt.type === "create") {
        addKey(customKeyFromLabel(opt.label));
        return;
      }
      if (opt && "key" in opt) {
        addKey(opt.key);
        return;
      }
    }
  };

  useEffect(() => {
    setHighlight(0);
  }, [input, suggestions.length, showCreateNew]);

  useEffect(() => {
    function handleClickOutside(ev: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          alignItems: "center",
          minHeight: 40,
          padding: "6px 10px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 6,
        }}
      >
        {value.map((key) => (
          <span
            key={key}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              background: "var(--panel)",
              border: "1px solid var(--border)",
              borderRadius: 999,
              color: "var(--text)",
            }}
          >
            {getRiskFlagLabel(key)}
            <button
              type="button"
              onClick={() => removeKey(key)}
              style={{
                padding: 0,
                margin: 0,
                border: "none",
                background: "none",
                color: "var(--text)",
                cursor: "pointer",
                fontSize: 14,
                lineHeight: 1,
              }}
              aria-label="Remove tag"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          style={{
            flex: 1,
            minWidth: 120,
            padding: "4px 0",
            border: "none",
            background: "transparent",
            color: "var(--text)",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            outline: "none",
          }}
        />
      </div>

      {open && (suggestions.length > 0 || showCreateNew) && (
        <ul
          role="listbox"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            margin: 0,
            marginTop: 4,
            padding: 4,
            listStyle: "none",
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            maxHeight: 220,
            overflowY: "auto",
            zIndex: 50,
          }}
        >
          {suggestions.map((flag, i) => (
            <li
              key={flag.key}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                addKey(flag.key);
                inputRef.current?.focus();
              }}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                background: i === highlight ? "var(--border)" : "transparent",
                color: "var(--text)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{flag.label}</span>
              {flag.category && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {flag.category}
                </span>
              )}
            </li>
          ))}
          {showCreateNew && (
            <li
              role="option"
              aria-selected={highlight === options.length - 1}
              onMouseDown={(e) => {
                e.preventDefault();
                addKey(customKeyFromLabel(input.trim()));
                inputRef.current?.focus();
              }}
              style={{
                padding: "8px 10px",
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                cursor: "pointer",
                background: highlight === options.length - 1 ? "var(--border)" : "transparent",
                color: "var(--blue)",
                borderTop:
                  suggestions.length > 0 ? "1px solid var(--border)" : undefined,
              }}
            >
              Create tag &quot;{input.trim()}&quot;
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export { getRiskFlagLabel };

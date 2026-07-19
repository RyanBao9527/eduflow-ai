"use client";

import { useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WizardOption {
  value: string;
  label: string;
}

export function WizardOptionCardGroup({
  label,
  description,
  options,
  value,
  onChange,
  customPlaceholder,
  allowCustom = true,
  customOptionLabel = "自定义",
}: {
  label: string;
  description: string;
  options: readonly WizardOption[];
  value: string;
  onChange: (value: string) => void;
  customPlaceholder?: string;
  allowCustom?: boolean;
  customOptionLabel?: string;
}) {
  const hasCustomValue = allowCustom
    && Boolean(value)
    && !options.some((option) => option.value === value);
  const [customMode, setCustomMode] = useState(hasCustomValue);
  const customSelected = customMode || hasCustomValue;

  return (
    <fieldset>
      <legend className="text-sm font-medium leading-none text-[#273149]">{label}</legend>
      <p className="mt-2 text-sm leading-5 text-muted-foreground">{description}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="radiogroup" aria-label={label}>
        {options.map((option) => {
          const checked = !customSelected && value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={checked}
              onClick={() => {
                setCustomMode(false);
                onChange(option.value);
              }}
              className={cn(
                "min-h-12 rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold text-[#273149] transition-all hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                checked && "border-primary/45 bg-[#f2f5ff] text-primary shadow-sm",
              )}
            >
              {option.label}
            </button>
          );
        })}
        {allowCustom && (
          <button
            type="button"
            role="radio"
            aria-checked={customSelected}
            onClick={() => {
              setCustomMode(true);
              if (!hasCustomValue) onChange("");
            }}
            className={cn(
              "min-h-12 rounded-xl border bg-white px-4 py-3 text-left text-sm font-semibold text-[#273149] transition-all hover:border-primary/30 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              customSelected && "border-primary/45 bg-[#f2f5ff] text-primary shadow-sm",
            )}
          >
            {customOptionLabel}
          </button>
        )}
      </div>
      {allowCustom && customSelected && (
        <Input
          className="mt-3"
          value={hasCustomValue ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          placeholder={customPlaceholder ?? `请输入${label}`}
          aria-label={`${label}${customOptionLabel}内容`}
          autoComplete="off"
        />
      )}
    </fieldset>
  );
}

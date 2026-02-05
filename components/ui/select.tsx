"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { label: string; value: string }[];
}

function Select({ className, options, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export { Select };

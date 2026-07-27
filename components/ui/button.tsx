"use client";

import * as React from "react";
import { Button as AppicaButton, type ButtonProps as AppicaButtonProps } from "@appica/ui-react/button";
import { cn } from "@/lib/utils/cn";

// The app's existing Button API, mapped onto Appica's Button so every call site
// renders the real Appica component without changes.
type AppVariant = "default" | "secondary" | "outline" | "ghost" | "danger";
type AppSize = "default" | "sm" | "icon";

const VARIANT_MAP: Record<AppVariant, NonNullable<AppicaButtonProps["variant"]>> = {
  default: "primary",
  secondary: "secondary",
  outline: "outline",
  ghost: "ghost",
  danger: "destructive"
};

const SIZE_MAP: Record<AppSize, NonNullable<AppicaButtonProps["size"]>> = {
  default: "md",
  sm: "sm",
  icon: "icon-md"
};

export interface ButtonProps
  extends Omit<React.ComponentProps<typeof AppicaButton>, "variant" | "size"> {
  variant?: AppVariant;
  size?: AppSize;
  /** Render as the single child element (e.g. a Next <Link>), Radix-style. */
  asChild?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  children,
  ...props
}: ButtonProps) {
  const mapped = {
    variant: VARIANT_MAP[variant],
    size: SIZE_MAP[size],
    className: cn(className)
  };

  // asChild: hand the child element to Appica's `render` prop and lift its
  // label up as the button's children so Base UI merges props onto it.
  if (asChild && React.isValidElement(children)) {
    const child = children as React.ReactElement<{ children?: React.ReactNode }>;
    const { children: label, ...childProps } = child.props;
    return (
      <AppicaButton {...mapped} {...props} render={React.createElement(child.type, childProps)}>
        {label}
      </AppicaButton>
    );
  }

  return (
    <AppicaButton {...mapped} {...props}>
      {children}
    </AppicaButton>
  );
}

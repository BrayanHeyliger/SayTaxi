import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Apple-style spinner ─────────────────────────────────────────────────────
interface AppleSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AppleSpinner({ size = "md", className }: AppleSpinnerProps) {
  const sizes = { sm: "w-4 h-4", md: "w-7 h-7", lg: "w-10 h-10" };
  const borderSizes = { sm: "border-2", md: "border-2", lg: "border-[3px]" };
  return (
    <div
      className={cn(
        "rounded-full border-slate-200 animate-apple-spin",
        sizes[size],
        borderSizes[size],
        "border-t-green-500",
        className
      )}
      style={{ animationTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)" }}
    />
  );
}

// ─── Full-page centered loader ────────────────────────────────────────────────
interface AppleLoaderProps {
  label?: string;
  className?: string;
}

export function AppleLoader({ label = "Cargando…", className }: AppleLoaderProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 gap-3 animate-fade-in", className)}>
      <AppleSpinner size="lg" />
      <p className="text-sm text-slate-400 font-medium tracking-wide">{label}</p>
    </div>
  );
}

// ─── Skeleton primitives ──────────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn("rounded-lg bg-slate-100 animate-skeleton", className)}
    />
  );
}

// ─── Stat-card skeleton ───────────────────────────────────────────────────────
export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3 shadow-sm">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-7 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Table-row skeleton ───────────────────────────────────────────────────────
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className={`h-4 ${i === 0 ? "w-20" : i === cols - 1 ? "w-14" : "w-28"}`} />
        </td>
      ))}
    </tr>
  );
}

// ─── Table skeleton (header + rows) ──────────────────────────────────────────
export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="py-3 px-4">
                <Skeleton className="h-3.5 w-20 mx-auto" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Button with integrated loading state ─────────────────────────────────────

interface LoadingButtonProps extends React.ComponentProps<typeof Button> {
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

export function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  disabled,
  ...props
}: LoadingButtonProps) {
  return (
    <Button disabled={loading || disabled} {...props}>
      {loading ? (
        <span className="flex items-center gap-2">
          <AppleSpinner size="sm" className="border-white/30 border-t-white" />
          <span>{loadingLabel ?? "Procesando…"}</span>
        </span>
      ) : (
        children
      )}
    </Button>
  );
}

// ─── Success checkmark animation ──────────────────────────────────────────────
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center animate-success-pop">
        <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    </div>
  );
}

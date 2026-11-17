import { BookOpen } from "lucide-react";
import type { ReactNode } from "react";

// A collapsible "Rules" panel shown at the top of each contest page.
export default function RulesBox({ children, defaultOpen = true }: { children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group mb-8 border border-grid bg-panel">
      <summary className="flex cursor-pointer select-none items-center gap-2 px-4 py-3 font-display text-sm">
        <BookOpen size={15} className="text-turf" />
        Rules
        <span className="ml-auto font-mono text-[10px] font-normal uppercase tracking-wide text-black/40 group-open:hidden">
          tap to open
        </span>
        <span className="ml-auto hidden font-mono text-[10px] font-normal uppercase tracking-wide text-black/40 group-open:inline">
          tap to close
        </span>
      </summary>
      <div className="border-t border-grid px-4 py-3 text-sm leading-relaxed text-black/70 [&_li]:mt-1.5 [&_strong]:font-semibold [&_strong]:text-ink2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </details>
  );
}

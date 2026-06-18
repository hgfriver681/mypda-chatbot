"use client";
import { useEffect, useMemo, useState } from "react";
import { Button } from "ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "ui/select";
import { cn } from "lib/utils";

const PAGE_SIZES = [10, 25, 50, 100];

// Client-side pagination over an in-memory array. `resetKey` resets to page 1
// when it changes (e.g. filters changed); the page also clamps if the list
// shrinks below the current page.
export function usePagination<T>(
  items: T[],
  initialPageSize = 10,
  resetKey?: unknown,
) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const pageItems = useMemo(
    () => items.slice((page - 1) * pageSize, page * pageSize),
    [items, page, pageSize],
  );

  const onPageSizeChange = (n: number) => {
    setPageSize(n);
    setPage(1);
  };

  return {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    pageItems,
    total: items.length,
    totalPages,
  };
}

interface ListPagerProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  className?: string;
}

export function ListPager({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  className,
}: ListPagerProps) {
  // Few enough to fit the smallest page size — no need for any pager UI.
  if (total <= PAGE_SIZES[0]) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(total, page * pageSize);

  return (
    <div
      data-testid="list-pager"
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <span>每頁</span>
        <Select
          value={String(pageSize)}
          onValueChange={(v) => onPageSizeChange(Number(v))}
        >
          <SelectTrigger size="sm" className="w-[76px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZES.map((s) => (
              <SelectItem key={s} value={String(s)}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span>筆</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-muted-foreground tabular-nums">
          {start}–{end} / {total}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="px-1 tabular-nums">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";
import useSWR from "swr";
import { fetcher } from "lib/utils";
import { Badge } from "ui/badge";
import { ActivityIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "ui/table";
import type { MemoryInvocation } from "app-types/memory";
import { relativeTime } from "lib/memory/format";
import { usePagination, ListPager } from "./list-pager";

// Requests = live MCP invocation log. We poll every 5s rather than use Supabase
// Realtime, because Better Auth (not Supabase Auth) is the identity, so the
// browser has no Supabase JWT for RLS-scoped realtime. (See MERGE plan.)
export function RequestsView() {
  const { data, isLoading } = useSWR<{ invocations: MemoryInvocation[] }>(
    `/api/memory/invocations`,
    fetcher,
    { refreshInterval: 5000, revalidateOnFocus: true },
  );
  const rows = data?.invocations ?? [];

  const {
    page,
    setPage,
    pageSize,
    onPageSizeChange,
    pageItems,
    total,
    totalPages,
  } = usePagination(rows, 25);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <div className="flex items-center gap-2">
        <ActivityIcon className="size-6" />
        <h1 className="text-2xl font-bold">Requests</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Live MCP tool calls against your memory (auto-refresh).
      </p>

      <div className="mt-4 rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">Time</TableHead>
              <TableHead className="w-32">Tool</TableHead>
              <TableHead>Query</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground">
                  No requests yet.
                </TableCell>
              </TableRow>
            ) : (
              pageItems.map((r) => (
                <TableRow key={r.id} data-testid="request-row">
                  <TableCell className="text-xs text-muted-foreground">
                    {relativeTime(r.createdAt as unknown as string)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.tool}</Badge>
                  </TableCell>
                  <TableCell className="truncate text-sm">
                    {r.query ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ListPager
        className="mt-3"
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}

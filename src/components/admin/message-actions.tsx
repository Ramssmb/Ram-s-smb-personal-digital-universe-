"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";

import { api, ApiError } from "./api";

export function MessageActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setStatus(next: string) {
    setBusy(next);
    setError(null);
    try {
      await api(`/api/v1/admin/messages/${id}`, { method: "PATCH", json: { status: next } });
      router.refresh();
    } catch (thrown) {
      setError(thrown instanceof ApiError ? thrown.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "new" && (
        <Button
          size="sm"
          variant="secondary"
          loading={busy === "read"}
          onClick={() => setStatus("read")}
        >
          Mark as read
        </Button>
      )}
      {status !== "archived" && (
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "archived"}
          onClick={() => setStatus("archived")}
        >
          Archive
        </Button>
      )}
      {status !== "spam" ? (
        <Button
          size="sm"
          variant="ghost"
          loading={busy === "spam"}
          onClick={() => setStatus("spam")}
        >
          Mark as spam
        </Button>
      ) : (
        <Button size="sm" variant="ghost" loading={busy === "new"} onClick={() => setStatus("new")}>
          Not spam
        </Button>
      )}
      <ConfirmDialog
        trigger={
          <Button size="sm" variant="ghost" className="text-danger">
            Delete
          </Button>
        }
        title="Delete this message?"
        description="This cannot be undone."
        confirmLabel="Delete message"
        onConfirm={async () => {
          await api(`/api/v1/admin/messages/${id}`, { method: "DELETE" });
          router.refresh();
        }}
      />
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

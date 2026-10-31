"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { IconButton } from "@/components/ui/button";

import { api, ApiError } from "./api";

/** Moves an item one place up or down and saves the new order of the visible list. */
export function ReorderButtons({
  collection,
  ids,
  index,
  title,
}: {
  collection: string;
  ids: string[];
  index: number;
  title: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function move(delta: number) {
    const next = [...ids];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    setBusy(true);
    try {
      await api(`/api/v1/admin/collections/${collection}/reorder`, { json: { ids: next } });
      router.refresh();
    } catch (thrown) {
      window.alert(thrown instanceof ApiError ? thrown.message : "Could not reorder.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex">
      <IconButton
        label={`Move ${title} up`}
        variant="ghost"
        size="sm"
        disabled={busy || index === 0}
        onClick={() => move(-1)}
      >
        <ArrowUp aria-hidden="true" className="size-4" />
      </IconButton>
      <IconButton
        label={`Move ${title} down`}
        variant="ghost"
        size="sm"
        disabled={busy || index === ids.length - 1}
        onClick={() => move(1)}
      >
        <ArrowDown aria-hidden="true" className="size-4" />
      </IconButton>
    </div>
  );
}

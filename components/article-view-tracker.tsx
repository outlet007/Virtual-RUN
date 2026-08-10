"use client";

import { useEffect } from "react";

export function ArticleViewTracker({ articleId }: { articleId: string }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/articles/${articleId}/view`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      signal: controller.signal,
    }).catch(() => undefined);
    return () => controller.abort();
  }, [articleId]);
  return null;
}

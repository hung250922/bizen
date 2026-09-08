export function ensureMinimumLoading(startedAt, minimumMs = 1000) {
  const remainingMs = Math.max(0, minimumMs - (Date.now() - startedAt))
  return new Promise((resolve) => setTimeout(resolve, remainingMs))
}

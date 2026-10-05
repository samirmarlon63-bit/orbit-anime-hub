export const COLLECTION_KEY = 'anime-orbit-local-collection'

export function readLocalCollection(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(COLLECTION_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function setLocalCollection(ids: string[]) {
  localStorage.setItem(COLLECTION_KEY, JSON.stringify(ids))
  window.dispatchEvent(new Event('orbit-collection-change'))
}
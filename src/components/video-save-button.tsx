import { useEffect, useState } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { readLocalVideos, setLocalVideos } from '@/lib/local-collection'

export function VideoSaveButton({ id }: { id: string }) {
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    const refresh = () => setSaved(readLocalVideos().includes(id))
    refresh()
    window.addEventListener('orbit-collection-change', refresh)
    return () => window.removeEventListener('orbit-collection-change', refresh)
  }, [id])
  return <Button type="button" variant="ghost" size="icon" aria-label={saved ? 'Quitar video de colección' : 'Guardar video en colección'} aria-pressed={saved} onClick={() => { const ids = readLocalVideos(); setLocalVideos(saved ? ids.filter(value => value !== id) : [id, ...ids]) }} className="size-9 shrink-0 text-primary">{saved ? <BookmarkCheck size={18}/> : <Bookmark size={18}/>}</Button>
}
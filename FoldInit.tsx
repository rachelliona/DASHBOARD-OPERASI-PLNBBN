import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Di HP: kartu ber-judul menjadi akordeon (kartu pertama terbuka, sisanya diketuk untuk dibuka) supaya halaman tidak memanjang ke bawah. */
export default function FoldInit() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return; const mq = window.matchMedia('(max-width:767px)'); const page = () => document.querySelector('.page') as HTMLElement | null
    const apply = () => { const p = page(); if (!p) return; const mob = mq.matches
      p.querySelectorAll<HTMLElement>('.gcard').forEach(c => { const h = c.firstElementChild as HTMLElement | null; const ok = !!h?.querySelector('.gcard-t')
        if (!mob || !ok) { c.removeAttribute('data-fold'); return }
        if (!c.hasAttribute('data-fold')) c.setAttribute('data-fold', p.querySelector('.gcard[data-fold=open]') ? 'closed' : 'open') }) }
    const click = (e: MouseEvent) => { if (!mq.matches) return; const t = e.target as HTMLElement; if (t.closest('button,a,select,input,label')) return
      const h = t.closest('.page .gcard[data-fold] > div:first-child'); if (!h) return; const c = h.parentElement!; c.setAttribute('data-fold', c.getAttribute('data-fold') === 'open' ? 'closed' : 'open'); window.dispatchEvent(new Event('resize')) }
    const mo = new MutationObserver(() => apply()); const p = page(); if (p) mo.observe(p, { childList: true, subtree: true })
    apply(); document.addEventListener('click', click); mq.addEventListener?.('change', apply)
    return () => { mo.disconnect(); document.removeEventListener('click', click); mq.removeEventListener?.('change', apply) }
  }, [pathname])
  return null
}

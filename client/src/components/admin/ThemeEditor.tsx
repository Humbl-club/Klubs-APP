import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import { Label } from '../ui/label'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { useOrganization } from '@/contexts/OrganizationContext'
import { toast } from '@/hooks/use-toast'

export const ThemeEditor: React.FC = () => {
  const { currentOrganization, updateTheme } = useOrganization()
  const [primary, setPrimary] = useState('#6BA58F') // sage
  const [background, setBackground] = useState('#FAFAF7')
  const [foreground, setForeground] = useState('#2A2A2A')

  useEffect(() => {
    // Apply preview live using CSS variables
    const root = document.documentElement
    const hexToHsl = (hex: string) => {
      const m = hex.replace('#','')
      const bigint = parseInt(m, 16)
      const r = (bigint >> 16) & 255
      const g = (bigint >> 8) & 255
      const b = bigint & 255
      const rf=r/255, gf=g/255, bf=b/255
      const max = Math.max(rf,gf,bf), min=Math.min(rf,gf,bf)
      let h=0,s=0,l=(max+min)/2
      if (max!==min) {
        const d = max-min
        s = l>0.5? d/(2-max-min) : d/(max+min)
        switch(max){
          case rf: h=(gf-bf)/d+(gf<bf?6:0); break
          case gf: h=(bf-rf)/d+2; break
          case bf: h=(rf-gf)/d+4; break
        }
        h/=6
      }
      return `${Math.round(h*360)} ${Math.round(s*100)}% ${Math.round(l*100)}%`
    }
    root.style.setProperty('--primary', hexToHsl(primary))
    root.style.setProperty('--background', hexToHsl(background))
    root.style.setProperty('--foreground', hexToHsl(foreground))
  }, [primary, background, foreground])

  const presets = [
    { name: 'Alo Sage', p: '#6BA58F', bg: '#FAFAF7', fg: '#2A2A2A' },
    { name: 'Lavender Mist', p: '#9D7FEA', bg: '#FBFAFF', fg: '#2A2A2A' },
    { name: 'Blush Cream', p: '#E6A6A6', bg: '#FFFBF8', fg: '#2A2A2A' },
    { name: 'Charcoal Minimal', p: '#6BA58F', bg: '#FFFFFF', fg: '#1F1F1F' },
  ]

  const applyPreset = (p: string, bg: string, fg: string) => {
    setPrimary(p); setBackground(bg); setForeground(fg)
  }

  const save = async () => {
    if (!currentOrganization) return
    try {
      await updateTheme({
        primary_color: primary,
        background_color: background,
        text_primary: foreground,
      } as any)
      toast({ title: 'Theme updated' })
    } catch {
      toast({ title: 'Failed to update theme', variant: 'destructive' })
    }
  }

  return (
    <Card className="glass-card-enhanced">
      <CardHeader>
        <CardTitle>Theme Editor (Preview)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Presets */}
        <div className="space-y-2">
          <div className="text-sm font-medium">Quick Presets</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {presets.map((ps) => (
              <button key={ps.name} className="p-3 rounded-lg border hover:bg-muted/40 text-left" onClick={() => applyPreset(ps.p, ps.bg, ps.fg)}>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-4 h-4 rounded" style={{ background: ps.p }} />
                  <span className="inline-block w-4 h-4 rounded border" style={{ background: ps.bg }} />
                  <span className="inline-block w-4 h-4 rounded" style={{ background: ps.fg }} />
                </div>
                <div className="text-xs mt-1 text-muted-foreground">{ps.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <Label>Primary</Label>
            <Input type="color" value={primary} onChange={(e)=>setPrimary(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Background</Label>
            <Input type="color" value={background} onChange={(e)=>setBackground(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Text</Label>
            <Input type="color" value={foreground} onChange={(e)=>setForeground(e.target.value)} />
          </div>
        </div>
        <div className="p-4 rounded-xl border bg-background text-foreground">
          <div className="text-lg font-semibold mb-2">Preview Card</div>
          <p className="text-sm text-muted-foreground">This area previews the theme colors you pick. Primary buttons, borders, and text will reflect your choices.</p>
          <div className="mt-3 flex gap-2">
            <Button>Primary Action</Button>
            <Button variant="outline">Secondary</Button>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save}>Save Theme</Button>
        </div>
      </CardContent>
    </Card>
  )
}

import { useAppearance } from "@/hooks/use-appearance"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

/**
 * Bewusste Abweichung vom shadcn-Register — an genau einer Stelle.
 *
 * Das Register holt die Darstellung aus `next-themes` und setzt oben ein
 * `"use client"`. Beides gehoert zu Next.js: Die Direktive ist hier wirkungslos,
 * und `next-themes` braucht einen Provider, den es in dieser Anwendung nicht
 * gibt — `useTheme()` liefert dann nichts, Sonner faellt auf „system" zurueck
 * und folgt dem Betriebssystem statt der Einstellung, die der Benutzer gewaehlt
 * hat.
 *
 * Die Struktur des Registers bleibt: Die `theme`-Eigenschaft wird weiterhin
 * gesetzt, nur aus unserem eigenen Hook. Der liefert genau die drei Werte, die
 * Sonner erwartet ('light' | 'dark' | 'system').
 *
 * Alles andere — Symbole, die vier CSS-Variablen auf unsere Tokens — steht
 * unveraendert wie im Register. Beim Auffrischen kommen `next-themes` und
 * `"use client"` zurueck; dann gehoert dieser Kopf wieder hierher.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { appearance } = useAppearance()

  return (
    <Sonner
      theme={appearance}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }

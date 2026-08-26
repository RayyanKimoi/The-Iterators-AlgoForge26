import { useEffect, useRef } from 'react'
import { useTheme } from '../hooks/ThemeContext'

// Leaflet CSS is injected once globally
let leafletCssInjected = false
function injectLeafletCss() {
  if (leafletCssInjected) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
  document.head.appendChild(link)
  leafletCssInjected = true
}

const LOCATIONIQ_KEY = import.meta.env.VITE_LOCATIONIQ_API_KEY

export type LocationMapProps = {
  lat: number
  lng: number
  /** Label shown in the popup above the marker */
  label?: string
  /** Height of the map container, defaults to 220px */
  height?: number | string
  /** Border radius, defaults to 16px */
  borderRadius?: number | string
  /** Zoom level, defaults to 16 */
  zoom?: number
  className?: string
}

export function LocationMap({
  lat,
  lng,
  label,
  height = 220,
  borderRadius = 16,
  zoom = 16,
  className,
}: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const { isDark } = useTheme()

  useEffect(() => {
    injectLeafletCss()
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    if (!LOCATIONIQ_KEY) {
      console.warn('[LocationMap] VITE_LOCATIONIQ_API_KEY is not set.')
      return
    }

    let L: any
    let cancelled = false

    import('leaflet').then((mod) => {
      if (cancelled) return
      L = mod.default

      // Fix default icon paths broken by bundlers
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      // Destroy existing instance on re-render
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }

      const map = L.map(mapRef.current!, {
        center: [lat, lng],
        zoom,
        zoomControl: true,
        attributionControl: true,
      })

      mapInstanceRef.current = map

      // LocationIQ tile layer
      L.tileLayer(
        `https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=${LOCATIONIQ_KEY}`,
        {
          maxZoom: 20,
          attribution:
            '&copy; <a href="https://locationiq.com">LocationIQ</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(map)

      // Custom pulsing marker icon
      const pulsingIcon = L.divIcon({
        className: '',
        html: `
          <div style="
            position: relative;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="
              position: absolute;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background: rgba(239, 68, 68, 0.25);
              animation: liq-pulse 1.8s ease-out infinite;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            "></div>
            <div style="
              width: 16px;
              height: 16px;
              border-radius: 50%;
              background: #ef4444;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.35);
              position: relative;
              z-index: 1;
            "></div>
          </div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -14],
      })

      const marker = L.marker([lat, lng], { icon: pulsingIcon }).addTo(map)
      markerRef.current = marker

      if (label) {
        marker
          .bindPopup(
            `<div style="
              font-family: 'Space Grotesk', system-ui, sans-serif;
              font-size: 13px;
              font-weight: 600;
              color: #111;
              padding: 2px 4px;
              white-space: nowrap;
            ">${label}</div>`,
            { closeButton: false }
          )
          .openPopup()
      }
    })

    return () => {
      cancelled = true
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [lat, lng, zoom, label])

  return (
    <>
      {/* Inject pulsing animation once */}
      <style>{`
        @keyframes liq-pulse {
          0%   { transform: translate(-50%,-50%) scale(0.5); opacity: 0.8; }
          100% { transform: translate(-50%,-50%) scale(2.5); opacity: 0; }
        }
        .leaflet-container {
          border-radius: inherit;
          font-family: 'Space Grotesk', system-ui, sans-serif !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 10px !important;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18) !important;
          border: none !important;
        }
        .leaflet-popup-tip {
          display: none !important;
        }
        .leaflet-control-zoom a {
          border-radius: 6px !important;
          font-size: 16px !important;
        }
        .leaflet-control-attribution {
          font-size: 9px !important;
          background: rgba(255,255,255,0.75) !important;
          border-radius: 6px 0 0 0 !important;
        }
      `}</style>
      <div
        className={className}
        style={{
          borderRadius,
          overflow: 'hidden',
          height,
          width: '100%',
          position: 'relative',
          boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
        }}
      >
        <div ref={mapRef} style={{ height: '100%', width: '100%' }} />
        {!LOCATIONIQ_KEY && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.04)',
            fontSize: 13, color: '#888',
          }}>
            Map key not configured
          </div>
        )}
      </div>
    </>
  )
}

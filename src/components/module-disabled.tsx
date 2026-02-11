import Image from 'next/image'

interface ModuleDisabledPageProps {
  module: string
}

/**
 * Shown when a public module (booking, kiosk, digital menu) is disabled
 * via Settings > Web Configuration toggles.
 */
export function ModuleDisabledPage({ module }: ModuleDisabledPageProps) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-md space-y-6">
        <Image
          src="/icons/logoheader.png"
          alt="GrandCafe Cheers"
          width={64}
          height={64}
          className="mx-auto rounded-lg"
        />
        <h1 className="text-2xl font-bold text-foreground">Temporarily Unavailable</h1>
        <p className="text-muted-foreground">
          {module} is currently not available. Please check back later or contact us directly.
        </p>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <a href="tel:+34971XXXXXX" className="text-primary hover:underline font-medium">
              +34 971 XXX XXX
            </a>
          </p>
          <p>
            <a href="mailto:info@cheersmallorca.com" className="text-primary hover:underline">
              info@cheersmallorca.com
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

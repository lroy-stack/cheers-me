import { ALLERGEN_LIST } from '@/lib/constants/allergens'
import { AlertTriangle } from 'lucide-react'

export const metadata = {
  title: 'Allergen Poster | GrandCafe Cheers',
  description: 'Printable allergen information poster',
}

export default function AllergenPrintPage() {
  return (
    <div className="bg-card text-black print:p-8">
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4;
            margin: 2cm;
          }
        }
      ` }} />

      {/* Print Instructions (hidden when printing) */}
      <div className="no-print bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-primary">
          <strong>Print Instructions:</strong> Press Ctrl+P (Windows) or Cmd+P (Mac) to print this poster.
          Make sure to enable &quot;Background graphics&quot; in your print settings for best results.
        </p>
      </div>

      {/* Poster Content */}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 border-b-4 border-primary pb-6">
          <div className="flex items-center justify-center gap-3 mb-4">
            <AlertTriangle className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold text-foreground">
              Allergen Information
            </h1>
          </div>
          <p className="text-xl text-muted-foreground">
            GrandCafe Cheers Mallorca
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            EU Regulation 1169/2011 Compliant
          </p>
        </div>

        {/* Allergen Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {ALLERGEN_LIST.map((allergen, index) => {
            const Icon = allergen.icon
            return (
              <div
                key={allergen.id}
                className="flex items-start gap-4 p-4 border-2 border-border rounded-lg bg-muted"
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-card border-2 border-border shrink-0">
                  <Icon className={`h-8 w-8 ${allergen.color.replace('text-', 'text-')}`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs text-muted-foreground font-semibold mb-1">
                    {String(index + 1).padStart(2, '0')}
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-1">
                    {allergen.name_en}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>🇳🇱 {allergen.name_nl}</p>
                    <p>🇪🇸 {allergen.name_es}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-border pt-6 space-y-4">
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <p className="text-sm text-foreground leading-relaxed">
              <strong className="text-primary">Important:</strong> If you have any food allergies or dietary requirements,
              please inform your server before ordering. Our staff will be happy to discuss menu options
              and ingredient information with you. While we take precautions to prevent cross-contamination,
              we cannot guarantee that our dishes are completely allergen-free.
            </p>
          </div>

          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">
              GrandCafe Cheers Mallorca
            </p>
            <p className="text-sm text-muted-foreground">
              Carrer de Cartago 22, El Arenal, Mallorca 07600
            </p>
            <p className="text-sm text-muted-foreground">
              @cheersmallorca | grandcafe-cheers.com
            </p>
          </div>

          <div className="text-center text-xs text-muted-foreground mt-4">
            <p>Allergen information last updated: {new Date().toLocaleDateString('en-GB')}</p>
            <p className="mt-1">This poster complies with EU Food Information Regulation (EU) No 1169/2011</p>
          </div>
        </div>
      </div>
    </div>
  )
}

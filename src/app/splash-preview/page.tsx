import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function SplashPreviewIndex() {
  const previews = [
    { id: 1, title: 'Minimalist Icon Fade', tag: 'Apple Classic', desc: 'Simple and elegant fade-in animation' },
    { id: 2, title: 'Brand Color Pulse', tag: 'Dynamic', desc: 'Energetic pulsing animation with brand color' },
    { id: 3, title: 'Typographic Reveal', tag: 'Elegant', desc: 'Text and icon staggered entrance' },
    { id: 4, title: 'Gradient Mesh', tag: 'Modern Trend', desc: 'Soft floating gradient background' },
    { id: 5, title: 'Icon to UI Transition', tag: 'Seamless', desc: 'Transition from icon directly to app UI' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-20 px-4">
      <div className="max-w-md w-full">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Splash Screen Concepts</h1>
          <p className="text-gray-500">Tap to see animation</p>
        </div>
        
        <div className="space-y-4">
          {previews.map((preview) => (
            <Link 
              key={preview.id}
              href={`/splash-preview/${preview.id}`}
              className="block bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md hover:border-emerald-500 transition-all group"
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                  {preview.title}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-medium">
                  {preview.tag}
                </span>
              </div>
              <p className="text-sm text-gray-500">{preview.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

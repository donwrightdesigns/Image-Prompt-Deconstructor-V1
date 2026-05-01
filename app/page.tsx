'use client';

import { useState } from 'react';
import StyleAnalyzer from '@/components/StyleAnalyzer';
import TuningMode from '@/components/TuningMode';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'interpreter' | 'tuning'>('interpreter');

  return (
    <main className="min-h-screen bg-white">
      <div className="border-b border-zinc-200 bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('interpreter')}
            className={`h-full text-sm font-medium border-b-2 px-1 transition-colors ${
              activeTab === 'interpreter' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Style Interpreter
          </button>
          <button 
            onClick={() => setActiveTab('tuning')}
            className={`h-full text-sm font-medium border-b-2 px-1 transition-colors ${
              activeTab === 'tuning' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Tuning Mode
          </button>
        </div>
      </div>

      <div className="py-12">
        {activeTab === 'interpreter' ? <StyleAnalyzer /> : <TuningMode />}
      </div>
    </main>
  );
}


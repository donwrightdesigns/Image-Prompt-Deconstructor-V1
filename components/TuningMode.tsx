'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Sparkles, Loader2, Play, ImageIcon, Download, Copy, Check, Search, Maximize2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiModel } from '@/lib/gemini';
import { Type } from '@google/genai';
import { compressImage } from '@/lib/imageUtils';

interface Variation {
  id: string;
  prompt: string;
  status: 'idle' | 'generating' | 'done' | 'error';
  imageUrl: string | null;
  error?: string;
}

export default function TuningMode() {
  const [testImage, setTestImage] = useState<string | null>(null);
  const [basePrompt, setBasePrompt] = useState<string>('');
  const [numVariations, setNumVariations] = useState<number>(4);
  const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Selected image for the larger view modal
  const [selectedVariationId, setSelectedVariationId] = useState<string | null>(null);
  const selectedVariation = variations.find(v => v.id === selectedVariationId);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) processFile(e.target.files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTestImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const generatePrompts = async () => {
    if (!testImage || !basePrompt) return;
    setIsGeneratingPrompts(true);
    try {
      const ai = getGeminiModel();
      const compressedImage = await compressImage(testImage, 1024, 1024);
      const mimeType = compressedImage.split(';')[0].split(':')[1];
      const data = compressedImage.split(',')[1];
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data } },
              { text: `consider what this professional photographers objective might be in crafting this prompt: "${basePrompt}", and generate ${numVariations} different variation prompts.` }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      });
      
      const jsonStr = response.text || "[]";
      let promptList: string[] = JSON.parse(jsonStr);
      if (!Array.isArray(promptList)) {
         promptList = [promptList as unknown as string];
      }
      
      const newVariations = promptList.slice(0, numVariations).map((prompt, i) => ({
        id: `var-${Date.now()}-${i}`,
        prompt: `${basePrompt} ${prompt}`,
        status: 'idle' as const,
        imageUrl: null
      }));
      setVariations(newVariations);
    } catch (e) {
      console.error(e);
      alert("Error generating prompts");
    } finally {
      setIsGeneratingPrompts(false);
    }
  };

  const processSingleVariation = async (id: string) => {
    const variationIndex = variations.findIndex(v => v.id === id);
    if (variationIndex === -1) return;
    
    // Optimistic update
    setVariations(prev => {
      const next = [...prev];
      next[variationIndex] = { ...next[variationIndex], status: 'generating' };
      return next;
    });

    try {
      const ai = getGeminiModel();
      const compressedImage = await compressImage(testImage!, 1024, 1024);
      const mimeType = compressedImage.split(';')[0].split(':')[1];
      const data = compressedImage.split(',')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: {
          parts: [
            { inlineData: { mimeType, data } },
            { text: variations[variationIndex].prompt }
          ]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "512px"
          }
        }
      });

      let generatedImageUrl = null;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          generatedImageUrl = `data:image/jpeg;base64,${part.inlineData.data}`;
          break;
        }
      }

      setVariations(prev => {
        const next = [...prev];
        const idx = next.findIndex(v => v.id === id);
        if (idx !== -1) {
          next[idx] = { 
            ...next[idx], 
            status: generatedImageUrl ? 'done' : 'error',
            imageUrl: generatedImageUrl,
            error: generatedImageUrl ? undefined : 'No image produced'
          };
        }
        return next;
      });

    } catch (error: any) {
      console.error("Image gen error:", error);
      setVariations(prev => {
        const next = [...prev];
        const idx = next.findIndex(v => v.id === id);
        if (idx !== -1) {
          next[idx] = { 
            ...next[idx], 
            status: 'error',
            error: error.message || 'Generation failed'
          };
        }
        return next;
      });
    }
  };

  const processAll = () => {
    variations.forEach(v => {
      if (v.status !== 'generating' && v.status !== 'done') {
        processSingleVariation(v.id);
      }
    });
  };

  const updatePrompt = (id: string, newPrompt: string) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, prompt: newPrompt } : v));
  };

  const isGeneratingAny = variations.some(v => v.status === 'generating');
  const canProcessAll = variations.some(v => v.status !== 'generating' && v.status !== 'done') && !isGeneratingAny;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8 pb-32">
      <header className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Tuning Loop</h1>
        <p className="text-zinc-500">Rapidly experiment with variations of a test image.</p>
      </header>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column: Upload & Settings */}
        <div className="space-y-6 md:col-span-1">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden
              ${testImage ? 'border-zinc-200' : isDragging ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`}
          >
            {testImage ? (
              <div className="relative w-full h-full group">
                <Image src={testImage} alt="Test Image" fill className="object-cover" unoptimized />
                <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-white font-medium text-sm">
                  Change Image
                  <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
                </label>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center space-y-2 p-8 text-center w-full h-full justify-center">
                <Upload className="w-10 h-10 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">Drop a single TEST image</span>
                <span className="text-xs text-zinc-400">JPG, PNG or WebP</span>
                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" />
              </label>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Base Prompt</label>
              <textarea 
                value={basePrompt}
                onChange={(e) => setBasePrompt(e.target.value)}
                placeholder="e.g. Make it brighter and luxury"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 resize-none h-24"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1">Variations</label>
              <select 
                value={numVariations} 
                onChange={(e) => setNumVariations(Number(e.target.value))}
                className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900"
              >
                {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Variations</option>)}
              </select>
            </div>
            
            <button
              disabled={!testImage || !basePrompt || isGeneratingPrompts}
              onClick={generatePrompts}
              className="w-full py-3 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 hover:bg-zinc-800 transition-all"
            >
              {isGeneratingPrompts ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
              <span>Generate Prompts</span>
            </button>
          </div>
        </div>

        {/* Right Column: Variations & Grid */}
        <div className="space-y-6 md:col-span-2">
          {variations.length > 0 && (
            <div className="grid lg:grid-cols-2 gap-4">
              {variations.map((v, i) => (
                <div key={v.id} className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Option {i + 1}</span>
                    <button 
                      disabled={v.status === 'generating'}
                      onClick={() => processSingleVariation(v.id)}
                      className={`p-1.5 rounded-md flex items-center gap-1.5 text-xs font-medium transition-colors ${
                        v.status === 'generating' ? 'bg-zinc-100 text-zinc-400' : 
                        v.status === 'done' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' :
                        'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {v.status === 'generating' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                       v.status === 'done' ? <Check className="w-3.5 h-3.5" /> :
                       <Play className="w-3.5 h-3.5" />}
                      {v.status === 'generating' ? 'Running' : v.status === 'done' ? 'Re-run' : 'Generate'}
                    </button>
                  </div>
                  <textarea 
                    value={v.prompt}
                    onChange={(e) => updatePrompt(v.id, e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-100 focus:border-zinc-300 rounded-lg p-2 text-xs font-mono resize-none h-20 text-zinc-700 focus:outline-none"
                  />
                  {v.error && <p className="text-[10px] text-red-500 font-medium">{v.error}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Outputs Grid with 2px gap */}
          {variations.some(v => v.imageUrl || v.status === 'generating') && (
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-zinc-900 mb-4 uppercase tracking-wider">Results Grid</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-[2px] bg-zinc-200 rounded-xl overflow-hidden border border-zinc-200">
                {variations.map((v, i) => (
                  <div 
                    key={v.id} 
                    className="relative aspect-square bg-white group cursor-pointer"
                    onClick={() => { if(v.imageUrl) setSelectedVariationId(v.id) }}
                  >
                    {v.status === 'generating' ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50">
                        <Loader2 className="w-6 h-6 animate-spin mb-2" />
                        <span className="text-xs font-medium">Gen {i+1}...</span>
                      </div>
                    ) : v.imageUrl ? (
                      <>
                        <Image src={v.imageUrl} alt={`Variation ${i+1}`} fill className="object-cover" unoptimized />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                          <Maximize2 className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-zinc-200">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sticky Footer for Process All */}
      {variations.length > 0 && <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-zinc-200 p-4 z-40 flex justify-center shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
        <button
          disabled={!canProcessAll}
          onClick={processAll}
          className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-medium flex items-center space-x-2 disabled:opacity-50 hover:bg-zinc-800 transition-all shadow-lg active:scale-95 disabled:active:scale-100"
        >
          {isGeneratingAny ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          <span>{isGeneratingAny ? 'Processing...' : 'Generate ALL Images'}</span>
        </button>
      </div>}

      {/* Modal for larger view */}
      <AnimatePresence>
        {selectedVariation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-zinc-900/90 backdrop-blur-sm"
          >
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative">
              <button 
                onClick={() => setSelectedVariationId(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors md:hidden"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="relative w-full md:w-3/5 bg-zinc-100 min-h-[40vh] md:min-h-0 flex items-center justify-center">
                {selectedVariation.imageUrl && (
                  <Image src={selectedVariation.imageUrl} alt="Result" fill className="object-contain" unoptimized />
                )}
              </div>
              
              <div className="w-full md:w-2/5 p-6 flex flex-col space-y-6 overflow-y-auto">
                <div className="flex justify-between items-start hidden md:flex">
                  <h3 className="text-lg font-bold text-zinc-900">Result Details</h3>
                  <button 
                    onClick={() => setSelectedVariationId(null)}
                    className="p-1.5 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 flex-1">
                  <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">Prompt Used</label>
                  <p className="text-sm font-mono text-zinc-700 bg-zinc-50 p-4 rounded-xl border border-zinc-100 leading-relaxed">
                    {selectedVariation.prompt}
                  </p>
                </div>
                
                <div className="flex gap-3 mt-auto pt-4">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(selectedVariation.prompt);
                      // minimal feedback could be added here
                    }}
                    className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Prompt
                  </button>
                  <button 
                    onClick={() => {
                      if (selectedVariation.imageUrl) {
                        const a = document.createElement('a');
                        a.href = selectedVariation.imageUrl;
                        a.download = `tuning-variation-${selectedVariation.id}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors text-sm shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Save Image
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

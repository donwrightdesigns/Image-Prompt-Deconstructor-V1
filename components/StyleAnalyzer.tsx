'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Upload, Sparkles, Copy, Check, Image as ImageIcon, Loader2, History, LogIn, LogOut, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getGeminiModel } from '@/lib/gemini';
import { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, User } from '@/firebase';

interface HistoryItem {
  id: string;
  prompt: string;
  mode: 'single' | 'essence';
  createdAt: any;
  thumbnailUrls?: string[];
}

export default function StyleAnalyzer() {
  const [images, setImages] = useState<string[]>([]);
  const [mode, setMode] = useState<'single' | 'essence'>('single');
  const [analyzing, setAnalyzing] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'prompts'),
      where('uid', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as HistoryItem[];
      setHistory(items);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Sign in error:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const processFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        if (mode === 'single') {
          setImages([result]);
        } else {
          setImages(prev => [...prev, result].slice(-4)); // Limit to 4 for performance/context
        }
        setPrompt(null);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files);
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
    if (e.dataTransfer.files) processFiles(e.dataTransfer.files);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPrompt(null);
  };

  const analyzeStyle = async () => {
    if (images.length === 0) return;
    setAnalyzing(true);
    try {
      const ai = getGeminiModel();
      
      const imageParts = images.map(img => ({
        inlineData: {
          mimeType: "image/jpeg",
          data: img.split(',')[1]
        }
      }));

      const systemPrompt = mode === 'single' 
        ? "Analyze this image and reverse-engineer a highly detailed prompt that would allow an AI image generator to replicate this exact style, lighting, composition, and subject matter. Focus on technical terms like camera angle, lighting type, color palette, and artistic style. Return only the prompt text."
        : "Analyze these multiple images to extract their common 'Style Essence'. Identify the recurring qualitative elements: the specific color grading, lighting patterns, texture, artistic medium, and emotional mood that binds them together. Create a reusable 'Style Prompt' that can be applied to ANY new subject to give it this exact look. Focus on the 'how' (style) rather than the 'what' (subject). Return only the prompt text.";

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: [
          {
            parts: [
              ...imageParts,
              { text: systemPrompt }
            ]
          }
        ]
      });

      const generatedPrompt = response.text || "Could not generate prompt.";
      setPrompt(generatedPrompt);

      // Save to history if user is logged in
      if (user && response.text) {
        try {
          await addDoc(collection(db, 'prompts'), {
            uid: user.uid,
            prompt: generatedPrompt,
            mode,
            createdAt: serverTimestamp(),
            thumbnailUrls: images.slice(0, 4) // Store thumbnails (base64 for now, ideally storage)
          });
        } catch (e) {
          console.error("Error saving to history:", e);
        }
      }
    } catch (error) {
      console.error(error);
      setPrompt("Error analyzing style. Please check your API key.");
    } finally {
      setAnalyzing(false);
    }
  };

  const copyToClipboard = () => {
    if (prompt) {
      navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <header className="relative space-y-4">
        <div className="flex justify-end">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {user.photoURL && (
                  <Image src={user.photoURL} alt={user.displayName || ''} width={32} height={32} className="rounded-full" />
                )}
                <span className="text-sm font-medium text-zinc-600 hidden sm:inline">{user.displayName}</span>
              </div>
              <button 
                onClick={handleSignOut}
                className="text-zinc-400 hover:text-zinc-900 transition-colors p-2"
                title="Sign Out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-lg text-sm font-medium transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Save History
            </button>
          )}
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900">Style Interpreter</h1>
          <p className="text-zinc-500">Extract the qualitative essence from one or many images.</p>
        </div>
        
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center p-1 bg-zinc-100 rounded-xl w-fit">
            <button
              onClick={() => { setMode('single'); setImages([]); setPrompt(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'single' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Single Deconstructor
            </button>
            <button
              onClick={() => { setMode('essence'); setImages([]); setPrompt(null); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'essence' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              Style Essence (Multi)
            </button>
          </div>

          {user && history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className={`p-2.5 rounded-xl transition-all ${showHistory ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
              title="Toggle History"
            >
              <History className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {showHistory && user && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-zinc-900">Prompt History</h2>
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{history.length} Saved</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {history.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white border border-zinc-200 rounded-xl p-4 space-y-3 hover:border-zinc-300 transition-all cursor-pointer group"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setMode(item.mode);
                      setShowHistory(false);
                    }}
                  >
                    <div className="flex gap-2 h-12">
                      {item.thumbnailUrls?.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 border border-zinc-100">
                          <Image src={url} alt="" fill className="object-cover" unoptimized />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-600 line-clamp-3 font-mono leading-relaxed">
                      {item.prompt}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-50">
                      <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${item.mode === 'single' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                        {item.mode}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-4">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative aspect-square rounded-2xl border-2 border-dashed transition-all flex flex-col items-center justify-center overflow-hidden
              ${images.length > 0 ? 'border-zinc-200' : isDragging ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400 bg-zinc-50'}`}
          >
            {images.length > 0 ? (
              <div className={`grid w-full h-full p-4 gap-2 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg overflow-hidden group">
                    <Image 
                      src={img} 
                      alt={`Preview ${idx}`} 
                      fill 
                      className="object-cover"
                      unoptimized
                    />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur p-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <ImageIcon className="w-3 h-3 text-zinc-600" />
                    </button>
                  </div>
                ))}
                {mode === 'essence' && images.length < 4 && (
                  <label className="border-2 border-dashed border-zinc-200 rounded-lg flex items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors">
                    <Upload className="w-6 h-6 text-zinc-300" />
                    <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple />
                  </label>
                )}
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center space-y-2 p-12 text-center w-full h-full justify-center">
                <Upload className="w-10 h-10 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">
                  {mode === 'single' ? 'Click to upload or drag and drop' : 'Upload up to 4 style examples'}
                </span>
                <span className="text-xs text-zinc-400">JPG, PNG or WebP</span>
                <input type="file" className="hidden" onChange={handleUpload} accept="image/*" multiple={mode === 'essence'} />
              </label>
            )}
          </div>
          
          <button
            disabled={images.length === 0 || analyzing}
            onClick={analyzeStyle}
            className="w-full py-4 bg-zinc-900 text-white rounded-xl font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-800 transition-all active:scale-[0.98]"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{mode === 'single' ? 'Analyzing Style...' : 'Extracting Essence...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>{mode === 'single' ? 'Reverse Engineer Prompt' : 'Extract Style Essence'}</span>
              </>
            )}
          </button>
        </div>

        {/* Result Section */}
        <div className="space-y-4">
          <div className="h-full min-h-[300px] rounded-2xl bg-zinc-50 border border-zinc-200 p-6 relative flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Generated Prompt</h2>
              {prompt && (
                <button 
                  onClick={copyToClipboard}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
                </button>
              )}
            </div>
            
            <div className="flex-1 font-mono text-sm leading-relaxed text-zinc-700">
              <AnimatePresence mode="wait">
                {prompt ? (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    key="prompt"
                  >
                    {prompt}
                  </motion.p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300 space-y-2" key="empty">
                    <Sparkles className="w-8 h-8 opacity-20" />
                    <p>Upload an image to see the magic</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

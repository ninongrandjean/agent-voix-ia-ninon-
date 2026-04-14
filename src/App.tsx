/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Info, Languages, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AudioRecorder, AudioPlayer } from './lib/audio-utils';
import { GeminiLiveClient } from './lib/gemini-live';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientRef = useRef<GeminiLiveClient | null>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      setError("Gemini API Key is missing. Please add it to your environment variables.");
      return;
    }
    clientRef.current = new GeminiLiveClient(apiKey);
    playerRef.current = new AudioPlayer();
    
    return () => {
      stopSession();
    };
  }, []);

  const startSession = async () => {
    if (!clientRef.current) return;
    
    setIsConnecting(true);
    setError(null);

    try {
      await clientRef.current.connect({
        onopen: () => {
          setIsConnected(true);
          setIsConnecting(false);
          startRecording();
        },
        onmessage: async (message) => {
          console.log("Received message from Gemini:", message);
          
          const parts = message.serverContent?.modelTurn?.parts;
          if (parts) {
            for (const part of parts) {
              if (part.inlineData?.data) {
                setIsSpeaking(true);
                await playerRef.current?.play(part.inlineData.data);
                // Reset speaking state after a short delay
                setTimeout(() => setIsSpeaking(false), 500);
              }
            }
          }
          
          if (message.serverContent?.interrupted) {
            console.log("Assistant interrupted");
            playerRef.current?.stop();
            setIsSpeaking(false);
          }

          if (message.serverContent?.modelTurn?.parts[0]?.text) {
            console.log("Assistant text:", message.serverContent.modelTurn.parts[0].text);
          }

          if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
             // Handled above
          }
          
          if (message.serverContent?.turnComplete) {
            console.log("Turn complete");
          }
        },
        onerror: (err) => {
          console.error("Gemini Live Error:", err);
          setError("Connection error. Please try again.");
          stopSession();
        },
        onclose: () => {
          stopSession();
        }
      });
    } catch (err) {
      console.error("Failed to connect:", err);
      setError("Failed to connect to the assistant.");
      setIsConnecting(false);
    }
  };

  const startRecording = () => {
    recorderRef.current = new AudioRecorder((base64Data) => {
      if (!isMuted) {
        clientRef.current?.sendAudio(base64Data);
      }
    });
    recorderRef.current.start().catch(err => {
      console.error("Microphone error:", err);
      setError("Could not access microphone.");
      stopSession();
    });
  };

  const stopSession = () => {
    recorderRef.current?.stop();
    clientRef.current?.disconnect();
    playerRef.current?.stop();
    setIsConnected(false);
    setIsConnecting(false);
    setIsSpeaking(false);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  return (
    <div className="min-h-screen bg-[#0a0502] text-[#f5f2ed] font-sans selection:bg-[#ff4e00] selection:text-white overflow-hidden flex flex-col items-center justify-center p-6">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,#3a1510_0%,transparent_60%)] opacity-80" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_80%,#ff4e00_0%,transparent_50%)] opacity-40 blur-[60px]" />
      </div>

      {/* Main Content */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center gap-12"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex items-center justify-center gap-2 text-[#ff4e00] mb-4"
          >
            <Sparkles size={20} />
            <span className="text-xs font-mono uppercase tracking-[0.2em]">Personal Assistant</span>
          </motion.div>
          <h1 className="text-5xl font-serif font-light tracking-tight">Ninon Grandjean</h1>
          <p className="text-[#f5f2ed]/60 text-sm font-light tracking-wide">English & Français</p>
        </div>

        {/* Visualizer / Avatar Area */}
        <div className="relative w-64 h-64 flex items-center justify-center">
          <AnimatePresence>
            {isConnected && (
              <>
                {/* Pulsing Rings */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: isSpeaking ? [1, 1.2, 1] : 1,
                    opacity: isSpeaking ? [0.2, 0.4, 0.2] : 0.2
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 rounded-full border border-[#ff4e00]/30"
                />
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ 
                    scale: isSpeaking ? [1, 1.4, 1] : 1.1,
                    opacity: isSpeaking ? [0.1, 0.3, 0.1] : 0.1
                  }}
                  transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
                  className="absolute inset-0 rounded-full border border-[#ff4e00]/20"
                />
              </>
            )}
          </AnimatePresence>

          {/* Central Avatar / Icon */}
          <motion.div
            animate={{ 
              scale: isSpeaking ? [1, 1.05, 1] : 1,
              boxShadow: isSpeaking ? "0 0 40px rgba(255, 78, 0, 0.4)" : "0 0 20px rgba(255, 78, 0, 0.1)"
            }}
            transition={{ duration: 0.5, repeat: isSpeaking ? Infinity : 0 }}
            className={`w-48 h-48 rounded-full bg-[#1a1614] border border-[#f5f2ed]/10 flex items-center justify-center overflow-hidden relative group`}
          >
            {isConnected ? (
              <div className="flex flex-col items-center gap-3">
                <Volume2 className={`text-[#ff4e00] transition-all duration-500 ${isSpeaking ? 'scale-125' : 'scale-100'}`} size={48} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff4e00]/60">Live</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Mic className="text-[#f5f2ed]/40" size={48} />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#f5f2ed]/20">Standby</span>
              </div>
            )}
            
            {/* Glass Overlay */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
          </motion.div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center gap-8 w-full">
          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-full text-xs"
            >
              {error}
            </motion.div>
          )}

          <div className="flex items-center gap-6">
            <AnimatePresence mode="wait">
              {!isConnected ? (
                <motion.button
                  key="start"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={startSession}
                  disabled={isConnecting}
                  className="px-10 py-4 bg-[#ff4e00] text-white rounded-full font-medium tracking-wide shadow-lg shadow-[#ff4e00]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Mic size={20} />
                      <span>Start Conversation</span>
                    </>
                  )}
                </motion.button>
              ) : (
                <motion.div 
                  key="active"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-4"
                >
                  <button
                    onClick={toggleMute}
                    className={`p-4 rounded-full border transition-all duration-300 ${isMuted ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                  >
                    {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  </button>
                  
                  <button
                    onClick={stopSession}
                    className="px-8 py-4 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full font-medium tracking-wide transition-all"
                  >
                    End Session
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 w-full">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#ff4e00]">
                <Languages size={14} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Languages</span>
              </div>
              <p className="text-xs text-[#f5f2ed]/60">English & French supported. Ask anything about Ninon's career.</p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2 text-[#ff4e00]">
                <Info size={14} />
                <span className="text-[10px] font-mono uppercase tracking-wider">Context</span>
              </div>
              <p className="text-xs text-[#f5f2ed]/60">Based on Ninon's CV: Fashion Business student at ESMOD Paris.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <footer className="fixed bottom-8 text-[10px] font-mono uppercase tracking-[0.3em] text-[#f5f2ed]/20">
        Powered by Gemini Live API
      </footer>
    </div>
  );
}

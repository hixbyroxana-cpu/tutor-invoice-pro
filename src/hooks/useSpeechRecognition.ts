import { useEffect, useRef, useState, useCallback } from "react";

// Minimal types for the Web Speech API (not in lib.dom by default in all setups)
type SRResult = { isFinal: boolean; 0: { transcript: string } };
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SR = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

export function useSpeechRecognition(lang = "en-GB") {
  const recRef = useRef<SR | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) { setSupported(false); return; }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interimText += r[0].transcript;
      }
      if (finalText) setTranscript((p) => (p ? p + " " : "") + finalText.trim());
      setInterim(interimText);
    };
    rec.onerror = (e) => { setError(e.error || "speech error"); setListening(false); };
    rec.onend = () => { setListening(false); setInterim(""); };
    recRef.current = rec;
    return () => { try { rec.abort(); } catch { /* noop */ } };
  }, [lang]);

  const start = useCallback(() => {
    if (!recRef.current) return;
    setError(null);
    setTranscript("");
    setInterim("");
    try { recRef.current.start(); setListening(true); } catch (e) { setError(String(e)); }
  }, []);
  const stop = useCallback(() => { recRef.current?.stop(); }, []);
  const reset = useCallback(() => { setTranscript(""); setInterim(""); }, []);

  return { listening, transcript, interim, supported, error, start, stop, reset };
}

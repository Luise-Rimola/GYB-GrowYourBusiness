"use client";

import { useState, useRef, useCallback } from "react";

type VoiceTextareaProps = {
  name: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
};


export function VoiceTextarea({
  name,
  placeholder,
  rows = 4,
  className = "",
  disabled,
}: VoiceTextareaProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const SpeechRecognitionAPI =
    typeof window !== "undefined"
      ? window.SpeechRecognition ?? window.webkitSpeechRecognition
      : undefined;

  const startListening = useCallback(() => {
    if (!SpeechRecognitionAPI) {
      setVoiceError("Spracherkennung wird in diesem Browser nicht unterstützt (Chrome, Edge empfohlen).");
      return;
    }
    setVoiceError(null);
    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.lang = "de-DE";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setText((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        if (event.error !== "aborted") {
          const msg: Record<string, string> = {
            network: "Verbindung zum Spracherkennungsdienst fehlgeschlagen. VPN/Proxy prüfen oder später erneut versuchen. Alternativ Text eingeben.",
            "no-speech": "Keine Sprache erkannt. Bitte erneut versuchen.",
            "not-allowed": "Mikrofon-Zugriff verweigert. Berechtigung in den Browser-Einstellungen prüfen.",
            "audio-capture": "Mikrofon nicht verfügbar.",
            "service-not-allowed": "Spracherkennung nicht erlaubt.",
            "language-not-supported": "Sprache wird nicht unterstützt.",
          };
          setVoiceError(msg[event.error] ?? `Spracherkennung: ${event.error}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
    } catch (err) {
      setVoiceError(err instanceof Error ? err.message : "Spracherkennung fehlgeschlagen");
    }
  }, [SpeechRecognitionAPI]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return (
    <div className="relative">
      <textarea
        name={name}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={className}
      />
      <div className="absolute right-3 top-3 flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          title={isListening ? "Aufnahme beenden" : "Spracheingabe starten"}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            isListening
              ? "bg-rose-500 text-white animate-pulse"
              : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </button>
        {voiceError && (
          <span className="max-w-[280px] text-right text-xs text-amber-600 dark:text-amber-400">
            {voiceError}
          </span>
        )}
      </div>
    </div>
  );
}

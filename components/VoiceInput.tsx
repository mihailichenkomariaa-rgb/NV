
import React, { useState, useRef, useEffect } from 'react';
import Button from './Button';

interface Props {
  onTranscript: (text: string) => void;
}

const VoiceInput: React.FC<Props> = ({ onTranscript }) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const recognitionRef = useRef<any>(null);
  
  // Use a ref for the callback to prevent effect re-runs when the parent function changes
  // This is critical because parent components often pass inline arrow functions that change on every render
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  }, [onTranscript]);

  useEffect(() => {
    // Support both standard and WebKit prefixed versions
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      
      recognition.continuous = true; // Keep listening until stopped manually
      recognition.lang = 'ru-RU';
      recognition.interimResults = false; // Simplify handling by only using final results

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                const transcript = event.results[i][0].transcript.trim();
                if (transcript && onTranscriptRef.current) {
                    onTranscriptRef.current(transcript);
                }
            }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error === 'not-allowed') {
            alert("Пожалуйста, разрешите доступ к микрофону в настройках браузера.");
            setIsListening(false);
        } else if (event.error === 'no-speech') {
            // No speech detected, ignore or handle if needed
        } else {
             // Other errors (network, etc) - stop listening to sync UI
             setIsListening(false);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setIsSupported(false);
    }

    return () => {
        if (recognitionRef.current) {
            recognitionRef.current.abort();
        }
    };
  }, []); // Empty dependency array ensures we initialize only once

  const toggleListening = () => {
    if (!isSupported || !recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error("Failed to start recognition", e);
        // If start fails (e.g. already started), ensure state is synced
        setIsListening(false);
      }
    }
  };

  if (!isSupported) return null;

  return (
    <Button 
      type="button" 
      onClick={toggleListening} 
      variant={isListening ? 'danger' : 'secondary'}
      className={`min-w-[60px] transition-all duration-300 ${isListening ? 'animate-pulse ring-2 ring-red-400' : ''}`}
      title={isListening ? "Стоп (запись идет)" : "Начать запись"}
    >
      {isListening ? (
        <span>🔴</span>
      ) : (
        <span>🎤</span>
      )}
    </Button>
  );
};

export default VoiceInput;

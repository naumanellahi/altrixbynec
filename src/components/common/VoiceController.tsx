import { useEffect } from "react";

type VoiceControllerProps = {
  onCommand: (command: string) => void;
  onClose: () => void;
};

export function VoiceController({ onCommand, onClose }: VoiceControllerProps) {
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      // Notify user that voice is not supported
      import("sonner").then(({ toast }) => {
        toast.warn("Voice recognition not supported in this browser");
      });
      onClose();
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.continuous = false;
    recognizer.interimResults = false;
    recognizer.lang = "en-US";

    const handleResult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0].transcript)
        .join(" ")
        .trim();
      if (transcript) {
        onCommand(transcript);
      }
      // Stop after handling the command
      recognizer.stop();
    };

    const handleEnd = () => {
      // Close the controller when recognition ends
      onClose();
    };

    const handleError = (event: any) => {
      import("sonner").then(({ toast }) => {
        toast.error(`Voice recognition error: ${event.error || "unknown"}`);
      });
      onClose();
    };

    recognizer.addEventListener("result", handleResult as any);
    recognizer.addEventListener("end", handleEnd as any);
    recognizer.addEventListener("error", handleError as any);
    recognizer.start();

    return () => {
      recognizer.removeEventListener("result", handleResult as any);
      recognizer.removeEventListener("end", handleEnd as any);
      recognizer.removeEventListener("error", handleError as any);
      recognizer.abort();
    };
  }, [onCommand, onClose]);

  // No UI needed – this component is headless
  return null;
}

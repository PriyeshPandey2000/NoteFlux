"use client";

import { useEffect, useState, useRef } from "react";
import axios from 'axios';
import { useSession } from 'next-auth/react';

export default function VoiceText() {
  const { data: session, status } = useSession();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingComplete, setRecordingComplete] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const recognitionRef = useRef(null);

  const startRecording = () => {
    setIsRecording(true);
    recognitionRef.current = new window.webkitSpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = "";
      let newInterimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          newInterimTranscript += event.results[i][0].transcript;
        }
      }
      setTranscript((prevTranscript) => prevTranscript + finalTranscript);
      setInterimTranscript(newInterimTranscript);
    };

    recognitionRef.current.start();
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setRecordingComplete(true);
    }
  };

  const handleToggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  };

  const handleSaveTranscript = async () => {
    if (!session) {
      alert('You must be logged in to save the transcript');
      return;
    }
  
    // Log the type of transcript
    console.log(typeof transcript);
  
    try {
      const response = await fetch('/api/savenote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      });
  
      if (response.ok) {
        alert('Transcript saved successfully!');
        setTranscript('');
        setRecordingComplete(false);
      } else {
        const errorData = await response.json();
        console.error('Error saving transcript:', errorData);
        alert('Failed to save transcript: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error saving transcript:', error);
      alert('Failed to save transcript.');
    }
  };

  const handleSaveToNotion = async () => {
    if (!session) {
      alert('You must be logged in to save the transcript to Notion');
      return;
    }

    try {
      const response = await fetch('/api/saveNotion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ transcript })
      });

      if (response.ok) {
        alert('Transcript saved to Notion successfully!');
        setTranscript('');
        setRecordingComplete(false);
      } else {
        const errorData = await response.json();
        console.error('Error saving transcript to Notion:', errorData);
        alert('Failed to save transcript to Notion: ' + errorData.message);
      }
    } catch (error) {
      console.error('Error saving transcript to Notion:', error);
      alert('Failed to save transcript to Notion.');
    }
  };

  return (
    <div className="flex items-center justify-center w-full">
      <div className="w-full">
        {(isRecording || transcript) && (
          <div className="w-1/2 m-auto rounded-md border p-4 bg-black">
            <div className="flex-1 flex w-full justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none text-white">
                  {recordingComplete ? "Recorded" : "Recording"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {recordingComplete
                    ? "Thanks for talking."
                    : "Start speaking..."}
                </p>
              </div>
              {isRecording && (
                <div className="rounded-full w-4 h-4 bg-red-400 animate-pulse" />
              )}
            </div>
            <div className="border rounded-md p-4 mt-4 bg-black">
              <p className="mb-0 text-white whitespace-pre-wrap">
                {transcript + interimTranscript}
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center w-full">
          {isRecording ? (
            <button
              onClick={handleToggleRecording}
              className="mt-10 m-auto flex items-center justify-center bg-red-400 hover:bg-red-500 rounded-full w-20 h-20 focus:outline-none"
            >
              <svg
                className="h-12 w-12"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path fill="white" d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleToggleRecording}
              className="mt-10 m-auto flex items-center justify-center bg-[#dafa53] hover:bg-blue-500 rounded-full w-20 h-20 focus:outline-none"
            >
              <svg
                viewBox="0 0 256 256"
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-white"
              >
                <path
                  fill="black"
                  d="M128 176a48.05 48.05 0 0 0 48-48V64a48 48 0 0 0-96 0v64a48.05 48.05 0 0 0 48 48ZM96 64a32 32 0 0 1 64 0v64a32 32 0 0 1-64 0Zm40 143.6V232a8 8 0 0 1-16 0v-24.4A80.11 80.11 0 0 1 48 128a8 8 0 0 1 16 0a64 64 0 0 0 128 0a8 8 0 0 1 16 0a80.11 80.11 0 0 1-72 79.6Z"
                />
              </svg>
            </button>
          )}
        </div>
        {recordingComplete && (
          <>
            <button
              onClick={handleSaveTranscript}
              className="mt-4 bg-blue-500 text-white p-2 rounded"
            >
              Save Transcript
            </button>
            <button
              onClick={handleSaveToNotion}
              className="mt-4 bg-green-500 text-white p-2 rounded"
            >
              Save to Notion
            </button>
          </>
        )}
      </div>
    </div>
  );
}

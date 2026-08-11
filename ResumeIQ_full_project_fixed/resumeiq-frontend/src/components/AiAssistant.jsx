import React, { useState, useEffect, useRef, useCallback } from "react";
import robotImg from "../assets/robot.png";
import welcomeAudio from "../assets/welcome.mp3";
import "./AiAssistant.css";

const SCRIPT_TIMELINE = [
  "Hello, and welcome to ResumeIQ!",
  "I'm your AI career assistant...",
  "...and I'm here to help you achieve your career goals.",
  "If you're new, you can sign in...",
  "...or create an account to get started.",
  "If you're already a member, welcome back! Upload your resume or create one from scratch...",
  "...and I'll analyze it.",
  "I will calculate your ATS score...",
  "...and identify missing skills.",
  "I will provide personalized suggestions...",
  "...and recommend jobs that match your profile.",
  "You can also improve your resume with AI assistance...",
  "...choose professional templates, and download your final resume.",
  "Let's build your future together.",
  "I'm excited to help you on your journey!",
];

export default function AiAssistant() {
  const [text, setText] = useState("");
  const [showPrompt, setShowPrompt] = useState(true);
  const [isPulsing, setIsPulsing] = useState(true);
  const [toggleIcon, setToggleIcon] = useState("🔊");

  const audioRef = useRef(null);
  const currentLineRef = useRef(0);
  const letterIndexRef = useRef(0);
  const isStartedRef = useRef(false);
  const isPausedRef = useRef(false);
  const timeoutIdRef = useRef(null);

  const typeLetter = useCallback(() => {
    if (isPausedRef.current) return;

    const currentSentence = SCRIPT_TIMELINE[currentLineRef.current];
    const idx = letterIndexRef.current;

    if (idx < currentSentence.length) {
      const nextChar = currentSentence.charAt(idx);
      setText((prev) => prev + nextChar);
      letterIndexRef.current = idx + 1;

      // Speed up slightly for the combined member message line
      const typingSpeed = currentLineRef.current === 5 ? 18 : 25;
      timeoutIdRef.current = setTimeout(typeLetter, typingSpeed);
    } else {
      timeoutIdRef.current = setTimeout(moveToNextLine, 1600);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const moveToNextLine = useCallback(() => {
    if (isPausedRef.current) return;

    currentLineRef.current += 1;
    if (currentLineRef.current < SCRIPT_TIMELINE.length) {
      setText("");
      letterIndexRef.current = 0;
      typeLetter();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startExperience = useCallback(() => {
    if (isStartedRef.current) return;
    isStartedRef.current = true;

    setShowPrompt(false);

    const audio = audioRef.current;
    if (audio) {
      audio.play().catch(() => {
        console.log("Auto playback restricted via browser rules, fallback activated.");
      });
    }

    setText("");
    typeLetter();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlayback = useCallback(
    (event) => {
      if (event) event.stopPropagation();

      if (!isStartedRef.current) {
        startExperience();
        return;
      }

      const audio = audioRef.current;

      if (!isPausedRef.current) {
        isPausedRef.current = true;
        if (audio) audio.pause();
        clearTimeout(timeoutIdRef.current);
        setToggleIcon("⏸️");
        setIsPulsing(false);
      } else {
        isPausedRef.current = false;
        if (audio) audio.play().catch((e) => console.log(e));
        setToggleIcon("🔊");
        setIsPulsing(true);

        const currentSentence = SCRIPT_TIMELINE[currentLineRef.current];
        if (letterIndexRef.current < currentSentence.length) {
          typeLetter();
        } else {
          timeoutIdRef.current = setTimeout(moveToNextLine, 1600);
        }
      }
    },
    [startExperience, typeLetter, moveToNextLine]
  );

  // Mirrors: window.onload -> try autoplay, else wait for a click anywhere
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio
      .play()
      .then(() => {
        startExperience();
      })
      .catch(() => {
        document.body.addEventListener("click", startExperience);
      });

    return () => {
      document.body.removeEventListener("click", startExperience);
      clearTimeout(timeoutIdRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goBack = (e) => {
    e.preventDefault();
    window.history.back();
  };

  return (
    <div className="ai-assistant-page">
      <a href="#" className="close-btn" title="Go back" onClick={goBack}>
        &times;
      </a>

      <div className="container">
        <div className="robot">
          <img src={robotImg} alt="Robot" />
        </div>

        <div className="chat-box">
          <button
            className={`control-btn${isPulsing ? " pulse" : ""}`}
            id="toggle-btn"
            onClick={togglePlayback}
          >
            {toggleIcon}
          </button>

          <h1>Hello!</h1>

          <p id="text">{text}</p>

          <audio ref={audioRef} id="voice">
            <source src={welcomeAudio} type="audio/mpeg" />
          </audio>
        </div>
      </div>

      {showPrompt && (
        <div className="click-prompt" id="prompt">
          Click anywhere to start audio & assistant
        </div>
      )}
    </div>
  );
}

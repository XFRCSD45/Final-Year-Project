import React, { useContext, useEffect, useState } from "react";
import Instructions from "../../components/Instrctions/Instructions";
import YogaContext from "../../YogaContext";
import { useNavigate } from "react-router-dom";
import "./Yoga.css";
import { poseImages } from "../../utils/pose_images";

const poseList = [
  "Tree",
  "Chair",
  "Cobra",
  "Warrior",
  "Dog",
  "Shoulderstand",
  "Traingle",
];

function Yoga() {
  const navigate = useNavigate();
  const { startYoga, currentPose, setCurrentPosefunc } = useContext(YogaContext);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [step, setStep] = useState(0); // 0: Ask for pose, 1: Waiting for 'start pose'

  // Check for Web Speech API support on load
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setVoiceSupported(true);
    } else {
      alert("Your browser does not support voice commands.");
    }
  }, []);

  // Function to provide spoken feedback
  const speak = (message) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(message);
    synth.speak(utterance);
  };

  // Handle voice commands
  const handleVoiceCommand = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListening(true);
      if (step === 0) {
        speak("Which pose do you want to select?");
        setFeedback("Which pose do you want to select?");
      } else if (step === 1) {
        speak("Say start  to begin.");
        setFeedback("Say 'start ' to begin.");
      }
    };

    recognition.onresult = (event) => {
      let speechToText = event.results[event.results.length - 1][0].transcript
        .toLowerCase()
        .trim();

      if (step === 0) {
        // Match spoken text to pose list
        const matchedPose = poseList.find((pose) =>
          speechToText.includes(pose.toLowerCase())
        );
        if (matchedPose) {
          setCurrentPosefunc(matchedPose);
          speak(`Pose selected: ${matchedPose}`);
          setFeedback(`Pose selected: ${matchedPose}. Say 'start' to begin.`);
          setStep(1); // Move to the next step
        } else {
          speak("Pose not recognized. Please try again.");
          setFeedback("Pose not recognized. Please try again.");
        }
      } else if (step === 1 ) {
        let flag = true;
        while (flag) {
          speechToText = event.results[event.results.length - 1][0].transcript
            .toLowerCase()
            .trim();
          if (speechToText.includes("start")) {
            speak("Starting the pose.");
            startYoga(true);
            setFeedback("Starting the pose...");
            flag=false;
            recognition.stop();
            navigate("/yoga");
          }
        }

        // Stop recognition after starting the pose
      } else {
        speak("Command not recognized. Please try again.");
        setFeedback("Command not recognized. Please try again.");
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setFeedback(`Error: ${event.error}`);
    };

    recognition.onend = () => {
      setIsListening(false);
      setFeedback("Stopped listening.");
    };

    recognition.start();
  };

  // Start voice recognition if supported
  useEffect(() => {
    if (voiceSupported) {
      handleVoiceCommand();
    }
    return () => {
      if (isListening) {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.stop();
      }
    };
  }, [voiceSupported, step]);

  return (
    <div className="yoga-container">
      <div className="yoga-top">
        <div>
          <h2>Voice-Controlled Yoga Assistant</h2>
          <p>{feedback}</p>
        </div>
      </div>

      <Instructions />
      <div className="selected-pose-feedback">
        {currentPose && (
          <>
            <h4>Selected Pose:</h4>
            <p>{currentPose}</p>
            <img src={poseImages[currentPose]} alt={currentPose} />
          </>
        )}
      </div>
    </div>
  );
}

export default Yoga;

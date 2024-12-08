// import React, { useRef, useEffect, useContext, useState } from "react";
// import * as poseDetection from "@tensorflow-models/pose-detection";
// import * as tf from "@tensorflow/tfjs";
// import Webcam from "react-webcam";
// import YogaContext from "../../YogaContext";
// import { poseImages } from "../../utils/pose_images";
// import { POINTS, keypointConnections } from "../../utils/data";
// import { drawPoint, drawSegment } from "../../utils/helper";
// import { count } from "../../utils/music";
// import "./Yoga.css";
// import "./YogaCanvas.css";
// import { Link } from "react-router-dom";

// let flag = false;
// let skeletonColor = "rgb(255,0,0)";
// let interval;

// function YogaCanvas() {
//   const {
//     stopPose,
//     isStartPose,
//     startingTimefunc,
//     currentTimefunc,
//     poseTimefunc,
//     bestPerformfunc,
//     currentPose,
//     startingTime,
//     currentTime,
//     poseTime,
//     bestPerform,
//   } = useContext(YogaContext);

//   const [feedback, setFeedback] = useState(""); // Feedback state
//   const detectorRef = useRef(null); // To store the detector
//   const poseClassifierRef = useRef(null); // To store the classifier

//   useEffect(() => {
//     const timeDiff = (currentTime - startingTime) / 1000;
//     if (flag) {
//       poseTimefunc(timeDiff);
//     }
//     if (timeDiff > bestPerform) {
//       bestPerformfunc(timeDiff);
//     }
//   }, [currentTime]);

//   useEffect(() => {
//     currentTimefunc(0);
//     poseTimefunc(0);
//     bestPerformfunc(0);
//   }, [currentPose]);

//   const webcamRef = useRef(null);
//   const canvasRef = useRef(null);

//   const CLASS_NO = {
//     Chair: 0,
//     Cobra: 1,
//     Dog: 2,
//     No_Pose: 3,
//     Shoulderstand: 4,
//     Traingle: 5,
//     Tree: 6,
//     Warrior: 7,
//   };

//   function getCenterPoint(landmarks, leftBodyPart, rightBodyPart) {
//     let left = tf.gather(landmarks, leftBodyPart, 1);
//     let right = tf.gather(landmarks, rightBodyPart, 1);
//     return tf.add(tf.mul(left, 0.5), tf.mul(right, 0.5));
//   }

//   function getPoseSize(landmarks, torsoSizeMultiplier = 2.5) {
//     let hipsCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
//     let shouldersCenter = getCenterPoint(
//       landmarks,
//       POINTS.LEFT_SHOULDER,
//       POINTS.RIGHT_SHOULDER
//     );
//     let torsoSize = tf.norm(tf.sub(shouldersCenter, hipsCenter));
//     let poseCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
//     poseCenter = tf.expandDims(poseCenter, 1);

//     poseCenter = tf.broadcastTo(poseCenter, [1, 17, 2]);
//     let d = tf.gather(tf.sub(landmarks, poseCenter), 0, 0);
//     let maxDist = tf.max(tf.norm(d, "euclidean", 0));

//     return tf.maximum(tf.mul(torsoSize, torsoSizeMultiplier), maxDist);
//   }

//   function normalizePoseLandmarks(landmarks) {
//     let poseCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
//     poseCenter = tf.expandDims(poseCenter, 1);
//     poseCenter = tf.broadcastTo(poseCenter, [1, 17, 2]);
//     landmarks = tf.sub(landmarks, poseCenter);

//     let poseSize = getPoseSize(landmarks);
//     landmarks = tf.div(landmarks, poseSize);
//     return landmarks;
//   }

//   function landmarksToEmbedding(landmarks) {
//     landmarks = normalizePoseLandmarks(tf.expandDims(landmarks, 0));
//     return tf.reshape(landmarks, [1, 34]);
//   }

//   const runMovenet = async () => {
//     if (!detectorRef.current) {
//       const detectorConfig = {
//         modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
//       };
//       detectorRef.current = await poseDetection.createDetector(
//         poseDetection.SupportedModels.MoveNet,
//         detectorConfig
//       );
//     }

//     if (!poseClassifierRef.current) {
//       poseClassifierRef.current = await tf.loadLayersModel(
//         "https://models.s3.jp-tok.cloud-object-storage.appdomain.cloud/model.json"
//       );
//     }

//     const countAudio = new Audio(count);
//     countAudio.loop = true;

//     interval = setInterval(() => {
//       detectPose(detectorRef.current, poseClassifierRef.current, countAudio);
//     }, 100);
//   };

//   const detectPose = async (detector, poseClassifier, countAudio) => {
//     if (
//       typeof webcamRef.current !== "undefined" &&
//       webcamRef.current !== null &&
//       webcamRef.current.video.readyState === 4
//     ) {
//       let notDetected = 0;
//       const video = webcamRef.current.video;
//       const pose = await detector.estimatePoses(video);
//       const ctx = canvasRef.current.getContext("2d");
//       ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

//       try {
//         const keypoints = pose[0].keypoints;
//         let input = keypoints.map((keypoint) => {
//           if (keypoint.score > 0.4) {
//             if (
//               !(keypoint.name === "left_eye" || keypoint.name === "right_eye")
//             ) {
//               drawPoint(ctx, keypoint.x, keypoint.y, 8, "rgb(255,255,255)");
//               let connections = keypointConnections[keypoint.name];
//               try {
//                 connections.forEach((connection) => {
//                   let conName = connection.toUpperCase();
//                   drawSegment(
//                     ctx,
//                     [keypoint.x, keypoint.y],
//                     [
//                       keypoints[POINTS[conName]].x,
//                       keypoints[POINTS[conName]].y,
//                     ],
//                     skeletonColor
//                   );
//                 });
//               } catch (err) {}
//             }
//           } else {
//             notDetected += 1;
//           }
//           return [keypoint.x, keypoint.y];
//         });

//         if (notDetected > 4) {
//           skeletonColor = "rgb(255,0,0)";
//           setFeedback("Pose not detected clearly. Adjust your position.");
//           return;
//         }

//         const processedInput = landmarksToEmbedding(input);
//         const classification = poseClassifier.predict(processedInput);

//         classification.array().then((data) => {
//           const classNo = CLASS_NO[currentPose];
//           if (data[0][classNo] > 0.97) {
//             if (!flag) {
//               countAudio.play();
//               startingTimefunc(new Date(Date()).getTime());
//               flag = true;
//             }
//             currentTimefunc(new Date(Date()).getTime());
//             skeletonColor = "rgb(0,255,0)";
//             setFeedback("Good job! Maintain your current pose.");
//           } else {
//             flag = false;
//             skeletonColor = "rgb(255,0,0)";
//             countAudio.pause();
//             countAudio.currentTime = 0;
//             setFeedback("Adjust your pose to align better.");
//           }
//         });
//       } catch (err) {
//         console.log(err);
//       }
//     }
//   };

//   useEffect(() => {
//     if (isStartPose) {
//       runMovenet();
//     }
//     return () => {
//       clearInterval(interval); // Clear interval on unmount
//     };
//   }, [isStartPose]);

//   const width = window.screen.width;

//   if (isStartPose) {
//     return (
//       <div className="yoga-pose-container">
//         <div className="performance-container">
//           <div className="pose-performance">
//             <h4>Pose Time: {poseTime} s</h4>
//           </div>
//           <div className="pose-performance">
//             <h4>Best: {bestPerform} s</h4>
//           </div>
//           <button onClick={stopPose} className="secondary-btn">
//             <Link to="/start" >Stop Pose</Link>
//           </button>
//         </div>
//         <div className="pose-detection">
//           <div className="detection-container">
//             <Webcam
//               width={width >= 480 ? "640px" : "360px"}
//               height={width >= 480 ? "480px" : "270px"}
//               id="webcam"
//               className="webcam"
//               ref={webcamRef}
//             />
//             <canvas
//               ref={canvasRef}
//               id="my-canvas"
//               className="my-canvas"
//               width={width >= 480 ? "640px" : "360px"}
//               height={width >= 480 ? "480px" : "270px"}
//             ></canvas>
//           </div>

//           <div className="pose-img">
//             <img src={poseImages[currentPose]} alt="poses" />
//           </div>
//         </div>
//         <div className="feedback-container">
//           <h4>Feedback:</h4>
//           <p>{feedback}</p>
//         </div>
//       </div>
//     );
//   }
//   return null;
// }

// export default YogaCanvas;

// // export default YogaCanvas;
import React, { useRef, useEffect, useContext, useState } from "react";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";
import Webcam from "react-webcam";
import YogaContext from "../../YogaContext";
import { poseImages } from "../../utils/pose_images";
import { poseInstructions } from "../../utils/data"; // Import yoga instructions map
import { POINTS, keypointConnections } from "../../utils/data";
import { drawPoint, drawSegment } from "../../utils/helper";
import { count } from "../../utils/music";
import "./Yoga.css";
import "./YogaCanvas.css";
import { Link } from "react-router-dom";

let flag = false;
let skeletonColor = "rgb(255,0,0)";
let interval;

function YogaCanvas() {
  const {
    stopPose,
    isStartPose,
    startingTimefunc,
    currentTimefunc,
    poseTimefunc,
    bestPerformfunc,
    currentPose,
    startingTime,
    currentTime,
    poseTime,
    bestPerform,
  } = useContext(YogaContext);

  const [feedback, setFeedback] = useState(""); // Feedback state
  const detectorRef = useRef(null); // To store the detector
  const poseClassifierRef = useRef(null); // To store the classifier

  // Function to read instructions using Web Speech API
  const speakInstructions = (instructions) => {
    const synth = window.speechSynthesis;
    instructions.forEach((instruction, index) => {
      const utterance = new SpeechSynthesisUtterance(instruction);
      utterance.rate = 1; // Adjust speech rate if needed
      utterance.pitch = 1; // Adjust pitch if needed
      utterance.volume = 1; // Ensure volume is at max

      // Delay each instruction by its index
      utterance.addEventListener("end", () => {
        if (index === instructions.length - 1) {
          setFeedback("Instructions completed. Start your pose!");
        }
      });
      synth.speak(utterance);
    });
  };

  useEffect(() => {
    // Fetch instructions for the current pose and read them
    if (currentPose && poseInstructions[currentPose]) {
      let instructions = poseInstructions[currentPose];
      instructions=instructions.slice(1,-1);
      setFeedback("Reading instructions...");
      speakInstructions(instructions);
    } else {
      setFeedback("No instructions found for the selected pose.");
    }
  }, [currentPose]);

  useEffect(() => {
    const timeDiff = (currentTime - startingTime) / 1000;
    if (flag) {
      poseTimefunc(timeDiff);
    }
    if (timeDiff > bestPerform) {
      bestPerformfunc(timeDiff);
    }
  }, [currentTime]);

  useEffect(() => {
    currentTimefunc(0);
    poseTimefunc(0);
    bestPerformfunc(0);
  }, [currentPose]);

  const webcamRef = useRef(null);
  const canvasRef = useRef(null);

  const CLASS_NO = {
    Chair: 0,
    Cobra: 1,
    Dog: 2,
    No_Pose: 3,
    Shoulderstand: 4,
    Traingle: 5,
    Tree: 6,
    Warrior: 7,
  };

  function getCenterPoint(landmarks, leftBodyPart, rightBodyPart) {
    let left = tf.gather(landmarks, leftBodyPart, 1);
    let right = tf.gather(landmarks, rightBodyPart, 1);
    return tf.add(tf.mul(left, 0.5), tf.mul(right, 0.5));
  }

  function getPoseSize(landmarks, torsoSizeMultiplier = 2.5) {
    let hipsCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
    let shouldersCenter = getCenterPoint(
      landmarks,
      POINTS.LEFT_SHOULDER,
      POINTS.RIGHT_SHOULDER
    );
    let torsoSize = tf.norm(tf.sub(shouldersCenter, hipsCenter));
    let poseCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
    poseCenter = tf.expandDims(poseCenter, 1);

    poseCenter = tf.broadcastTo(poseCenter, [1, 17, 2]);
    let d = tf.gather(tf.sub(landmarks, poseCenter), 0, 0);
    let maxDist = tf.max(tf.norm(d, "euclidean", 0));

    return tf.maximum(tf.mul(torsoSize, torsoSizeMultiplier), maxDist);
  }

  function normalizePoseLandmarks(landmarks) {
    let poseCenter = getCenterPoint(landmarks, POINTS.LEFT_HIP, POINTS.RIGHT_HIP);
    poseCenter = tf.expandDims(poseCenter, 1);
    poseCenter = tf.broadcastTo(poseCenter, [1, 17, 2]);
    landmarks = tf.sub(landmarks, poseCenter);

    let poseSize = getPoseSize(landmarks);
    landmarks = tf.div(landmarks, poseSize);
    return landmarks;
  }

  function landmarksToEmbedding(landmarks) {
    landmarks = normalizePoseLandmarks(tf.expandDims(landmarks, 0));
    return tf.reshape(landmarks, [1, 34]);
  }

  const runMovenet = async () => {
    if (!detectorRef.current) {
      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };
      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );
    }

    if (!poseClassifierRef.current) {
      poseClassifierRef.current = await tf.loadLayersModel(
        "https://models.s3.jp-tok.cloud-object-storage.appdomain.cloud/model.json"
      );
    }

    const countAudio = new Audio(count);
    countAudio.loop = true;

    interval = setInterval(() => {
      detectPose(detectorRef.current, poseClassifierRef.current, countAudio);
    }, 100);
  };

  const detectPose = async (detector, poseClassifier, countAudio) => {
    if (
      typeof webcamRef.current !== "undefined" &&
      webcamRef.current !== null &&
      webcamRef.current.video.readyState === 4
    ) {
      let notDetected = 0;
      const video = webcamRef.current.video;
      const pose = await detector.estimatePoses(video);
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      try {
        const keypoints = pose[0].keypoints;
        let input = keypoints.map((keypoint) => {
          if (keypoint.score > 0.4) {
            if (
              !(keypoint.name === "left_eye" || keypoint.name === "right_eye")
            ) {
              drawPoint(ctx, keypoint.x, keypoint.y, 8, "rgb(255,255,255)");
              let connections = keypointConnections[keypoint.name];
              try {
                connections.forEach((connection) => {
                  let conName = connection.toUpperCase();
                  drawSegment(
                    ctx,
                    [keypoint.x, keypoint.y],
                    [
                      keypoints[POINTS[conName]].x,
                      keypoints[POINTS[conName]].y,
                    ],
                    skeletonColor
                  );
                });
              } catch (err) {}
            }
          } else {
            notDetected += 1;
          }
          return [keypoint.x, keypoint.y];
        });

        if (notDetected > 4) {
          skeletonColor = "rgb(255,0,0)";
          setFeedback("Pose not detected clearly. Adjust your position.");
          return;
        }

        const processedInput = landmarksToEmbedding(input);
        const classification = poseClassifier.predict(processedInput);

        classification.array().then((data) => {
          const classNo = CLASS_NO[currentPose];
          if (data[0][classNo] > 0.97) {
            if (!flag) {
              countAudio.play();
              startingTimefunc(new Date(Date()).getTime());
              flag = true;
            }
            currentTimefunc(new Date(Date()).getTime());
            skeletonColor = "rgb(0,255,0)";
            setFeedback("Good job! Maintain your current pose.");
          } else {
            flag = false;
            skeletonColor = "rgb(255,0,0)";
            countAudio.pause();
            countAudio.currentTime = 0;
            setFeedback("Adjust your pose to align better.");
          }
        });
      } catch (err) {
        console.log(err);
      }
    }
  };

  useEffect(() => {
    if (isStartPose) {
      runMovenet();
    }
    return () => {
      clearInterval(interval); // Clear interval on unmount
    };
  }, [isStartPose]);

  const width = window.screen.width;

  if (isStartPose) {
    return (
      <div className="yoga-pose-container">
        <div className="performance-container">
          <div className="pose-performance">
            <h4>Pose Time: {poseTime} s</h4>
          </div>
          <div className="pose-performance">
            <h4>Best: {bestPerform} s</h4>
          </div>
          <button onClick={stopPose} className="secondary-btn">
            <Link to="/start" >Stop Pose</Link>
          </button>
        </div>
        <div className="pose-detection">
          <div className="detection-container">
            <Webcam
              width={width >= 480 ? "640px" : "360px"}
              height={width >= 480 ? "480px" : "270px"}
              id="webcam"
              className="webcam"
              ref={webcamRef}
            />
            <canvas
              ref={canvasRef}
              id="my-canvas"
              className="my-canvas"
              width={width >= 480 ? "640px" : "360px"}
              height={width >= 480 ? "480px" : "270px"}
            ></canvas>
          </div>

          <div className="pose-img">
            <img src={poseImages[currentPose]} alt="poses" />
          </div>
        </div>
        <div className="feedback-container">
          <h4>Feedback:</h4>
          <p>{feedback}</p>
        </div>
      </div>
    );
  }
  return null;
}

export default YogaCanvas;

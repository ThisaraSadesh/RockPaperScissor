import React, { useRef, useEffect, useState } from "react";
import { Hands } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import {
  initializeSocket,
  onMessage,
  SocketSend,
  closeSocket,
} from "../ClientSocket.js";

const HandGestureDetector = ({
  playerNumber = null,
  isCurrentPlayer = true,
}) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [finalGesture, setFinalGesture] = useState("");
  const lastGestureRef = useRef("None");
  const [gesture, setGesture] = useState("None");
  const [isLoading, setIsLoading] = useState(true);
  const [isTimedOut, setTimedout] = useState(false);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    // Listen for game results from server
    const unsubscribe = onMessage((data) => {
      if (data.result) {
        setGameResult({
          yourMove: data.yourMove,
          opponentMove: data.opponentMove,
          result: data.result,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Only initialize camera for current player
    if (!isCurrentPlayer) {
      setIsLoading(false);
      return;
    }

    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current });
        },
        width: 640,
        height: 480,
      });
      camera.start();
      setIsLoading(false);

      setTimeout(() => {
        camera.stop();
        const finalMove = lastGestureRef.current;

        console.log("Final Gesture:", lastGestureRef.current);
        setTimedout(true);
        if (finalMove !== "None" && finalMove !== "Unknown") {
          SocketSend({
            type: "move",
            choice: finalMove.toLowerCase(),
          });
        }
      }, 10000);
    }

    return () => {
      hands.close();
    };
  }, [isCurrentPlayer]);

  const detectGesture = (landmarks) => {
    if (!landmarks || landmarks.length === 0) {
      return "None";
    }

    const hand = landmarks[0];

    // Get finger tip and base positions
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const indexBase = hand[5];
    const middleTip = hand[12];
    const middleBase = hand[9];
    const ringTip = hand[16];
    const ringBase = hand[13];
    const pinkyTip = hand[20];
    const pinkyBase = hand[17];

    // Check if finger is extended (tip is above base in y-coordinate)
    const isIndexExtended = indexTip.y < indexBase.y;
    const isMiddleExtended = middleTip.y < middleBase.y;
    const isRingExtended = ringTip.y < ringBase.y;
    const isPinkyExtended = pinkyTip.y < pinkyBase.y;

    const extendedCount = [
      isIndexExtended,
      isMiddleExtended,
      isRingExtended,
      isPinkyExtended,
    ].filter(Boolean).length;

    // Rock: All fingers closed (fist)
    if (extendedCount === 0) {
      return "Rock";
    }

    // Paper: All fingers extended
    if (extendedCount === 4) {
      return "Paper";
    }

    // Scissors: Index and middle extended, ring and pinky closed
    if (
      isIndexExtended &&
      isMiddleExtended &&
      !isRingExtended &&
      !isPinkyExtended
    ) {
      return "Scissors";
    }

    return "Unknown";
  };

  const onResults = (results) => {
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext("2d");

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    canvasCtx.drawImage(
      results.image,
      0,
      0,
      canvasElement.width,
      canvasElement.height,
    );

    if (results.multiHandLandmarks) {
      const detectedGesture = detectGesture(results.multiHandLandmarks);
      if (detectedGesture !== "None" && detectedGesture !== "Unknown") {
        lastGestureRef.current = detectedGesture;
      }
      setGesture(detectedGesture);
      setFinalGesture(lastGestureRef.current);

      // Draw hand landmarks
      for (const landmarks of results.multiHandLandmarks) {
        drawConnectors(canvasCtx, landmarks);
        drawLandmarks(canvasCtx, landmarks);
      }
    } else {
      setGesture("None");
      // setFinalGesture("None");
    }

    canvasCtx.restore();
  };

  const drawConnectors = (ctx, landmarks) => {
    const connections = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // Thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // Index
      [0, 9],
      [9, 10],
      [10, 11],
      [11, 12], // Middle
      [0, 13],
      [13, 14],
      [14, 15],
      [15, 16], // Ring
      [0, 17],
      [17, 18],
      [18, 19],
      [19, 20], // Pinky
      [5, 9],
      [9, 13],
      [13, 17], // Palm
    ];

    ctx.strokeStyle = "#00FF00";
    ctx.lineWidth = 2;

    connections.forEach(([start, end]) => {
      const startPoint = landmarks[start];
      const endPoint = landmarks[end];
      ctx.beginPath();
      ctx.moveTo(
        startPoint.x * ctx.canvas.width,
        startPoint.y * ctx.canvas.height,
      );
      ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height);
      ctx.stroke();
    });
  };

  const drawLandmarks = (ctx, landmarks) => {
    ctx.fillStyle = "#FF0000";
    landmarks.forEach((landmark) => {
      ctx.beginPath();
      ctx.arc(
        landmark.x * ctx.canvas.width,
        landmark.y * ctx.canvas.height,
        5,
        0,
        2 * Math.PI,
      );
      ctx.fill();
    });
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      {playerNumber && (
        <h2 className="text-2xl font-bold">
          Player {playerNumber} {isCurrentPlayer && "(You)"}
        </h2>
      )}
      {!playerNumber && (
        <h2 className="text-2xl font-bold">Hand Gesture Detection</h2>
      )}

      {isLoading && isCurrentPlayer && <p>Loading camera...</p>}

      {!isCurrentPlayer && (
        <div
          className="flex items-center justify-center"
          style={{ width: "640px", height: "480px" }}
        >
          <p className="text-gray-500">Waiting for Player {playerNumber}...</p>
        </div>
      )}

      {isCurrentPlayer && (
        <>
          <div className="relative">
            <video
              ref={videoRef}
              className="hidden"
              width="640"
              height="480"
              autoPlay
            />
            <canvas
              ref={canvasRef}
              className="border-4 border-gray-300 rounded-lg"
              width="640"
              height="480"
            />
          </div>
          <div className="text-center">
            <p className="text-xl font-semibold">
              {isTimedOut ? "Final Gesture:" : "Detected Gesture:"}
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {isTimedOut ? finalGesture : gesture}
            </p>
          </div>
        </>
      )}

      {gameResult && isCurrentPlayer && (
        <div className="mt-4 p-4 border-2 rounded-lg bg-gray-100">
          <h3 className="text-2xl font-bold mb-2">Game Result</h3>
          <p className="text-lg">Your Move: {gameResult.yourMove}</p>
          <p className="text-lg">Opponent Move: {gameResult.opponentMove}</p>
          <p
            className={`text-2xl font-bold mt-2 ${
              gameResult.result === "win"
                ? "text-green-600"
                : gameResult.result === "lose"
                  ? "text-red-600"
                  : "text-yellow-600"
            }`}
          >
            {gameResult.result === "win"
              ? "🎉 You Win!"
              : gameResult.result === "lose"
                ? "😢 You Lose!"
                : "🤝 Draw!"}
          </p>
        </div>
      )}

      {!playerNumber && (
        <div className="text-sm text-gray-600 text-center">
          <p>👊 Rock: Make a fist</p>
          <p>✋ Paper: Open all fingers</p>
          <p>✌️ Scissors: Extend index and middle fingers</p>
        </div>
      )}
    </div>
  );
};

export default HandGestureDetector;

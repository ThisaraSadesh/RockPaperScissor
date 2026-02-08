import React, { useEffect, useState } from 'react'
import HandGestureDetector from '../components/HandGestureDetector.js';
import StatusBar from '../components/StatusBar.js';
import { SocketSend, onMessage } from "../ClientSocket";

const Game = () => {
  const [playerNumber, setPlayerNumber] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(1);
  const [gameResult, setGameResult] = useState(null);

  useEffect(() => {
    SocketSend({ type: "start_game" });

    // Listen for player number assignment and game updates
    const unsubscribe = onMessage((data) => {
      console.log("Game received message:", data);
      
      if (data.playerNumber) {
        setPlayerNumber(data.playerNumber);
      }
      
      if (data.totalPlayers) {
        setTotalPlayers(data.totalPlayers);
      }

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

  return (
    <div className='w-screen h-screen flex flex-col p-5'>
      <div className='mb-4'>
        <h1 className='text-3xl font-bold text-center'>Rock Paper Scissors</h1>
        <p className='text-center text-gray-600'>
          {totalPlayers === 1 ? 'Waiting for Player 2 to join...' : 'Game in Progress'}
        </p>
      </div>

      <div className='flex-1 flex gap-4'>
        {/* Split screen view */}
        <div className='flex-1 flex flex-col border-2 border-gray-300 rounded-lg'>
          <HandGestureDetector 
            playerNumber={1} 
            isCurrentPlayer={playerNumber === 1}
          />
        </div>
        
        <div className='flex-1 flex flex-col border-2 border-gray-300 rounded-lg'>
          <HandGestureDetector 
            playerNumber={2} 
            isCurrentPlayer={playerNumber === 2}
          />
        </div>
      </div>

      {gameResult && (
        <div className="mt-4 p-4 border-2 rounded-lg bg-gray-100 text-center">
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

      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>👊 Rock: Make a fist | ✋ Paper: Open all fingers | ✌️ Scissors: Extend index and middle fingers</p>
      </div>
    </div>
  )
}

export default Game
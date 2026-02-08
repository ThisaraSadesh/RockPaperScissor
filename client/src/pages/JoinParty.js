import React from "react";
import {
  initializeSocket,
  onMessage,
  SocketSend,
  closeSocket,
} from "../ClientSocket.js";
import { useNavigate } from "react-router-dom";
const JoinParty = () => {
  const [clients, setClients] = React.useState([]);
  const [message, setMessage] = React.useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    initializeSocket();

    const unsubscribe = onMessage((data) => {
      console.log("Message from server:", data);
      if (data.players) {
        setClients(data.players);
      }
      if (data.message) {
        setMessage(data.message);
      }
    });
    const handleBeforeUnload = () => {
      closeSocket();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      unsubscribe();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinParty = () => {
    SocketSend({ type: "join_game" });
  };

  const handleButtonClick = () => {
    if (clients.length === 2) {
      navigate("/game");
    } else {
      joinParty();
    }
  };

  return (
    <div className="w-screen h-screen flex  items-center justify-between gap-4 ">
      <div className="w-3/4 flex flex-col items-center justify-center gap-4">
        <h1 className="text-5xl font-bold text-black">Join Party</h1>
        <p className="text-xl text-black">{message}</p>
        <button
          onClick={handleButtonClick}
          className="px-4 py-2 bg-blue-500 text-white rounded mt-4"
        >
          {clients.length === 2 ? "Join Game" : "Start Party"}
        </button>
      </div>

      <div className=" flex flex-col items-center justify-start gap-4 border-l-2 border-l-black h-full">
        <h1 className="text-center font-semibold text-2xl">Party Members</h1>
        {clients?.map((client, index) => (
          <div key={index} className="text-black flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>
            {client}
          </div>
        ))}
      </div>
    </div>
  );
};

export default JoinParty;

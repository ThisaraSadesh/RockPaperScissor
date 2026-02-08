import React from "react";

const StatusBar = ({ clients=[] }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      {/* {clients.map((client) => (
        <div key={client.id} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>{client.ip}</span>
        </div>
      ))} */}
    </div>
  );
};

export default StatusBar;

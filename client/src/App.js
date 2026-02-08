import './App.css';
import { Routes, Route, BrowserRouter } from "react-router-dom";
import JoinParty from './pages/JoinParty.js';
import Game from './pages/Game.js';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<JoinParty />} />
        <Route path="/game" element={<Game />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
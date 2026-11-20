import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import TVHostScreen from './screens/TVHostScreen';
import LobbyScreen from './screens/LobbyScreen';
import DrawingScreen from './screens/DrawingScreen';
import GuessingScreen from './screens/GuessingScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Entry point — choose TV or mobile */}
        <Route path="/" element={<HomeScreen />} />

        {/* TV / Host screens */}
        <Route path="/tv" element={<TVHostScreen />} />

        {/* Shared mobile lobby while waiting */}
        <Route path="/lobby" element={<LobbyScreen />} />

        {/* In-game mobile screens */}
        <Route path="/draw" element={<DrawingScreen />} />
        <Route path="/guess" element={<GuessingScreen />} />

        {/* Final screen */}
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
      </Routes>
    </BrowserRouter>
  );
}

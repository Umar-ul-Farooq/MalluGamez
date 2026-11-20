import { useGameEvents } from './hooks/useGameEvents';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import HomeScreen from './screens/HomeScreen';
import TVHostScreen from './screens/TVHostScreen';
import LobbyScreen from './screens/LobbyScreen';
import DrawingScreen from './screens/DrawingScreen';
import GuessingScreen from './screens/GuessingScreen';
import LeaderboardScreen from './screens/LeaderboardScreen';
import EmojiSinglePlayerScreen from './screens/EmojiSinglePlayerScreen';
import ToastContainer from './components/ToastContainer';

function AppInner() {
  // Wire all socket events to the global store — runs once for the whole app
  useGameEvents();

  return (
    <>
      <Routes>
        <Route path="/"            element={<HomeScreen />} />
        <Route path="/tv"          element={<TVHostScreen />} />
        <Route path="/lobby"       element={<LobbyScreen />} />
        <Route path="/draw"        element={<DrawingScreen />} />
        <Route path="/guess"       element={<GuessingScreen />} />
        <Route path="/leaderboard" element={<LeaderboardScreen />} />
        <Route path="/single-player/emoji" element={<EmojiSinglePlayerScreen />} />
      </Routes>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}

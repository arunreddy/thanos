import { Routes, Route, Navigate } from 'react-router';
import Chat from "@/components/Chat"
import Help from "@/components/help/Help"
import HelpDetailed from "@/components/help/HelpDetailed"
import ChatNew from "@/components/ChatNew"
import Login from "@/components/auth/login"
function App() {

  return (
      <Routes>
        <Route path="/new" element={<ChatNew />} />
        <Route path="/chat/:chatId" element={<Chat />} />
        <Route path="/help" element={<Help />} />
        <Route path="/help/:command" element={<HelpDetailed />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/new" replace />} />
      </Routes>
  );
}

export default App;

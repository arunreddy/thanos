import { Routes, Route } from 'react-router';
import Chat from "@/components/Chat"
import Help from "@/components/help/Help"
import HelpDetailed from "@/components/help/HelpDetailed"
import ChatNew from "@/components/ChatNew"
import Login from "@/components/auth/login"
import Changelog from '@/components/Changelog';
import { RequiredAuth } from '@/components/SecureRoute';

function App() {

  return (
        <Routes>
          <Route path="/" element={<RequiredAuth />}>
            <Route path="/" element={<ChatNew/>} />
            <Route path="/new" element={<ChatNew />} />
            <Route path="/chat/:chatId" element={<Chat />} />
            <Route path="/help" element={<Help />} />
            <Route path="/help/:command" element={<HelpDetailed />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/changelog" element={<Changelog />} />
      </Routes>
  );
}

export default App;

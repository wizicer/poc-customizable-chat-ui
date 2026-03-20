import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ResponsiveLayout } from "@/components/layout/ResponsiveLayout";
import { ChatsPage } from "@/pages/ChatsPage";
import { AgentsPage } from "@/pages/AgentsPage";
import { AgentEditPage } from "@/pages/AgentEditPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { ChatDetailPage } from "@/pages/ChatDetailPage";
import { ChatCreatePage } from "@/pages/ChatCreatePage";
import { useConfigStore } from "@/stores/config-store";
import { applyTheme } from "@/lib/theme";
import { useEffect } from "react";

export default function App() {
  const theme = useConfigStore((s) => s.theme);

  useEffect(() => {
    applyTheme(theme);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (theme === "system") applyTheme("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  return (
    <BrowserRouter basename="/poc-customizable-chat-ui">
      <Routes>
        <Route element={<ResponsiveLayout />}>
          <Route path="/chats" element={<ChatsPage />} />
          <Route path="/agents" element={<AgentsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/agent/:id" element={<AgentEditPage />} />
          <Route path="/chat/new" element={<ChatCreatePage />} />
          <Route path="/chat/:id" element={<ChatDetailPage />} />
          <Route path="*" element={<Navigate to="/chats" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

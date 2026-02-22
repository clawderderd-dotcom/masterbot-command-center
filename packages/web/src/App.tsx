import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { OverviewPage } from "./pages/Overview";
import { TasksPage } from "./pages/Tasks";
import { TaskDetailPage } from "./pages/TaskDetail";
import { PlaceholderPage } from "./pages/Placeholder";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/tasks/:taskId" element={<TaskDetailPage />} />
        <Route path="/sessions" element={<PlaceholderPage title="Sessions" />} />
        <Route path="/agents" element={<PlaceholderPage title="Agents" />} />
        <Route path="/channels" element={<PlaceholderPage title="Channels" />} />
        <Route path="/skills" element={<PlaceholderPage title="Skills" />} />
        <Route path="/cron" element={<PlaceholderPage title="Automations" />} />
        <Route path="/logs" element={<PlaceholderPage title="Logs" />} />
        <Route path="/diagnostics" element={<PlaceholderPage title="Diagnostics" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import { Route, Routes } from "react-router-dom";

import { Layout } from "@/components/Layout";

import { HomePage } from "@/pages/HomePage";

import { NotFoundPage } from "@/pages/NotFoundPage";

import { ToolPage } from "@/pages/ToolPage";

import { ToolsPage } from "@/pages/ToolsPage";

import LoginPage from "@/pages/LoginPage";

import DashboardPage from "@/pages/DashboardPage";

import AdminPage from "@/pages/AdminPage";

import { ProtectedRoute } from "@/components/ProtectedRoute";

import { useFlags } from "@/lib/ConfigContext";



function FlaggedDashboard() {

  const flags = useFlags();

  if (!flags.publicDashboard) {

    return <NotFoundPage />;

  }

  return (

    <ProtectedRoute>

      <DashboardPage />

    </ProtectedRoute>

  );

}



export default function App() {

  return (

    <Routes>

      <Route path="/login" element={<LoginPage />} />

      <Route

        path="/admin"

        element={

          <ProtectedRoute adminOnly>

            <AdminPage />

          </ProtectedRoute>

        }

      />



      <Route element={<Layout />}>

        <Route index element={<HomePage />} />

        <Route path="/tools" element={<ToolsPage />} />

        <Route path="/dashboard" element={<FlaggedDashboard />} />

        <Route path="/:slug" element={<ToolPage />} />

        <Route path="*" element={<NotFoundPage />} />

      </Route>

    </Routes>

  );

}


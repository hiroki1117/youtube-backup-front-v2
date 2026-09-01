import { useState } from "react";
import { LogOut, Plus, Search } from "lucide-react";
import { Outlet, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { RegisterDialog } from "@/components/RegisterDialog";
import { SearchDialog } from "@/components/SearchDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

/**
 * 共通レイアウト（contract C5 AppShell）。ヘッダ（検索/登録/テーマ/ログアウトのアクション起点）+ Outlet。
 * 検索アクション（C5 openSearch / U3）・登録アクション（C5 openRegister / U4）は、それぞれ
 * ヘッダのボタンで対応するダイアログを開閉する。開閉状態は AppShell が独立に保持する
 * （U4 のダイアログ開閉パターンを踏襲）。
 * ログアウトは signOut → TanStack Query キャッシュクリア → /login（WF2 / NFR4.6）。
 */
export function AppShell() {
  const { signOut } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    queryClient.clear();
    navigate(ROUTES.login, { replace: true });
  };

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-lg font-semibold">youtube-backup</h1>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchOpen(true)}
            aria-label="動画を検索"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            検索
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => setRegisterOpen(true)}
            aria-label="動画を登録"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            登録
          </Button>
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="ログアウト">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4">
        <Outlet />
      </main>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <RegisterDialog open={registerOpen} onClose={() => setRegisterOpen(false)} />
    </div>
  );
}

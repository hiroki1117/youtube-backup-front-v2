import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { StatusView } from "@/components/StatusView";
import { useAuth } from "@/hooks/useAuth";
import { ROUTES } from "@/lib/routes";

/**
 * 保護ルートガード（functional-spec WF3 / SM1）。
 * status=unknown（復元中）は loading 表示、unauthenticated は /login へリダイレクト
 * （元 URL を state.from に保持）、authenticated は子を描画。
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "unknown") {
    return (
      <StatusView state={{ status: "loading" }} loadingLabel="認証状態を確認しています...">
        {() => null}
      </StatusView>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to={ROUTES.login} replace state={{ from: location }} />;
  }

  return <>{children}</>;
}

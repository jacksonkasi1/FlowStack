import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useGuard, GuardStatus } from "../use-guard";
import type { GuardProps } from "../use-guard";
export type { EmailVerificationMode } from "../use-guard";
export function RequireOnboarding(props: GuardProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const redirect = useCallback(
    (path: string) => {
      navigate(path, { replace: true });
    },
    [navigate],
  );
  const { pending, failed, retry } = useGuard(pathname, redirect, props);
  if (failed) return <GuardStatus failed retry={retry} />;
  if (pending)
    return (
      <>
        {props.loadingComponent ?? <GuardStatus failed={false} retry={retry} />}
      </>
    );
  return <>{props.children}</>;
}

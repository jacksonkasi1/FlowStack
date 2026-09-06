import { useCallback } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useGuard, GuardStatus } from "../use-guard";
import type { GuardProps } from "../use-guard";
export type { EmailVerificationMode } from "../use-guard";
export function RequireOnboarding(props: GuardProps) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const redirect = useCallback(
    (path: string) => {
      navigate({ to: path, replace: true });
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

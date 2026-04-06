"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  title?: string;
};

type State = { error: Error | null };

/** 이 구역 렌더/자식 동기 오류만 포착 — 서버 액션이 반환한 error 객체는 여기 오지 않습니다. */
export class ProfileSectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ProfileSectionErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>{this.props.title ?? "오류"}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{this.state.error.message}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => this.setState({ error: null })}
            >
              다시 시도
            </Button>
          </AlertDescription>
        </Alert>
      );
    }
    return this.props.children;
  }
}

import Link from "next/link";
import { Suspense } from "react";
import { AuthSessionGate } from "@/components/auth-session-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "로그인" };

export default function LoginPage() {
  return (
    <AuthSessionGate>
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardDescription>
              계정이 없으면{" "}
              <Link
                href="/register"
                className="text-primary underline-offset-4 hover:underline"
              >
                회원가입
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense
              fallback={
                <p className="text-muted-foreground text-sm">불러오는 중…</p>
              }
            >
              <LoginForm />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </AuthSessionGate>
  );
}

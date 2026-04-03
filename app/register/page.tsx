import Link from "next/link";
import { AuthSessionGate } from "@/components/auth-session-gate";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { RegisterForm } from "./register-form";

export const metadata = { title: "회원가입" };

export default function RegisterPage() {
  return (
    <AuthSessionGate>
      <div className="mx-auto w-full max-w-md">
        <Card>
          <CardHeader>
            <CardDescription>
              이미 계정이 있으면{" "}
              <Link
                href="/login"
                className="text-primary underline-offset-4 hover:underline"
              >
                로그인
              </Link>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterForm />
          </CardContent>
        </Card>
      </div>
    </AuthSessionGate>
  );
}

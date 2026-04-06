"use client";

import { useActionState, useEffect, useRef, useState, memo } from "react";
import { Loader2 } from "lucide-react";
import { updateProfileName } from "@/actions/profile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Props = {
  email: string;
  sessionName: string;
  onNameSaved: (name: string) => void;
};

function ProfileNameSectionInner({
  email,
  sessionName,
  onNameSaved,
}: Props) {
  const [name, setName] = useState(sessionName);
  const [nameState, nameAction, namePending] = useActionState(
    updateProfileName,
    {},
  );

  useEffect(() => {
    setName(sessionName);
  }, [sessionName]);

  const lastPushedName = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!nameState?.success || !nameState.name) return;
    if (lastPushedName.current === nameState.name) return;
    lastPushedName.current = nameState.name;
    onNameSaved(nameState.name);
  }, [nameState, onNameSaved]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>이메일</Label>
        <Input
          value={email}
          disabled
          readOnly
          className="bg-muted/50"
        />
      </div>

      <form action={nameAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="profile-name">이름</Label>
          <Input
            id="profile-name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            autoComplete="name"
          />
        </div>
        {nameState?.error ? (
          <p className="text-destructive text-sm">{nameState.error}</p>
        ) : null}
        {nameState?.success ? (
          <p className="text-muted-foreground text-sm">저장되었습니다.</p>
        ) : null}
        <Button
          type="submit"
          className="gap-2"
          disabled={namePending || name.trim() === sessionName}
        >
          {namePending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              저장 중…
            </>
          ) : (
            "이름 저장"
          )}
        </Button>
      </form>
    </div>
  );
}

/** 프로필 이미지 URL만 바뀔 때(세션 갱신) 이 블록은 다시 그리지 않습니다. */
export const ProfileNameSection = memo(ProfileNameSectionInner);

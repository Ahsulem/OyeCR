import { useParams } from "react-router-dom";

export default function JoinPage() {
  const { inviteCode } = useParams<{ inviteCode: string }>();

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-lg font-medium">
        Join via invite code: <code>{inviteCode}</code> — coming soon
      </p>
    </div>
  );
}

import CalloutMessage from "../../feedback/CalloutMessage";

export function RowError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="mt-2">
      <CalloutMessage message={message} color="red" />
    </div>
  );
}

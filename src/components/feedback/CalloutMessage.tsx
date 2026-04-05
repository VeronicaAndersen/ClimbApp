import { MessageProps } from "@/types";
import { Callout } from "@radix-ui/themes";

export default function CalloutMessage({ message: message, color }: MessageProps) {
  return (
    <div className="absolute top-0 left-0 right-0 flex justify-center z-50 pointer-events-none">
      <div className="mt-2 pointer-events-auto bg-white/90 backdrop-blur">
        <Callout.Root color={color} variant="surface" className="!bg-opacity-100 !opacity-100">
          <Callout.Text>{message}</Callout.Text>
        </Callout.Root>
      </div>
    </div>
  );
}

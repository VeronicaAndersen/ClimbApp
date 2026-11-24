import { MessageProps } from "@/types";
import { Callout } from "@radix-ui/themes";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const ERROR_COLORS: MessageProps["color"][] = ["red", "ruby", "crimson", "tomato"];
function iconFor(color: MessageProps["color"]) {
  if (ERROR_COLORS.includes(color)) return CircleAlert;
  if (color === "green") return CircleCheck;
  return Info;
}

/**
 * Floating banner at the top of the nearest positioned parent. It drops in
 * from the top edge (where it rests) when a message appears. The live region
 * stays the same node while empty, so screen readers announce updates.
 */
export default function CalloutMessage({ message, color }: MessageProps) {
  const isError = ERROR_COLORS.includes(color);
  const Icon = iconFor(color);
  return (
    <div
      className={`absolute top-0 left-0 right-0 flex justify-center px-3 z-50 pointer-events-none ${message ? "" : "sr-only"}`}
    >
      <div
        className={`${message ? "callout-in" : ""} mt-2 max-w-md pointer-events-auto rounded-xl bg-card/80 backdrop-blur-md shadow-lg`}
      >
        <Callout.Root
          color={color}
          role={isError ? "alert" : "status"}
          aria-live={isError ? "assertive" : "polite"}
          aria-atomic="true"
          variant="surface"
          size="1"
          className="!bg-opacity-100 !opacity-100 !rounded-xl"
        >
          {message && (
            <>
              <Callout.Icon>
                <Icon className="h-4 w-4" aria-hidden="true" />
              </Callout.Icon>
              <Callout.Text className="font-medium leading-snug">{message}</Callout.Text>
            </>
          )}
        </Callout.Root>
      </div>
    </div>
  );
}

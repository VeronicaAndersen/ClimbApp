import { Button, Spinner } from "@radix-ui/themes";
import { Sparkles } from "lucide-react";

interface SpinButtonProps {
  onSpin: () => void;
  isSpinning: boolean;
  disabled: boolean;
}

export function SpinButton({ onSpin, isSpinning, disabled }: SpinButtonProps) {
  return (
    <div className="flex justify-center mb-6">
      <Button
        id="btnWinner"
        onClick={onSpin}
        disabled={disabled}
        className="bg-primary hover:bg-primary-hover text-primary-foreground px-14 py-6 rounded-full text-2xl font-bold shadow-soft hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 cursor-pointer flex items-center gap-3"
      >
        {isSpinning ? (
          <>
            <Spinner size="2" />
            Snurrar...
          </>
        ) : (
          <>
            <Sparkles className="w-6 h-6" />
            Dra vinnare
          </>
        )}
      </Button>
    </div>
  );
}

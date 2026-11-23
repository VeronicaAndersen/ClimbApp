import { Button } from "@radix-ui/themes";
import { ArrowLeft, RotateCcw, Sparkles, Trophy } from "lucide-react";

interface TombolaHeaderProps {
  onBack: () => void;
  onReset: () => void;
  canReset: boolean;
}

export function TombolaHeader({ onBack, onReset, canReset }: TombolaHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
      <Button
        onClick={onBack}
        className="flex items-center gap-2 bg-card/90 backdrop-blur hover:bg-card text-muted-foreground px-4 py-2 rounded-xl shadow-sm hover:shadow-soft transition-all duration-200 cursor-pointer border border-border text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Tillbaka
      </Button>

      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-yellow-500 animate-pulse" />
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Utlottning</h1>
        <Trophy className="w-8 h-8 text-yellow-500" />
      </div>

      <Button
        onClick={onReset}
        disabled={!canReset}
        className="flex items-center gap-2 bg-sage text-charcoal hover:bg-sage/80 px-4 py-2 rounded-xl shadow-sm hover:shadow-soft transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-sm font-medium"
      >
        <RotateCcw className="w-4 h-4" />
        Återställ
      </Button>
    </div>
  );
}

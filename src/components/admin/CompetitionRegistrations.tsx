import { useState } from "react";
import { CompetitionResponse } from "@/types";
import { Button } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RegistrationApprovalList } from "./RegistrationApprovalList";

interface CompetitionRegistrationsProps {
  competition: CompetitionResponse;
  refreshKey?: number;
}

export function CompetitionRegistrations({
  competition,
  refreshKey,
}: CompetitionRegistrationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 bg-card/90 backdrop-blur p-4 rounded-lg shadow-soft">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{competition.name}</h3>
          <p className="text-sm text-muted-foreground">
            {competition.comp_date} • {competition.comp_type}
          </p>
        </div>
        <Button
          onClick={() => setIsOpen((prev) => !prev)}
          className="bg-primary hover:bg-primary-hover text-primary-foreground px-3 py-2 rounded cursor-pointer"
          size="2"
        >
          {isOpen ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Dölj anmälda
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Visa anmälda
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="mt-4">
          <RegistrationApprovalList competitionId={competition.id} refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}

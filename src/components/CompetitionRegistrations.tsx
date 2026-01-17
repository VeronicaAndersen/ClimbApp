import { useState } from "react";
import { CompetitionResponse } from "@/types";
import { Button } from "@radix-ui/themes";
import { ChevronDown, ChevronUp } from "lucide-react";
import { RegistrationApprovalList } from "./RegistrationApprovalList";

interface CompetitionRegistrationsProps {
  competition: CompetitionResponse;
}

export function CompetitionRegistrations({ competition }: CompetitionRegistrationsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-4 bg-white/90 backdrop-blur p-4 rounded-lg shadow-md">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-800">{competition.name}</h3>
          <p className="text-sm text-gray-600">
            {competition.comp_date} • {competition.comp_type}
          </p>
        </div>
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white px-3 py-2 rounded cursor-pointer"
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
          <RegistrationApprovalList competitionId={competition.id} />
        </div>
      )}
    </div>
  );
}

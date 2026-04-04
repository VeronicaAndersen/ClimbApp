import { registerClimberToCompetition } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { Button, Dialog, Flex, Select, Spinner } from "@radix-ui/themes";
import { useState } from "react";
import { getGradeColor, LEVEL_NAMES } from "@/constants/gradeColors";
import { getUserFriendlyError } from "@/utils/errorMessages";

const GRADE_OPTIONS = Object.entries(LEVEL_NAMES).map(([value, label]) => ({
  value,
  label,
}));

interface RegisterToCompFormProps extends CompetitionResponse {
  onRegistrationSuccess?: () => void;
}

export default function RegisterToCompForm({
  id,
  name,
  comp_date,
  onRegistrationSuccess,
}: RegisterToCompFormProps) {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (loading) return; // block closing while request is in flight
    setOpen(isOpen);
    if (!isOpen) {
      setErrorMessage(null);
      setSuccess(false);
      setLevel(1);
    }
  };

  const handleRegistration = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await registerClimberToCompetition(id, level);
      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        setSuccess(false);
        onRegistrationSuccess?.();
      }, 1500);
    } catch (err) {
      setErrorMessage(getUserFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedColor = getGradeColor(level);
  const selectedName = LEVEL_NAMES[level];

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger>
        <Button className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] cursor-pointer rounded-full my-2">
          Anmäl dig
        </Button>
      </Dialog.Trigger>

      <Dialog.Content maxWidth="450px">
        <Dialog.Title>
          Anmälan till {name} — {comp_date}
        </Dialog.Title>

        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <span className="text-5xl">✓</span>
            <p className="text-green-700 font-semibold text-lg text-center">Du är nu anmäld!</p>
            <p className="text-sm text-gray-500 text-center">
              Väntar på godkännande av receptionen.
            </p>
          </div>
        ) : (
          <>
            <Dialog.Description size="2" mb="4">
              Välj din tävlingsfärg
            </Dialog.Description>

            {errorMessage && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
                {errorMessage}
              </p>
            )}

            <Flex direction="column" gap="3">
              <div className="flex items-center gap-3">
                <Select.Root
                  size="2"
                  value={String(level)}
                  onValueChange={(value) => setLevel(Number(value))}
                  disabled={loading}
                >
                  <Select.Trigger aria-label="Välj svårighetsgrad" className="flex-1" />
                  <Select.Content>
                    {GRADE_OPTIONS.map(({ value, label }) => (
                      <Select.Item key={value} value={value}>
                        <span className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shrink-0 border border-gray-300"
                            style={{ backgroundColor: getGradeColor(Number(value)) }}
                          />
                          {label}
                        </span>
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>

                <span
                  className="w-9 h-9 rounded-full border-2 border-gray-300 shrink-0"
                  style={{ backgroundColor: selectedColor }}
                  title={selectedName}
                />
              </div>
            </Flex>

            <Flex gap="3" mt="4" justify="end">
              <Dialog.Close>
                <Button
                  variant="soft"
                  color="gray"
                  className="cursor-pointer rounded-full"
                  disabled={loading}
                >
                  Avbryt
                </Button>
              </Dialog.Close>
              <Button
                onClick={handleRegistration}
                className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white cursor-pointer rounded-full flex items-center justify-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="2" />
                    Anmäler...
                  </>
                ) : (
                  "Bekräfta"
                )}
              </Button>
            </Flex>
          </>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}

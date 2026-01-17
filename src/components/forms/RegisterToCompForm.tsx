import { registerClimberToCompetition } from "@/services/api";
import { CompetitionResponse } from "@/types";
import { Button, Dialog, Flex, Select, Spinner } from "@radix-ui/themes";
import { useState } from "react";
import CalloutMessage from "../user_feedback/CalloutMessage";

interface RegisterToCompFormProps extends CompetitionResponse {
  onRegistrationSuccess?: () => void;
}

export default function RegisterToCompForm({
  id,
  name,
  comp_date,
  onRegistrationSuccess,
}: RegisterToCompFormProps) {
  const [level, setLevel] = useState<number>(1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleRegidtration = async () => {
    setLoading(true);
    setErrorMessage(null);

    try {
      await registerClimberToCompetition(id, level);

      if (onRegistrationSuccess) {
        onRegistrationSuccess();
      }
    } catch (error) {
      setErrorMessage(error?.message || "Ett fel uppstod vid anmälan.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog.Root>
        <Dialog.Trigger>
          <Button className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] cursor-pointer rounded-full my-2">
            Anmälan
          </Button>
        </Dialog.Trigger>

        <Dialog.Content maxWidth="450px">
          <Dialog.Title>
            Anmälan till {name} - {comp_date}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4">
            Välj tävlingsfärg
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <Select.Root
              size="2"
              defaultValue="1"
              onValueChange={(value) => setLevel(Number(value))}
              disabled={loading}
            >
              <Select.Trigger aria-label="Välj svårighetsgrad" />
              <Select.Content>
                <Select.Item value="1">Lila</Select.Item>
                <Select.Item value="2">Rosa</Select.Item>
                <Select.Item value="3">Orange</Select.Item>
                <Select.Item value="4">Gul</Select.Item>
                <Select.Item value="5">Grön</Select.Item>
                <Select.Item value="6">Vit</Select.Item>
                <Select.Item value="7">Svart</Select.Item>
              </Select.Content>
            </Select.Root>
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
            <Dialog.Close>
              <Button
                onClick={handleRegidtration}
                className="bg-[--secondary-color] hover:bg-[--secondary-color-hover] text-white cursor-pointer rounded-full flex items-center justify-center"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner size="2" className="mr-2" /> Anmäler...
                  </>
                ) : (
                  "Bekräfta"
                )}
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {errorMessage && <CalloutMessage message={errorMessage} color="red" />}
    </>
  );
}

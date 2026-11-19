import { AuthLayout } from "@/components/AppHeader";
import { RegistrationForm } from "@/components/forms/RegistrationForm";

export default function Registration() {
  return (
    <AuthLayout>
      <RegistrationForm />
    </AuthLayout>
  );
}

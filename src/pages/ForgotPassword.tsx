import { AuthLayout } from "@/components/AppHeader";
import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <AuthLayout>
      <ForgotPasswordForm />
    </AuthLayout>
  );
}

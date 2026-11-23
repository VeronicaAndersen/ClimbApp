import { AuthLayout } from "@/components/AppHeader";
import { LoginForm } from "@/components/forms/LoginForm";

export default function Login() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}

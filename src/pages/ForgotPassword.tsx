import { ForgotPasswordForm } from "@/components/forms/ForgotPasswordForm";

export default function ForgotPassword() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <img src="./grepp.svg" alt="grepp logo" className="w-28 absolute top-8 left-5" />
      <ForgotPasswordForm />
    </div>
  );
}

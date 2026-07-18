import { LoginForm } from "@/components/login-form";
import { isDemoAuthEnabled } from "@/lib/auth";

export default function LoginPage() {
  return <LoginForm demoMode={isDemoAuthEnabled()} />;
}

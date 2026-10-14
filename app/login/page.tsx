import AuthForm from "./AuthForm";

export default function LoginPage({ searchParams }: { searchParams: { mode?: string } }) {
  const mode = searchParams.mode === "signup" ? "signup" : "login";
  return (
    <div className="mx-auto max-w-md pt-6">
      <AuthForm initialMode={mode} />
    </div>
  );
}

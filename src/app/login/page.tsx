import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = params?.next || "/";

  return (
    <div className="login-wrap">
      <div className="box login-card">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Los Iñaki — Gestión</h1>
        <p className="small" style={{ marginBottom: 20 }}>
          Ingresá con el usuario que te dio la administración.
        </p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}

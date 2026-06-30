import ResetPasswordClient from "./ResetPasswordClient";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { oobCode?: string };
}) {
  return <ResetPasswordClient oobCode={searchParams.oobCode ?? null} />;
}

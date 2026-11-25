import { PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isRegisterKind, registerDefinitions } from "@/lib/admin/office-registers";
import { requireRegisterAccess } from "../../access";
import { saveRegister } from "../../actions";
import { getRegisterOptions } from "../../options";
import { RegisterForm } from "../../register-form";

export const dynamic = "force-dynamic";

export default async function NewRegisterPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!isRegisterKind(kind)) notFound();
  await requireRegisterAccess(kind, PermissionAction.CREATE);
  const options = await getRegisterOptions(kind);
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/students/registers/${kind}`}>← {registerDefinitions[kind].title}</Link>
    <RegisterForm action={saveRegister.bind(null, null)} kind={kind} options={options} />
  </div>;
}

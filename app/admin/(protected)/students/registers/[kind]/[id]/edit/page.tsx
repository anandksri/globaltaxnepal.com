import { PermissionAction } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { isRegisterKind, validateRegisterData } from "@/lib/admin/office-registers";
import { prisma } from "@/lib/prisma";
import { requireRegisterAccess } from "../../../access";
import { saveRegister } from "../../../actions";
import { getRegisterOptions } from "../../../options";
import { RegisterForm } from "../../../register-form";

export const dynamic = "force-dynamic";

export default async function EditRegisterPage({ params }: { params: Promise<{ kind: string; id: string }> }) {
  const { kind, id } = await params;
  if (!isRegisterKind(kind) || !z.string().cuid().safeParse(id).success) notFound();
  await requireRegisterAccess(kind, PermissionAction.EDIT);
  const [record, options] = await Promise.all([
    prisma.officeRegister.findFirst({ where: { id, kind } }),
    getRegisterOptions(kind),
  ]);
  if (!record) notFound();
  const parsed = validateRegisterData(kind, record.data);
  if (!parsed.success) throw new Error(`Invalid stored register data: ${parsed.error}`);
  return <div className="mx-auto max-w-6xl space-y-5">
    <Link className="text-sm font-medium text-secondary hover:text-primary" href={`/admin/students/registers/${kind}/${id}`}>← Register details</Link>
    <RegisterForm action={saveRegister.bind(null, id)} initial={{ title: record.title, clientId: record.clientId ?? "", data: parsed.data }} kind={kind} options={options} />
  </div>;
}

import Link from "next/link";
import { Card, Button, Input, Label, LinkButton } from "@/components/ui";
import { logIn } from "@/lib/actions/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="font-display text-2xl font-bold">เข้าสู่ระบบ</h1>
        <p className="mt-1 text-sm text-ink/50">ยินดีต้อนรับกลับมา</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={logIn}>
        <Card className="space-y-4">
          <div>
            <Label>อีเมล</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>รหัสผ่าน</Label>
            <Input name="password" type="password" required />
          </div>
          <Button className="w-full" type="submit">
            เข้าสู่ระบบ
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink/40">
            <div className="h-px flex-1 bg-lane" />
            หรือ
            <div className="h-px flex-1 bg-lane" />
          </div>

          <div className="space-y-2">
            <LinkButton href="/auth/google" variant="ghost" className="w-full">
              เข้าสู่ระบบด้วย Google
            </LinkButton>
            <LinkButton href="/auth/facebook" variant="ghost" className="w-full">
              เข้าสู่ระบบด้วย Facebook
            </LinkButton>
          </div>
        </Card>
      </form>

      <p className="text-center text-sm text-ink/50">
        ยังไม่มีบัญชี?{" "}
        <Link href="/signup" className="font-semibold text-primary-dark hover:underline">
          สมัครสมาชิก
        </Link>
      </p>
    </div>
  );
}

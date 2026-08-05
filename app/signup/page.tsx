import Link from "next/link";
import { Card, Button, Input, Label, LinkButton } from "@/components/ui";
import { signUp } from "@/lib/actions/auth";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-sm space-y-6 pt-8">
      <div>
        <h1 className="font-display text-2xl font-bold">สมัครสมาชิก</h1>
        <p className="mt-1 text-sm text-ink/50">เริ่มเก็บระยะและสะสมเหรียญ</p>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form action={signUp}>
        <Card className="space-y-4">
          <div>
            <Label>ชื่อ</Label>
            <Input name="name" required />
          </div>
          <div>
            <Label>อีเมล</Label>
            <Input name="email" type="email" required />
          </div>
          <div>
            <Label>รหัสผ่าน</Label>
            <Input name="password" type="password" minLength={6} required />
          </div>

          <div className="space-y-2 border-t border-lane pt-3">
            <label className="flex items-start gap-2 text-sm text-ink/70">
              <input type="checkbox" name="privacy" className="mt-1" required />
              <span>
                ยอมรับ{" "}
                <span className="font-medium text-primary-dark">
                  นโยบายความเป็นส่วนตัว
                </span>{" "}
                และข้อกำหนดการใช้งาน (จำเป็น)
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-ink/70">
              <input type="checkbox" name="marketing" className="mt-1" />
              <span>ยินยอมรับข่าวสารและโปรโมชัน (ไม่บังคับ)</span>
            </label>
          </div>

          <Button className="w-full" type="submit" icon="userPlus">
            สมัครสมาชิก
          </Button>

          <div className="flex items-center gap-3 text-xs text-ink/40">
            <div className="h-px flex-1 bg-lane" />
            หรือ
            <div className="h-px flex-1 bg-lane" />
          </div>

          <div className="space-y-2">
            <LinkButton href="/auth/google" variant="ghost" className="w-full" icon="userPlus">
              สมัครสมาชิกด้วย Google
            </LinkButton>
            <LinkButton href="/auth/facebook" variant="ghost" className="w-full" icon="userPlus">
              สมัครสมาชิกด้วย Facebook
            </LinkButton>
          </div>
        </Card>
      </form>

      <p className="text-center text-sm text-ink/50">
        มีบัญชีอยู่แล้ว?{" "}
        <Link href="/login" className="font-semibold text-primary-dark hover:underline">
          เข้าสู่ระบบ
        </Link>
      </p>
    </div>
  );
}

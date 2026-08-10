import {
  Activity,
  Award,
  BadgePlus,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CalendarPlus,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ClipboardList,
  Cookie,
  CreditCard,
  Gift,
  History,
  IdCard,
  Image,
  KeyRound,
  LayoutDashboard,
  Link2,
  LogIn,
  MapPin,
  Medal,
  Newspaper,
  PackageCheck,
  Palette,
  Pencil,
  ScrollText,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Truck,
  Upload,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const headingIcons = {
  activity: Activity,
  admin: ShieldCheck,
  article: Newspaper,
  award: Award,
  banner: Image,
  calendar: CalendarDays,
  calendarCheck: CalendarCheck,
  calendarPlus: CalendarPlus,
  chart: ChartNoAxesColumnIncreasing,
  clipboard: ClipboardList,
  consent: ScrollText,
  cookie: Cookie,
  creditCard: CreditCard,
  dashboard: LayoutDashboard,
  edit: Pencil,
  gift: Gift,
  history: History,
  identity: IdCard,
  key: KeyRound,
  level: BadgePlus,
  link: Link2,
  login: LogIn,
  mapPin: MapPin,
  medal: Medal,
  overview: BarChart3,
  package: PackageCheck,
  palette: Palette,
  register: UserPlus,
  settings: Settings,
  shield: ShieldCheck,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  submission: ClipboardCheck,
  trophy: Trophy,
  truck: Truck,
  upload: Upload,
  user: UserRound,
  users: Users,
} satisfies Record<string, LucideIcon>;

export type HeadingIconName = keyof typeof headingIcons;

export function HeadingIcon({
  name,
  className,
}: {
  name: HeadingIconName;
  className?: string;
}) {
  const Icon = headingIcons[name];
  return (
    <Icon
      className={cn("size-5 shrink-0 text-primary-dark", className)}
      aria-hidden="true"
    />
  );
}

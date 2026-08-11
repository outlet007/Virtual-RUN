import type { CSSProperties, HTMLAttributes } from "react";
import { Badge } from "@/components/ui";
import {
  DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR,
  DEFAULT_CATEGORY_BADGE_TEXT_COLOR,
  normalizeCategoryBadgeColor,
} from "@/lib/category-badge";

type CategoryBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  backgroundColor?: string | null;
  textColor?: string | null;
};

export function CategoryBadge({
  backgroundColor,
  textColor,
  style,
  ...props
}: CategoryBadgeProps) {
  const badgeStyle: CSSProperties = {
    backgroundColor:
      normalizeCategoryBadgeColor(backgroundColor) ??
      DEFAULT_CATEGORY_BADGE_BACKGROUND_COLOR,
    color:
      normalizeCategoryBadgeColor(textColor) ?? DEFAULT_CATEGORY_BADGE_TEXT_COLOR,
    ...style,
  };

  return <Badge style={badgeStyle} {...props} />;
}

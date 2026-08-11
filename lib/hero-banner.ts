export function shouldShowDefaultHeroActions(linkUrl: string | null | undefined) {
  return !linkUrl?.trim();
}

export function getHeroSignupHref(isAuthenticated: boolean) {
  return isAuthenticated ? "/dashboard" : "/signup";
}
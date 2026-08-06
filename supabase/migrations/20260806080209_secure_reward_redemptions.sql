drop policy if exists "own redemptions insert" on public.redemptions;

revoke insert on public.redemptions from anon, authenticated;

revoke execute on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

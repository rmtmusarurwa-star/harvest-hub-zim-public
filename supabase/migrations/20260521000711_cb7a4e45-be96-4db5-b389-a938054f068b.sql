
revoke execute on function public.recompute_trust_score(uuid) from public, anon, authenticated;
revoke execute on function public.trigger_recompute_trust_listings() from public, anon, authenticated;
revoke execute on function public.trigger_recompute_trust_reviews() from public, anon, authenticated;
revoke execute on function public.trigger_recompute_trust_follows() from public, anon, authenticated;
revoke execute on function public.handle_new_farmer_profile() from public, anon, authenticated;

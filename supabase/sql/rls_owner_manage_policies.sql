-- Broaden manage policies to include org owners (not just admins)
-- Events
DROP POLICY IF EXISTS "Org admins manage events" ON public.events;
CREATE POLICY "Org admins/owners manage events" ON public.events
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = events.organization_id
      AND om.role IN ('owner','admin')
  )
);

-- Organization members management
DROP POLICY IF EXISTS "Org admins manage members" ON public.organization_members;
CREATE POLICY "Org admins/owners manage members" ON public.organization_members
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = organization_members.organization_id
      AND om.role IN ('owner','admin')
  )
);

-- Challenges (if present)
DROP POLICY IF EXISTS "Org admins manage challenges" ON public.challenges;
CREATE POLICY "Org admins/owners manage challenges" ON public.challenges
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = challenges.organization_id
      AND om.role IN ('owner','admin')
  )
);


-- Enhancement: on first organization join, set profiles.current_organization_id
-- Update redeem_invite_code function to set current org if null
CREATE OR REPLACE FUNCTION public.redeem_invite_code(
  p_code TEXT,
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  organization_id UUID,
  role TEXT
) AS $$
DECLARE
  v_invite RECORD;
BEGIN
  SELECT * INTO v_invite
  FROM public.invite_codes
  WHERE code = p_code
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RETURN QUERY SELECT false, 'Invalid invite code', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_invite.expires_at IS NOT NULL AND v_invite.expires_at < NOW() THEN
    RETURN QUERY SELECT false, 'Invite code has expired', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_invite.type = 'one-time' AND v_invite.current_uses >= 1 THEN
    RETURN QUERY SELECT false, 'This invite code has already been used', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_invite.type = 'limited' AND v_invite.current_uses >= v_invite.max_uses THEN
    RETURN QUERY SELECT false, 'This invite code has reached its usage limit', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.organization_members 
    WHERE organization_id = v_invite.organization_id AND user_id = p_user_id
  ) THEN
    RETURN QUERY SELECT false, 'You are already a member of this organization', NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  INSERT INTO public.organization_members (
    organization_id, user_id, role, invited_by, invited_at, joined_at
  ) VALUES (
    v_invite.organization_id, p_user_id, v_invite.default_role, v_invite.created_by, NOW(), NOW()
  );

  INSERT INTO public.invite_redemptions (
    invite_code_id, redeemed_by, ip_address, user_agent
  ) VALUES (
    v_invite.id, p_user_id, p_ip_address, p_user_agent
  );

  UPDATE public.invite_codes 
  SET current_uses = current_uses + 1, last_used_at = NOW()
  WHERE id = v_invite.id;

  -- Set current organization on profile if not set
  UPDATE public.profiles
  SET current_organization_id = v_invite.organization_id
  WHERE id = p_user_id AND current_organization_id IS NULL;

  RETURN QUERY SELECT true, 'Successfully joined organization', v_invite.organization_id, v_invite.default_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


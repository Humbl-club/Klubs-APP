-- Atomic unregister to safely reduce capacity and remove a user's registration
-- Requires event_registrations table and events.current_capacity column
CREATE OR REPLACE FUNCTION public.unregister_from_event(
  event_id_param uuid,
  user_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  evt RECORD;
  reg RECORD;
BEGIN
  -- Lock event row for safe capacity update
  SELECT id, current_capacity
  INTO evt
  FROM public.events
  WHERE id = event_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Find a registration for this user
  SELECT id
  INTO reg
  FROM public.event_registrations
  WHERE event_id = event_id_param AND user_id = user_id_param
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not registered');
  END IF;

  -- Delete the registration
  DELETE FROM public.event_registrations WHERE id = reg.id;

  -- Decrement capacity if present and > 0
  UPDATE public.events
  SET current_capacity = GREATEST(COALESCE(current_capacity, 0) - 1, 0)
  WHERE id = event_id_param;

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unregister failed');
END;
$$;

GRANT EXECUTE ON FUNCTION public.unregister_from_event(uuid, uuid) TO authenticated;


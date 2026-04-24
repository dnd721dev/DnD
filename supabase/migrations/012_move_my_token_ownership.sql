-- Bug 2: add ownership enforcement to move_my_token so players cannot move
-- other players' tokens even if they bypass the client-side canMoveToken check.
-- The wallet address is read from the x-wallet-address request header which the
-- supabase.ts client injects on every request from localStorage('dnd721_wallet').

CREATE OR REPLACE FUNCTION move_my_token(p_token_id UUID, p_x INT, p_y INT)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_wallet text;
BEGIN
  -- Extract and normalise the wallet from the PostgREST request header.
  -- The client always sends:  x-wallet-address: <connected wallet>
  v_caller_wallet := lower(
    nullif(
      trim(current_setting('request.headers', true)::json->>'x-wallet-address'),
      ''
    )
  );

  IF v_caller_wallet IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: no wallet address in request headers';
  END IF;

  -- Only move the token when the caller owns it.
  -- If the caller is not the owner (or the token doesn't exist) FOUND will be
  -- false and we raise an exception so the client can revert the optimistic UI.
  UPDATE tokens
     SET x = p_x,
         y = p_y
   WHERE id            = p_token_id
     AND lower(owner_wallet) = v_caller_wallet;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized to move token % (caller: %)',
                    p_token_id, v_caller_wallet;
  END IF;
END;
$$;

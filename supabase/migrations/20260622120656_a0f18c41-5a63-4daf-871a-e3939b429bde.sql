UPDATE auth.identities 
SET identity_data = jsonb_set(identity_data, '{email}', '"carolina@grupothv.com.br"')
WHERE user_id='e8e47b00-bb86-41fc-95dc-85268ad76679';

UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data,'{}'::jsonb) || jsonb_build_object('email','carolina@grupothv.com.br')
WHERE id='e8e47b00-bb86-41fc-95dc-85268ad76679';

UPDATE public.perfis_usuarios SET email='carolina@grupothv.com.br' WHERE id='e8e47b00-bb86-41fc-95dc-85268ad76679';
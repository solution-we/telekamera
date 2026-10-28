create or replace function public.finalize_release_upload(
  p_upload_id uuid,
  p_admin_user_id uuid,
  p_file_size bigint,
  p_sha256 text,
  p_content_type text,
  p_original_filename text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_upload public.upload_sessions%rowtype;
  v_release_id uuid;
  v_previous_key text;
begin
  select * into v_upload from public.upload_sessions
    where id = p_upload_id and admin_user_id = p_admin_user_id for update;
  if not found then raise exception 'Upload session was not found.'; end if;
  if v_upload.expires_at <= now() then raise exception 'Upload session expired.'; end if;
  if p_file_size <= 0 or p_file_size <> v_upload.declared_size then raise exception 'Uploaded file size does not match.'; end if;
  if p_sha256 !~ '^[a-f0-9]{64}$' then raise exception 'Invalid file checksum.'; end if;

  insert into public.releases (
    platform, version, build_number, channel, status, release_notes, release_date, minimum_os, created_by
  ) values (
    v_upload.platform, v_upload.version, v_upload.build_number, v_upload.channel, 'draft',
    v_upload.release_notes, v_upload.release_date, v_upload.minimum_os, p_admin_user_id
  ) on conflict (platform, version, build_number, channel) do update set
    release_notes = excluded.release_notes,
    release_date = excluded.release_date,
    minimum_os = excluded.minimum_os,
    updated_at = now()
  returning id into v_release_id;

  select storage_key into v_previous_key from public.release_binaries
    where release_id = v_release_id and installer_format = v_upload.installer_format;

  insert into public.release_binaries (
    release_id, installer_format, original_filename, storage_key, content_type, file_size, sha256
  ) values (
    v_release_id, v_upload.installer_format, p_original_filename, v_upload.storage_key,
    p_content_type, p_file_size, p_sha256
  ) on conflict (release_id, installer_format) do update set
    original_filename = excluded.original_filename,
    storage_key = excluded.storage_key,
    content_type = excluded.content_type,
    file_size = excluded.file_size,
    sha256 = excluded.sha256,
    created_at = now();

  insert into public.audit_events (admin_user_id, action, subject_type, subject_id, metadata)
    values (p_admin_user_id, 'release.binary_uploaded', 'release', v_release_id::text,
      jsonb_build_object('format', v_upload.installer_format, 'size', p_file_size, 'sha256', p_sha256));
  delete from public.upload_sessions where id = p_upload_id;
  return jsonb_build_object('release_id', v_release_id, 'previous_storage_key', v_previous_key);
end;
$$;

revoke all on function public.finalize_release_upload(uuid, uuid, bigint, text, text, text) from public, anon, authenticated;
grant execute on function public.finalize_release_upload(uuid, uuid, bigint, text, text, text) to service_role;

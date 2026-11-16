-- Storage deletion on cat-attachments was previously allowed for any household
-- member. Only the uploader or an owner/admin may remove an object.

drop policy if exists cat_attachments_storage_delete on storage.objects;
create policy cat_attachments_storage_delete on storage.objects for delete
  using (
    bucket_id = 'cat-attachments'
    and (
      owner = auth.uid()
      or public.household_role((storage.foldername(name))[1]::uuid) in ('owner','admin')
    )
  );

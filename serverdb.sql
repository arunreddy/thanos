SELECT 
    i.resource_id,
    i.resource_nm,
    i.db_type_cd,
    i.host_nm,
    i.version_num,
    i.resource_status,
    p.patch_id,
    p.patch_version,
    p.patch_type,
    p.patch_status,
    p.applied_ts,
    p.patch_details
FROM dbq.inventory i
LEFT JOIN dbq.patches p ON i.resource_id = p.resource_id
ORDER BY i.resource_id, p.applied_ts DESC;
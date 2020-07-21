SELECT
    maj.message_id,
    filename
FROM

message_attachment_join AS maj
INNER JOIN attachment AS a ON maj.attachment_id = a.rowid
INNER JOIN chat_message_join AS cmj ON maj.message_id = cmj.message_id
INNER JOIN chat_handle_join AS chj ON cmj.chat_id = chj.chat_id
INNER JOIN handle AS h ON chj.handle_id = h.rowid

WHERE h.id = '$ID'

ORDER BY maj.rowid

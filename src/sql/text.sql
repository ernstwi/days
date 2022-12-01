SELECT
    m.rowid,
    text
FROM

message AS m
INNER JOIN chat_message_join AS cmj ON m.rowid = cmj.message_id
INNER JOIN chat_handle_join AS chj ON cmj.chat_id = chj.chat_id
INNER JOIN handle AS h ON chj.handle_id = h.rowid

WHERE h.id = '$ID'

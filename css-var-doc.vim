let s:b = bufnr()
enew
0read static/main.css
0read static/month.css
0read static/post.css
0read static/start.css
0read static/two-pane.css
%g!/var(/norm dd/
%g!/var.*var/norm dd
%s/var(//g
%s/)//g
%s/;//g
%s/.\{-}\ze--/| 
%s/, / | color | 
%sort

0read static/theme/default.css
%g/\(:root\|}\)/norm dd
%s/;//g
%s/^ \+\ze--/| 
%s/: / | color | 
%norm WysiW`WWWWysiW`
%norm A |
0norm O|  |  |  |
0norm O| Name | Type | Fallback value |
/--[^|]*|$/norm O|  |  |  |O| Name | Type | Fallback value |O
%Tabularize /|
%s/| \zs\s\{-}\ze |/\=repeat('-', strlen(submatch(0)))/g
norm ggyG
Bdelete!
execute 'b' s:b
norm p

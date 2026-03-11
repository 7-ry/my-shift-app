# 「どのファイルが変わったか」のリストだけ見たい場合

git diff HEAD --stat

# 特定のフォルダ（例: components）の差分だけ出したい場合

git diff HEAD src/components/ > components_changes.diff

# 前回のコミットから現在までの「すべての変更」を 1 つのファイルに書き出す

git diff HEAD > current_changes.diff

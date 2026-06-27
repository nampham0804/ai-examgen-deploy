import os
import re

regex = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.IGNORECASE)
lines = []

for r, d, files in os.walk('src/app/pages'):
    for f in files:
        if f.endswith('.tsx'):
            path = os.path.join(r, f)
            try:
                with open(path, 'r', encoding='utf-8') as file:
                    content = file.read()
                    if regex.search(content):
                        lines.append(f'\n--- {f} ---')
                        for i, line in enumerate(content.splitlines()):
                            if regex.search(line):
                                lines.append(f'L{i+1}: {line.strip()}')
            except Exception as e:
                lines.append(f'Error reading {f}: {e}')

with open('vi_strings_all.txt', 'w', encoding='utf-8') as out:
    out.write('\n'.join(lines))

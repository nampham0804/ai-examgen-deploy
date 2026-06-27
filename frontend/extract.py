import os, re
regex = re.compile(r'[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]', re.IGNORECASE)
lines = []
for r, d, files in os.walk('src/app'):
    for f in files:
        if f.endswith('.tsx') or f.endswith('.ts'):
            path = os.path.join(r, f)
            content = open(path, encoding='utf-8').read()
            if regex.search(content):
                lines.append(f'\n--- {f} ---')
                for i, l in enumerate(content.splitlines()):
                    if regex.search(l):
                        lines.append(f'L{i+1}: {l.strip()}')

open('vi_strings.txt', 'w', encoding='utf-8').write('\n'.join(lines))

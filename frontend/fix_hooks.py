import re

with open('src/app/pages/AIGeneration.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

def inject_t(func_name, content):
    pattern = re.compile(rf'(function {func_name}\([^)]*\)[^{{]*{{)')
    # find the match, and replace it with match + "\n  const { t } = useApp();"
    match = pattern.search(content)
    if match:
        return content[:match.end()] + "\n  const { t } = useApp();" + content[match.end():]
    return content

content = inject_t('DocumentSummary', content)
content = inject_t('QuestionPanel', content)
content = inject_t('McqDetails', content)
content = inject_t('TextBlock', content)
content = inject_t('SourceEvidence', content)

with open('src/app/pages/AIGeneration.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Injected useApp hook into subcomponents.")

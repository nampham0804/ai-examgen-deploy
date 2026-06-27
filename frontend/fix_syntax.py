import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    for old, new in replacements:
        content = content.replace(old, new)
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

replace_in_file('src/app/pages/ExamPreview.tsx', [
    ("'t('exam.noAlternativeQuestion')'", "t('exam.noAlternativeQuestion')"),
    ("`t('exam.exportSuccess').replace('{format}', selectedFormat.toUpperCase())`", "t('exam.exportSuccess').replace('{format}', selectedFormat.toUpperCase())"),
    ("`t('exam.exportFailed').replace('{format}', selectedFormat.toUpperCase())`", "t('exam.exportFailed').replace('{format}', selectedFormat.toUpperCase())"),
    ("'t('exam.savedSuccess')'", "t('exam.savedSuccess')"),
    ("'t('exam.saveError')'", "t('exam.saveError')"),
    ("'t('exam.saveDraftSuccess')'", "t('exam.saveDraftSuccess')"),
    ("'t('exam.draftError')'", "t('exam.draftError')"),
    ("'t('exam.notUpdated')'", "t('exam.notUpdated')"),
])

replace_in_file('src/app/pages/ExamList.tsx', [
    ("'t('exam.confirmDeleteMessage').replace('{title}', deleteTarget?.title || '')'", "t('exam.confirmDeleteMessage').replace('{title}', deleteTarget?.title || '')"),
])

replace_in_file('src/app/pages/ExamGenerator.tsx', [
    ('"t(\'examGen.validationErrorSelect\')"', "t('examGen.validationErrorSelect')"),
    ('"t(\'examGen.validationErrorNotEnough\')"', "t('examGen.validationErrorNotEnough')"),
    ('"t(\'examGen.generateSuccess\')"', "t('examGen.generateSuccess')"),
    ('e.message || "t(\'examGen.generateFailed\')"', "e.message || t('examGen.generateFailed')"),
])

print("Fixed syntax errors.")

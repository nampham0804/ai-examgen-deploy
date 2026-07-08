import os
import re

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.services.exam_service import ExamService

router = APIRouter(prefix="/exports", tags=["exports"])


def verify_export_access(exam_id: int, db: Session, user_id: int):
    service = ExamService(db)
    exam = service.get_exam_by_id(exam_id, user_id)
    if exam.status != "approved":
        raise HTTPException(status_code=400, detail="Only approved exams can be exported")
    return service, exam


def is_correct_match(opt: str, ans: str, index: int = -1) -> bool:
    if not ans:
        return False
    a = str(ans).strip().upper()

    if len(a) == 1 and a in ['A', 'B', 'C', 'D'] and index >= 0:
        if chr(65 + index) == a:
            return True

    if not opt:
        return False
    o = str(opt).strip()

    if o.upper() == a:
        return True
    if len(a) == 1 and a.upper() in ['A', 'B', 'C', 'D']:
        if o.upper().startswith(f"{a.upper()}.") or o.upper().startswith(f"{a.upper()})"):
            return True
    if a in o and len(a) > 5:
        return True
    if o in a and len(o) > 5:
        return True
    # Strip prefix like "A. " from opt and compare
    o_clean = re.sub(r'^[A-D][\.\)]\s*', '', o, flags=re.IGNORECASE)
    a_clean = re.sub(r'^[A-D][\.\)]\s*', '', a, flags=re.IGNORECASE)
    if o_clean == a_clean:
        return True
    return False


@router.get("/gift")
def export_gift(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service, exam = verify_export_access(exam_id, db, current_user.id)
    preview_data = service.get_exam_preview(exam_id, current_user.id)

    gift_content = f"// Exam {preview_data.title}\n\n"
    for i, q in enumerate(preview_data.questions):
        def escape_gift(text):
            if not text:
                return ""
            return re.sub(r'([{}~=#\:])', r'\\\1', text)

        short_name = q.text[:100].replace('\n', ' ')
        safe_name = escape_gift(short_name)
        safe_text = escape_gift(q.text)

        gift_content += f"// question: {q.id}  name: {short_name}\n"

        if q.type in ['Multiple Choice', 'mcq']:
            gift_content += f"::{safe_name}::[html]<p>{safe_text}</p>{{\n"
            for j, opt in enumerate(q.options or []):
                safe_opt = escape_gift(opt)
                if is_correct_match(opt, q.correct_answer, j):
                    gift_content += f"\t=<p>{safe_opt}</p>\n"
                else:
                    gift_content += f"\t~<p>{safe_opt}</p>\n"
            gift_content += "}\n\n"
        elif q.type in ['Essay', 'essay']:
            essay_feedback = ""
            if getattr(q, 'sample_answer', None) or getattr(q, 'rubric', None):
                fb_parts = []
                if getattr(q, 'sample_answer', None):
                    fb_parts.append(f"Đáp án mẫu:<br/>{q.sample_answer}")
                if getattr(q, 'rubric', None):
                    fb_parts.append(f"Rubric chấm điểm:<br/>{q.rubric}")
                fb_text = escape_gift("<br/><br/>".join(fb_parts))
                essay_feedback = f" {{\n\t#### [html]<p>{fb_text}</p>\n}}"
            else:
                essay_feedback = "{}"
            gift_content += f"::{safe_name}::[html]<p>{safe_text}</p>{essay_feedback}\n\n"

    return Response(content=gift_content.encode('utf-8'), media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename=exam_{exam_id}.gift"
    })

@router.get("/xml")
def export_xml(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service, exam = verify_export_access(exam_id, db, current_user.id)
    preview_data = service.get_exam_preview(exam_id, current_user.id)
    course_name = preview_data.course_name or "Course"

    xml_content = '<?xml version="1.0" encoding="UTF-8"?>\n<quiz>\n'

    # Add category header
    xml_content += f"""<!-- question: 0  -->
  <question type="category">
    <category>
      <text>$course$/top/Mặc định cho {course_name}</text>
    </category>
    <info format="moodle_auto_format">
      <text>Danh mục mặc định cho các câu hỏi được chia sẻ trong bối cảnh '{course_name}'.</text>
    </info>
    <idnumber></idnumber>
  </question>

"""

    for i, q in enumerate(preview_data.questions):
        xml_content += f'<!-- question: {q.id}  -->\n'
        if q.type in ['Multiple Choice', 'mcq']:
            xml_content += '  <question type="multichoice">\n'

            # Name
            safe_name_text = q.text[:255].replace('<', '&lt;').replace('>', '&gt;')
            xml_content += f'    <name>\n      <text>{safe_name_text}</text>\n    </name>\n'

            # Question text
            xml_content += f'    <questiontext format="html">\n      <text><![CDATA[<p>{q.text}</p>]]></text>\n    </questiontext>\n'

            # Static attributes
            xml_content += '    <generalfeedback format="html">\n      <text></text>\n    </generalfeedback>\n'
            xml_content += '    <defaultgrade>1.0000000</defaultgrade>\n'
            xml_content += '    <penalty>0.3333333</penalty>\n'
            xml_content += '    <hidden>0</hidden>\n'
            xml_content += '    <idnumber></idnumber>\n'
            xml_content += '    <single>true</single>\n'
            xml_content += '    <shuffleanswers>true</shuffleanswers>\n'
            xml_content += '    <answernumbering>abc</answernumbering>\n'
            xml_content += '    <showstandardinstruction>0</showstandardinstruction>\n'

            # Feedback attributes
            xml_content += '    <correctfeedback format="html">\n      <text><![CDATA[<p>Câu trả lời của bạn đúng</p>]]></text>\n    </correctfeedback>\n'
            xml_content += '    <partiallycorrectfeedback format="html">\n      <text><![CDATA[<p>Câu trả lời của bạn đúng một phần.</p>]]></text>\n    </partiallycorrectfeedback>\n'
            xml_content += '    <incorrectfeedback format="html">\n      <text><![CDATA[<p>Câu trả lời của bạn sai.</p>]]></text>\n    </incorrectfeedback>\n'
            xml_content += '    <shownumcorrect/>\n'

            # Answers
            for j, opt in enumerate(q.options or []):
                fraction = "100" if is_correct_match(opt, q.correct_answer, j) else "0"
                xml_content += f'    <answer fraction="{fraction}" format="html">\n'
                xml_content += f'      <text><![CDATA[<p>{opt}</p>]]></text>\n'
                xml_content += '      <feedback format="html">\n        <text></text>\n      </feedback>\n'
                xml_content += '    </answer>\n'
            xml_content += '  </question>\n\n'
        elif q.type in ['Essay', 'essay']:
            xml_content += '  <question type="essay">\n'
            safe_name_text = q.text[:255].replace('<', '&lt;').replace('>', '&gt;')
            xml_content += f'    <name>\n      <text>{safe_name_text}</text>\n    </name>\n'
            xml_content += f'    <questiontext format="html">\n      <text><![CDATA[<p>{q.text}</p>]]></text>\n    </questiontext>\n'
            xml_content += '    <generalfeedback format="html">\n      <text></text>\n    </generalfeedback>\n'
            xml_content += '    <defaultgrade>1.0000000</defaultgrade>\n'
            xml_content += '    <penalty>0.3333333</penalty>\n'
            xml_content += '    <hidden>0</hidden>\n'
            xml_content += '    <idnumber></idnumber>\n'
            if getattr(q, 'sample_answer', None) or getattr(q, 'rubric', None):
                fb_parts = []
                if getattr(q, 'sample_answer', None):
                    fb_parts.append(f"<p><b>Đáp án mẫu:</b><br/>{q.sample_answer}</p>")
                if getattr(q, 'rubric', None):
                    fb_parts.append(f"<p><b>Rubric chấm điểm:</b><br/>{q.rubric}</p>")
                fb_text = "".join(fb_parts)
                xml_content += f'    <graderinfo format="html">\n      <text><![CDATA[{fb_text}]]></text>\n    </graderinfo>\n'
            xml_content += '  </question>\n\n'

    xml_content += '</quiz>'

    return Response(content=xml_content.encode('utf-8'), media_type="application/xml", headers={
        "Content-Disposition": f"attachment; filename=exam_{exam_id}.xml"
    })

@router.get("/doc")
def export_doc(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service, exam = verify_export_access(exam_id, db, current_user.id)
    preview_data = service.get_exam_preview(exam_id, current_user.id)
    course_name = preview_data.course_name or "Course"

    # Load the DOC template header
    header_path = os.path.join(os.path.dirname(__file__), "moodle_doc_header.html")
    try:
        with open(header_path, encoding="utf-8") as f:
            html_content = f.read()
            html_content = html_content.replace('charset=iso-8859-1', 'charset=utf-8')
            if '<container>' in html_content:
                html_content = html_content.split('<container>')[0] + '<container>\n'
    except OSError:
        html_content = """<html xmlns="http://www.w3.org/1999/xhtml" lang="VI" dir="ltr">
<head><meta http-equiv="Content-Type" content="text/html; charset=utf-8" /></head>
<body lang="EN-UK" style="tab-interval:36.0pt"><container>"""

    html_content += f"""<title>{preview_data.title}, Danh mục: top/Mặc định cho {course_name}</title>\n"""
    html_content += f"""<p class="MsoTitle">{preview_data.title}</p>\n"""
    html_content += f"""<h1 class="MsoHeading1">top/Mặc định cho {course_name}</h1>\n"""

    for i, q in enumerate(preview_data.questions):
        safe_name = (q.text or "")[:255].replace('<', '&lt;').replace('>', '&gt;')
        safe_text = (q.text or "").replace('<', '&lt;').replace('>', '&gt;')

        html_content += f'<h2 class="MsoHeading2">{safe_name}</h2><p class="MsoBodyText"/><div class="TableDiv">\n'
        html_content += '<table border="1" dir="ltr"><thead>\n'

        if q.type in ['Multiple Choice', 'mcq']:
            html_content += f'<tr>\n<td colspan="3" style="width: 12.0cm"><div class="chapter"><p class="MsoBodyText">{safe_text}</p></div></td>\n<td style="width: 1.0cm"><p class="QFType">MC</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Điểm mặc định:</p></td>\n<td style="width: 1.0cm"><p class="Cell">1</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Shuffle the choices?</p></td>\n<td style="width: 1.0cm"><p class="Cell">Có</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Number the choices?</p></td>\n<td style="width: 1.0cm"><p class="Cell">a</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Phạt cho mỗi lần thử sai:</p></td>\n<td style="width: 1.0cm"><p class="Cell">33.3</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Số ID:</p></td>\n<td style="width: 1.0cm"><p class="QFID"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="QFOptionReset">#</p></td>\n<td style="width: 5.0cm"><p class="TableHead">Câu trả lời</p></td>\n<td style="width: 6.0cm"><p class="TableHead">Phản hồi</p></td>\n<td style="width: 1.0cm"><p class="TableHead">Điểm</p></td></tr>\n'
            html_content += '</thead><tbody>\n'

            for j, opt in enumerate(q.options or []):
                fraction = "100" if is_correct_match(opt, q.correct_answer, j) else "0"
                safe_opt = (opt or "").replace('<', '&lt;').replace('>', '&gt;')
                html_content += f'<tr>\n<td style="width: 1.0cm"><p class="QFOption"> </p></td>\n<td style="width: 5.0cm"><div class="chapter"><p class="MsoBodyText">{safe_opt}</p></div></td>\n<td style="width: 6.0cm"><div class="chapter"><p class="QFFeedback"> </p></div></td>\n<td style="width: 1.0cm"><p class="QFGrade">{fraction}</p></td></tr>\n'

            # Trailing MC static parts
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Phản hồi chung:</p></p></th>\n<td style="width: 6.0cm"><div class="chapter"><p class="Cell"> </p></div></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">For any correct response:</p></p></th>\n<td style="width: 6.0cm"><div class="chapter"><p class="MsoBodyText">Câu trả lời của bạn đúng</p></div></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">For any incorrect response:</p></p></th>\n<td style="width: 6.0cm"><div class="chapter"><p class="MsoBodyText">Câu trả lời của bạn sai.</p></div></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Gợi ý 1:</p></p></th>\n<td style="width: 6.0cm"><p class="Cell"> </p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Hiện số phản hồi đúng (Gợi ý 1):</p></p></th>\n<td style="width: 6.0cm"><p class="Cell">Không</p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Xóa các phản hồi sai (Gợi ý 1):</p></p></th>\n<td style="width: 6.0cm"><p class="Cell">Không</p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Thẻ từ khóa:</p></p></th>\n<td style="width: 6.0cm"><p class="Cell"> </p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="Cell"><i>Allows the selection of a single or multiple responses from a pre-defined list. (MC/MA)</i></p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '</tbody></table></div><p class="MsoNormal"> </p>\n'

        elif q.type in ['Essay', 'essay']:
            html_content += f'<tr>\n<td colspan="3" style="width: 12.0cm"><div class="chapter"><p class="MsoBodyText">{safe_text}</p></div></td>\n<td style="width: 1.0cm"><p class="QFType">ES</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Điểm mặc định:</p></td>\n<td style="width: 1.0cm"><p class="Cell">1</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Response format:</p></td>\n<td style="width: 1.0cm"><p class="Cell">HTML editor</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Require text:</p></td>\n<td style="width: 1.0cm"><p class="Cell">Require the student to enter text</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Input box size:</p></td>\n<td style="width: 1.0cm"><p class="Cell">15 lines</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Allow attachments:</p></td>\n<td style="width: 1.0cm"><p class="Cell">No</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Require attachments:</p></td>\n<td style="width: 1.0cm"><p class="Cell">Attachments are not allowed</p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="TableRowHead" style="text-align: right">Số ID:</p></td>\n<td style="width: 1.0cm"><p class="QFID"> </p></td></tr>\n'
            html_content += '</thead><tbody>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Phản hồi chung:</p></p></th>\n<td style="width: 6.0cm"><div class="chapter"><p class="Cell"> </p></div></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'

            grader_info = " "
            if getattr(q, 'sample_answer', None) or getattr(q, 'rubric', None):
                fb_parts = []
                if getattr(q, 'sample_answer', None):
                    fb_parts.append(f"<b>Đáp án mẫu:</b><br/>{q.sample_answer}")
                if getattr(q, 'rubric', None):
                    fb_parts.append(f"<b>Rubric chấm điểm:</b><br/>{q.rubric}")
                grader_info = "<br/><br/>".join(fb_parts)

            html_content += f'<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Information for graders:</p></p></th>\n<td style="width: 6.0cm"><div class="chapter"><p class="Cell">{grader_info}</p></div></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td style="width: 1.0cm"><p class="Cell"> </p></td>\n<th style="width: 5.0cm"><p class="TableRowHead"><p class="TableRowHead">Thẻ từ khóa:</p></p></th>\n<td style="width: 6.0cm"><p class="Cell"> </p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '<tr>\n<td colspan="3" style="width: 12.0cm"><p class="Cell"><i>Allows a response of a file upload and/or online text. This must then be graded manually. (ES)</i></p></td>\n<td style="width: 1.0cm"><p class="Cell"> </p></td></tr>\n'
            html_content += '</tbody></table></div><p class="MsoNormal"> </p>\n'

    html_content += "</container>\n</body>\n</html>"

    return Response(content=html_content.encode("utf-8"), media_type="application/msword", headers={
        "Content-Disposition": f"attachment; filename=exam_{exam_id}.doc"
    })

@router.get("/txt")
def export_txt(exam_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    service, exam = verify_export_access(exam_id, db, current_user.id)
    preview_data = service.get_exam_preview(exam_id, current_user.id)

    txt_content = ""
    for i, q in enumerate(preview_data.questions):
        txt_content += f"{q.text}\n"
        if q.type in ['Multiple Choice', 'mcq'] and q.options:
            correct_letter = None
            for j, opt in enumerate(q.options):
                letter = chr(65 + j)
                if is_correct_match(opt, q.correct_answer, j):
                    correct_letter = letter
                txt_content += f"{letter}) {opt}\n"
            if correct_letter:
                txt_content += f"ANSWER: {correct_letter}\n"
        elif q.type in ['Essay', 'essay']:
            txt_content += "ANSWER: [Essay]\n"
            if getattr(q, 'sample_answer', None):
                txt_content += f"Đáp án mẫu: {q.sample_answer}\n"
            if getattr(q, 'rubric', None):
                txt_content += f"Rubric chấm điểm: {q.rubric}\n"
        txt_content += "\n"

    return Response(content=txt_content.encode('utf-8'), media_type="text/plain", headers={
        "Content-Disposition": f"attachment; filename=exam_{exam_id}.txt"
    })

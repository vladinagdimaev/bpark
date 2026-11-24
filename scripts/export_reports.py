"""Export approved Neon reports into Pelican's build tree.

The export runs only in the build environment. Drafts, identities and private
object keys are never written to the public site.
"""
import html
import io
import os
from pathlib import Path
from zoneinfo import ZoneInfo

if os.getenv('BPARK_EXPORT_ENABLED') != '1':
    print('Neon report export not enabled; keeping repository content only.')
    raise SystemExit(0)

import boto3
import psycopg
from PIL import Image, ImageOps
from psycopg.rows import dict_row

LATEST_AREAS = {}
ACCESSIBILITY = (
    'המעבר פנוי',
    'קיימת גישה רציפה',
    'קיים מעבר נוח לכיסא גלגלים',
)

Image.MAX_IMAGE_PIXELS = 50_000_000
out = Path('content/reports/generated')
images = Path('content/images/published')
out.mkdir(parents=True, exist_ok=True)
images.mkdir(parents=True, exist_ok=True)
s3 = boto3.client('s3', endpoint_url=os.environ['AWS_ENDPOINT_URL_S3'], region_name=os.environ['AWS_REGION'], aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'], aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY'])
STATUS = {'not_checked':'לא נבדק', 'not_started':'טרם החלו', 'in_progress':'בתהליך', 'completed':'הושלם', 'other':'אחר'}
def text(value):
    return html.escape(str(value or ''), quote=True).replace('\n', '<br>')
def field(label, value):
    return f'<p><strong>{label}:</strong> {text(value) if value else "לא צוין"}</p>'
def export_image(key, filename):
    result = s3.get_object(Bucket='bpark-uploads', Key=key)
    data = result['Body'].read(8 * 1024 * 1024 + 1)
    if len(data) > 8 * 1024 * 1024: raise ValueError('image too large')
    with Image.open(io.BytesIO(data)) as src:
        image = ImageOps.exif_transpose(src).convert('RGB')
        image.thumbnail((2000, 2000))
        image.save(images / filename, 'JPEG', quality=82, optimize=True)
    return '/images/published/' + filename

with psycopg.connect(os.environ['BPARK_READ_DATABASE_URL'], row_factory=dict_row) as db:
    reports = db.execute("SELECT id,title,visit_at,summary,participants,next_visit_focus FROM reports WHERE status='published' OR (status='approved' AND publication_requested_at IS NOT NULL) ORDER BY visit_at DESC").fetchall()
    for report in reports:
        rid=str(report['id'])
        title=' '.join(report['title'].splitlines()).strip().replace('<','&lt;').replace('>','&gt;')
        date=report['visit_at'].astimezone(ZoneInfo('Asia/Jerusalem')).strftime('%Y-%m-%d %H:%M')
        parts=[f'Title: {title}\nDate: {date}\nSlug: report-{rid}\nSummary: דו״ח מעקב קהילתי\n\n', '<h2>פרטי הסיור</h2>',field('משתתפים',report['participants']),field('סיכום הביקור',report['summary'])]
        rows=db.execute("SELECT areas.id,areas.name,observations.*, to_jsonb(observations)->'accessibility' AS accessibility_answers FROM areas LEFT JOIN area_observations observations ON observations.area_id=areas.id AND observations.report_id=%s ORDER BY areas.id",(rid,)).fetchall()
        for area in rows:
            aid = area['id']
            photos=db.execute('SELECT id,object_key,caption,photographed_at FROM report_photos WHERE report_id=%s AND area_id=%s ORDER BY created_at DESC',(rid,aid)).fetchall()
            answers = area.get('accessibility_answers') or {}
            has_notes = any(area[key] for key in ('change_since_previous', 'observation', 'interpretation', 'question'))
            if area['work_status'] in (None, 'not_checked') and not (photos or has_notes or answers):
                continue
            current = LATEST_AREAS.setdefault(aid, {'slug': f'report-{rid}', 'date': date.split()[0]})
            parts.extend([f'<span id="area-{aid:02d}"></span>',f'<h3>{aid}. {text(area["name"])}</h3>',field('סטטוס',STATUS.get(area['work_status'],'לא נבדק')),field('מה השתנה',area['change_since_previous']),field('ממצא',area['observation']),field('התרשמות',area['interpretation']),field('שאלה',area['question']),'<div class="compare-grid"><figure><figcaption>תכנון העירייה</figcaption>'])
            plans=db.execute('SELECT id,object_key,caption,source FROM area_plans WHERE area_id=%s ORDER BY id',(aid,)).fetchall()
            if not plans: parts.append('<p>חומר תכנון טרם צורף.</p>')
            for plan in plans:
                src=export_image(plan['object_key'],f'plan-{plan["id"]}.jpg')
                current.setdefault('plan', src)
                parts.append(f'<img src="{src}" alt="{text(plan["caption"] or "תכנון העירייה")}"><p>{text(plan["caption"])} {text(plan["source"])}</p>')
            parts.append('</figure><figure><figcaption>המצב בשטח</figcaption>')
            if not photos: parts.append('<p>צילום שטח טרם צורף.</p>')
            for photo in photos:
                src=export_image(photo['object_key'],f'photo-{photo["id"]}.jpg')
                if 'photo' not in current:
                    current.update(photo=src, photo_date=date.split()[0], photo_slug=f'report-{rid}')
                parts.append(f'<img src="{src}" alt="{text(photo["caption"] or "צילום האזור בשטח")}"><p>{text(photo["caption"])} {text(photo["photographed_at"])}</p>')
            parts.append('</figure></div>')
            if any(answers.get(question) for question in ACCESSIBILITY):
                parts.append('<h4>נגישות</h4>')
                parts.extend(field(question, answers[question]) for question in ACCESSIBILITY if answers.get(question))
        notes=db.execute('SELECT topic,content FROM report_notes WHERE report_id=%s',(rid,)).fetchall()
        labels={'entrances':'כניסות לגן','accessibility_transport':'תחבורה ונגישות','infrastructure':'תשתיות','summary':'סיכום'}
        parts.append('<h2>נושאים נוספים</h2>')
        parts.extend(field(labels.get(n['topic'],n['topic']),n['content']) for n in notes)
        parts.append(field('מה נבדוק בשבוע הבא',report['next_visit_focus']))
        (out / f'report-{rid}.md').write_text('\n'.join(parts),encoding='utf-8')
print(f'Exported {len(reports)} approved reports.')

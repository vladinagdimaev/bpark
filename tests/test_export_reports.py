import io, os, runpy, sys, tempfile, unittest
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import patch
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'export_reports.py'
class Rows:
    def __init__(self, rows): self.rows=rows
    def fetchall(self): return self.rows
class DB:
    def __enter__(self): return self
    def __exit__(self,*args): pass
    def execute(self, sql, args=None):
        if 'FROM reports WHERE' in sql:
            assert "publication_requested_at IS NOT NULL" in sql
            return Rows([{'id':'00000000-0000-0000-0000-000000000001','title':'Example','visit_at':datetime(2026,11,15,7,0,tzinfo=timezone.utc),'summary':'<script>alert(1)</script>','participants':'A','next_visit_focus':'Next'}])
        if 'FROM areas LEFT JOIN' in sql:
            return Rows([{'id':i,'name':f'area {i}','work_status':'not_checked','change_since_previous':'','observation':'<img src=x onerror=alert(1)>' if i == 1 else '', 'accessibility_answers':{'המעבר פנוי':'קיים'} if i == 1 else {},'interpretation':'','question':''} for i in range(1,12)])
        if 'FROM area_plans' in sql: return Rows([])
        if 'FROM report_photos' in sql: return Rows([{'id':'00000000-0000-0000-0000-000000000002','object_key':'private.jpg','caption':'Test photo','photographed_at':None}] if args[1]==1 else [])
        if 'FROM report_notes' in sql: return Rows([])
        raise AssertionError(sql)
class Body:
    def read(self, size):
        out=io.BytesIO();Image.new('RGB',(3,3),'red').save(out,format='JPEG');return out.getvalue()
class S3:
    def get_object(self,**kwargs): return {'Body':Body()}
class ExportTest(unittest.TestCase):
    def test_export_escapes_text_and_outputs_areas_and_photos(self):
        import boto3, psycopg
        env={'BPARK_EXPORT_ENABLED':'1','BPARK_READ_DATABASE_URL':'postgresql://test','AWS_ENDPOINT_URL_S3':'https://example.invalid','AWS_REGION':'eu-central-1','AWS_ACCESS_KEY_ID':'test','AWS_SECRET_ACCESS_KEY':'test'}
        with tempfile.TemporaryDirectory() as tmp, patch.dict(os.environ,env), patch.object(boto3,'client',return_value=S3()), patch.object(psycopg,'connect',return_value=DB()):
            before=os.getcwd();os.chdir(tmp)
            try:
                runpy.run_path(str(SCRIPT),run_name='__main__')
                text=next(Path('content/reports/generated').glob('*.md')).read_text()
                self.assertEqual(text.count('<div class="compare-grid">'),1)
                self.assertIn('<strong>סטטוס:</strong>',text)
                self.assertIn('<h4>נגישות</h4>',text)
                self.assertIn('&lt;script&gt;',text); self.assertNotIn('<script>',text)
                self.assertIn('Date: 2026-11-15 09:00',text)
                self.assertTrue(next(Path('content/images/published').glob('*.jpg')).is_file())
            finally: os.chdir(before)
if __name__=='__main__': unittest.main()

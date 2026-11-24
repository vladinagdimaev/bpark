AUTHOR = 'ולדי ואריאל'
SITENAME = 'גן בנימין | מעקב קהילתי'
SITEURL = ''
PATH = 'content'
TIMEZONE = 'Asia/Jerusalem'
DEFAULT_LANG = 'he'
THEME = 'theme'
ARTICLE_PATHS = ['reports']
ARTICLE_ORDER_BY = 'reversed-date'
STATIC_PATHS = ['images']
ARTICLE_URL = 'reports/{slug}/'
ARTICLE_SAVE_AS = 'reports/{slug}/index.html'
INDEX_SAVE_AS = 'index.html'
DIRECT_TEMPLATES = ['index']
DEFAULT_PAGINATION = False
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
RELATIVE_URLS = True

AREAS = ['מתקני הכושר', 'בין צמרות', 'משחק לפעוטות', 'מצללת מטפסים', 'רחבת נורדאו', 'המעיין הפועם', 'אזור נדנדות', 'דק הפרלמנט', 'שביל נגיש', 'פרגולות הזית והחורשה', 'חצר כלבים']

# Import approved, explicitly requested reports during the Render build.
# The exporter is a no-op without this opt-in; failures stop publication.
import os
if os.getenv('BPARK_EXPORT_ENABLED') == '1':
    import runpy
    exported = runpy.run_path('scripts/export_reports.py', run_name='__main__')
    LATEST_AREAS = exported['LATEST_AREAS']
    AREA_HISTORY = exported['AREA_HISTORY']
    REPORT_DETAILS = exported['REPORT_DETAILS']
    PARK_OVERVIEW_IMAGE = '/images/park-overview.jpg' if os.path.isfile('content/images/park-overview.jpg') else ''

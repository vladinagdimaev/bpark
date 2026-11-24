# גן בנימין · Django

אתר ציבורי וטופס שטח במערכת אחת. הדו״חות נשמרים ב־PostgreSQL. התמונות נשמרות בפורמט JPEG מוקטן באותו מסד בשלב זה, כדי לשמור אותן בין פריסות. יש לעקוב אחר נפח האחסון לפני שימוש שוטף.

## פיתוח

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
DJANGO_DEBUG=1 python manage.py runserver
python manage.py test
```

## פריסה

ב־Render יש להגדיר את `DATABASE_URL` של Neon ואת `SECRET_KEY` כמשתני סביבה מוגנים. פקודת הבנייה מתקינה תלויות ומריצה collectstatic. פקודת ההפעלה מריצה migrations ואז Gunicorn.

חשבון מנהל ראשוני אפשר ליצור עם `manage.py createsuperuser` מול המסד החדש בסביבה מורשית. במסך הניהול יוצרים חשבונות עורך ורכז ומעניקים לרכז את ההרשאה `park.publish_report`. מחבר הדו״ח שולח אותו לאישור. רכז אחר רואה כפתור פרסום או החזרה לטיוטה. ממשק הניהול מאפשר להעלות במשותף לכל הדו״חות הדמיה כללית ותמונה אחת לכל אזור. חשבונות ונתונים מהמערכת הקודמת דורשים מיגרציה נפרדת.

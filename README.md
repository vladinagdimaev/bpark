# גן בנימין — מעקב קהילתי

אתר סטטי המבוסס על Pelican. הדו״ח המצורף הוא טיוטה להמחשה ואינו מתפרסם אוטומטית.

## הרצה

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pelican content -s pelicanconf.py -o output
pelican --listen -o output
```

## פרסום דו״ח

צרו קובץ Markdown חדש בתיקייה `content/reports`, על בסיס `example.md`. עדכנו כותרת, תאריך, slug ותוכן; הסירו את שורת `Status: draft`. שמרו תמונות קבועות של העירייה ב־`content/images/municipality` ותמונות שטח ב־`content/images/reports`. השתמשו בתחביר `![תיאור משמעותי]({static}/images/municipality/example.jpg)` כדי לקשר לתמונה. ציינו בתוכן את תאריך הביקור, מיקום הצילום ומקור חומרי התכנון. הריצו את פקודת הבנייה מחדש בכל עדכון.

קבצי Markdown רגילים מציגים תמונות בזו אחר זו. להצגה זה לצד זה בדו״ח ניתן להשתמש ב־HTML בתוך Markdown:

```html
<div class="compare-grid">
  <figure><img src="/images/municipality/plan.jpg" alt="תיאור התוכנית"><figcaption>תכנון העירייה</figcaption></figure>
  <figure><img src="/images/reports/photo.jpg" alt="תיאור השטח"><figcaption>צילום מהביקור, תאריך</figcaption></figure>
</div>
```

התאימו נתיבי תמונות לכתובת האתר בפועל. אל תפרסמו את הטיוטה עד שיהיו נתונים ותמונות אמיתיים.

## מבנה הדו״ח

התבנית כוללת את 11 האזורים הקבועים, כניסות, נגישות ותשתיות וסיכום לביקור הבא. לכל אזור ממלאים מצב, שינוי וממצאים; משאירים ״לא נבדק״ כאשר לא נבדק. להוספת תמונות החליפו את טקסט ההמחשה בתוך כל figure בתג `img` עם כתובת ותיאור חלופי, וציינו תאריך ומקור בכיתוב. לדוגמה:

```html
<figure><figcaption>תכנון העירייה — מקור: עיריית חיפה</figcaption><img src="{static}/images/municipality/plan.jpg" alt="תיאור ההדמיה"></figure>
```

אפשר להשתמש בתחביר Pelican `{static}` גם בתוך HTML. מומלץ לבדוק שהקבצים מוצגים בבנייה לפני פרסום. רשימת האזורים בדף הראשי מוגדרת ב־`pelicanconf.py`; יש לעדכן גם את תבנית הדו״ח אם משנים אותה.

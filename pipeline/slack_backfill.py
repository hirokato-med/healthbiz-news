"""Slack #03-加藤のニュース解説 の投稿を、アプリの記事 JSON に変換する。

使い方: python3 -I to_articles.py messages.json existing_articles.json > backfill.json
"""
import json, re, sys

WD = '月火水木金土日'
M = json.load(open(sys.argv[1], encoding='utf-8'))
existing = {a['source_url'] for a in json.load(open(sys.argv[2], encoding='utf-8'))['articles']} if len(sys.argv) > 2 else set()

URL_RE = re.compile(r'<(https?://[^|>]+)(?:\|[^>]*)?>|(?<![<\w])(https?://[^\s<>）」]+)')
RULE = '─'


def urls_in(text):
    out = []
    for m in URL_RE.finditer(text):
        u = (m.group(1) or m.group(2)).rstrip('。、）)')
        if u not in out:
            out.append(u)
    return out


def strip_urls(text):
    return re.sub(r'<https?://[^>]+>|https?://[^\s<>）」]+', '', text)


def clean(text):
    text = text.replace('　', ' ').replace('\t', '')
    lines = [l.rstrip() for l in text.split('\n')]
    out, blank = [], False
    for l in lines:
        if l.strip() == '':
            if not blank and out:
                out.append('')
            blank = True
        else:
            out.append(l.strip())
            blank = False
    return '\n'.join(out).strip()


def sentences(text):
    text = re.sub(r'\s+', ' ', text)
    parts = [s.strip() for s in re.split(r'(?<=[。！？])', text) if s.strip()]
    return parts


def categorize(title, facts):
    t = title + ' ' + facts[:120]
    if re.search(r'厚労省|厚生労働省|中医協|診療報酬|保険収載|法改正|規制|経産省|デジタル庁|閣議|審議会|政府', title):
        return 'policy'
    rules = [
        ('longevity', r'ロンジェビティ|Longevity|長寿|老化|健康寿命|アンチエイジング|フレイル|若返り'),
        ('wearable', r'ウェアラブル|スマートウォッチ|スマートリング|センサー|Apple Watch|指輪|イヤホン|補聴器|見守り'),
        ('drug', r'製薬|医薬品|創薬|治験|薬価|承認申請|市販薬|OTC|ワクチン|抗体|核酸|製剤|第[IⅠ123]相|ファーマ|バイオ'),
        ('device', r'医療機器|内視鏡|手術支援|ロボット|画像診断|検査装置|透析|カテーテル|インプラント|超音波|CT|MRI|AIメディカル'),
        ('digital', r'電子カルテ|オンライン診療|アプリ|AI|DX|SaMD|DTx|クラウド|生成|データ|プラットフォーム|ソフトウェア|レセコン|問診|遠隔'),
    ]
    for cat, pat in rules:
        if re.search(pat, t):
            return cat
    return 'service'


def parse_company(body):
    """＜社名＞ブロックと ▸代表 行を取り出し、残りの本文を返す"""
    company = None
    m = re.search(r'＜(.+?)＞\n([\s\S]*?)(?=\n\n|\Z)', body)
    if m:
        name = m.group(1).strip()
        block = m.group(2)
        profile = strip_urls(block).strip()
        url = (urls_in(block) or [None])[0]
        company = {'name': name, 'profile': re.sub(r'\s*\n\s*', '', profile), 'url': url, 'ceo': None}
        body = body[: m.start()] + body[m.end():]
    c = re.search(r'▸\s*([^：:\n]+)[：:]\s*([^\n]+)\n?([\s\S]*?)(?=\n\n|\Z)', body)
    if c and company:
        company['ceo'] = {'name': c.group(2).strip(), 'bio': re.sub(r'\s*\n\s*', '', c.group(3).strip()) or '経歴確認できない'}
        body = body[: c.start()] + body[c.end():]
    elif c:
        body = body[: c.start()] + body[c.end():]
    return company, body


def split_facts_comment(body, fmt):
    body = clean(body)
    if fmt in ('weekly', 'july'):
        m = re.search(r'加藤コメント[：:]\s*', body)
        if m:
            facts, comment = body[: m.start()], body[m.end():]
        else:
            facts, comment = '', body
        comment = re.sub(r'＜今週の深堀り！?＞', '\n＜深堀り＞', comment)
        return clean(facts), clean(comment)
    paras = [p for p in body.split('\n\n') if p.strip()]
    if len(paras) >= 2:
        idx = next((i for i, p in enumerate(paras) if '自分が注目' in p or '注目したのは' in p), None)
        if idx is None:
            idx = len(paras) - 1
        return clean('\n\n'.join(paras[:idx])), clean('\n\n'.join(paras[idx:]))
    return '', clean(body)


def make_article(date, title, body, fmt):
    urls = urls_in(body)
    company, body = parse_company(body)
    body = strip_urls(body)
    facts, comment = split_facts_comment(body, fmt)
    summary = sentences(facts)[:3]
    # 事実部分が無い（コメントだけ）のときは、コメントの先頭文を要約に回さず、要約は空のまま
    comment = comment or facts
    src = next((u for u in urls if 'prtimes.jp' in u), urls[0] if urls else None)
    if not src:
        return None
    others = [u for u in urls if u != src and not (company and u == company.get('url'))]
    art = {
        'published_date': date,
        'category': categorize(title, facts or comment),
        'title': title,
        'source_name': (guess_source(title, facts) if fmt == 'daily' else (guess_source('', facts) or guess_source(title))),
        'source_url': src,
        'summary': summary,
        'comment': comment,
    }
    if others:
        art['source_url_2'] = others[0]
    if company:
        art['company'] = company
    return art


def label_links(text):
    return re.sub(r'<https?://[^|>]+\|([^>]+)>', r'\1', text)


def guess_source(title, facts=''):
    m = re.match(r'([^、，,：:（(×／/]+)', title)
    s = (m.group(1) if m else title).strip()
    # 「医療AIのアイリス」「医師起業のGENSHI AI」→ 最後の「の」の後ろ
    if 'の' in s and not re.search(r'(株式会社|大学|病院|法人|省|市|区|県)$', s):
        s = s.rsplit('の', 1)[1]
    s = re.sub(r'^(株式会社|合同会社|一般社団法人|公益財団法人|医療法人社団|医療法人)\s*', '', s)
    s = re.sub(r'\s*(株式会社|Inc\.|Pte\. Ltd\.)$', '', s)
    if not s and facts:
        f = re.match(r'([^、，,。がはの（(]+)', facts)
        s = f.group(1).strip() if f else ''
    return s[:30]


def parse_daily(m):
    text = m['text']
    d = re.search(r'【(\d{1,2})/(\d{1,2})', text)
    date = f"2026-{int(d.group(1)):02d}-{int(d.group(2)):02d}" if d else m['date']
    out = []
    pat = re.compile(RULE + r'{5,}\n([①②③④⑤⑥⑦⑧⑨⑩])\s*(.+?)\n' + RULE + r'{5,}\n')
    heads = list(pat.finditer(text))
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        body = text[h.end():end]
        a = make_article(date, label_links(h.group(2).strip()), body, 'daily')
        if a:
            out.append(a)
    return out


def parse_weekly(m, fmt):
    text = m['text']
    date = m['date']
    pat = re.compile(r'(?m)^\s*(?:【重要】\s*\n)?\s*■\s*(\d+)[．.、]\s*(.+)$')
    heads = list(pat.finditer(text))
    out = []
    for i, h in enumerate(heads):
        end = heads[i + 1].start() if i + 1 < len(heads) else len(text)
        body = text[h.end():end]
        body = re.sub(r'(?m)^\s*【重要】\s*$', '', body)
        a = make_article(date, label_links(h.group(2).strip()), body, fmt)
        if a:
            out.append(a)
    return out


articles = []
for m in M:
    t = m['text']
    if RULE * 5 in t and re.search(r'[①②③④⑤⑥⑦⑧⑨⑩]', t):
        articles += parse_daily(m)
    elif '【今週のヘルスケアビジネス注目ニュース' in t:
        fmt = 'july' if '事業機会メモ' in t else 'weekly'
        articles += parse_weekly(m, fmt)

# 同じ原文は新しい投稿を優先し、すでにアプリにあるものは除く
seen = {}
for a in articles:
    if a['source_url'] in existing:
        continue
    seen[a['source_url']] = a
articles = list(seen.values())
json.dump({'articles': articles}, sys.stdout, ensure_ascii=False, indent=2)
print(f"\n{len(articles)} articles", file=sys.stderr)

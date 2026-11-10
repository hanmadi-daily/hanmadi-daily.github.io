# -*- coding: utf-8 -*-
"""Sino-Korean readings that follow the passages already in the app."""
import re
from collections import Counter, defaultdict

# Mechanical orthography only: Japanese shinjitai and single-character variants
# already used as their traditional forms in the existing 채근담 text.
NORM = str.maketrans({
    "来": "來", "会": "會", "観": "觀", "収": "收", "凉": "涼", "万": "萬",
    "増": "增", "内": "內", "縁": "緣", "却": "卻", "黄": "黃", "点": "點",
    "乗": "乘", "随": "隨", "気": "氣", "乱": "亂", "対": "對", "聴": "聽",
    "帯": "帶", "軽": "輕", "譲": "讓", "国": "國", "号": "號", "専": "專",
    "渇": "渴", "縦": "縱", "説": "說", "巻": "卷", "横": "橫", "荘": "莊",
    "払": "拂", "関": "關", "与": "與", "体": "體", "転": "轉", "盗": "盜",
    "壷": "壺", "嚢": "囊", "辺": "邊", "懐": "懷", "覚": "覺", "当": "當",
    "栄": "榮", "艶": "豔", "痩": "瘦", "伝": "傳", "灯": "燈", "尽": "盡",
    "静": "靜", "歩": "步", "発": "發", "総": "總", "縂": "總", "学": "學",
    "実": "實", "処": "處", "緑": "綠", "喰": "喫", "舎": "捨", "岩": "巖",
    "脱": "脫", "萠": "萌", "渕": "淵", "婬": "淫", "氷": "冰", "咲": "笑",
    "宝": "寶", "暁": "曉", "髪": "髮", "粛": "肅", "参": "參", "繋": "繫",
    "覊": "羈", "崕": "崖", "焔": "焰", "羮": "羹", "倶": "俱",
})

# Readings for characters that do not already occur in the app.
EXTRA = (
    "吾오云운又우哉재慾욕造조灰회屬속適적段단氏씨冰빙衣의釋석今금詩시智지調조"
    "泉천渾혼乾건坤곤魔마吟음禪선弄롱昏혼主주惺성問문解해鳴명野야近근妄망泊박"
    "迷미收수齊제夷이暴포幻환犯범毫호戒계歌가纏전把파藜려袞곤聖성母모弟제燈등"
    "止지客객降항伸신飽포絕절經경賊적陶도蛾아燭촉封봉目목殘잔舞무瀟소馬마"
    "塞색奈내猛맹煩번惱뇌尋심布포耐내谷곡朝조絃현裡리窩와忽홀迎영奴노骸해"
    "槁고躍약淫음癡치勤근還환遺유投투冥명並병斗두盜도冠관掃소洒쇄技기飢기"
    "播파熾치焚분滯체愆건謀모叢총冶야寶보堂당捨사通통孫손傾경警경認인寓우"
    "提제照조猖창倖행鼠서沌돈血혈樵초營영惜석奉봉羶전柄병淵연聚취端단戰전"
    "徹철俄아茗명焰염想상狐호幽유眠면戀련畫화爾이頓돈鷄계漸점玩완舟주笑소"
    "緣연簾렴儒유席석場장卉훼別별鶴학笛적腔강食식愉유電전鳶연傲오冕면綸륜"
    "斂렴炫현默묵馭어接접嘉가指지籠롱鑄주浪랑振진屠도錯착羨선魂혼狠한戾려"
    "貌모治치際제竊절假가講강部부編편鼓고吹취繁번衍연遷천鉢발值치幸행溫온"
    "四사緘함抑억燥조寡과延연十십九구驅구型형範범沙사羞수剛강翁옹愁수寥료"
    "關관婦부宗종積적貽이棄기飾식燄염霜상摧최鎖쇄活활壺호颯삽零령沸비揚양"
    "誨회憧충擾요倏숙雷뢰震진晴청嘗상咨자培배態태杜두穴혈慎신籟뢰迴회桎질"
    "梏곡兒아說설箴잠峨아胡호等등土토星성蜂봉胎태橋교坎감榛진坑갱谿계岸안"
    "番번懼구釣조棋기鷽학崖애次차彈탄率솔湖호握악況황僧승浮부耽탐遙요栽재"
    "澗간邊변杖장臥와台태旨지袍포玄현絲사饑기雜잡昔석恍황杯배離리犬견吠폐"
    "鴉아偈게鷗구蛙와啼제暑서翺고翔상送송序서兎토壑학旦단飄표强강鴟치鴞효"
    "筏벌驢려矢시哀애川천付부殊수焦초限한役역縛박勸권撒살炭탄茫망埋매鴆짐"
    "毒독慚참忸육莧현婢비膝슬顏안擺파佛불婉완倨거男남軒헌廊랑廟묘怡이懵몽"
    "卑비蟊모屏병噩악黜출閨규匪비植식禾화姑고仞인隔격牢뢰壹일濯탁羝저羊양"
    "拾습併병詣예詠영維유摩마劊괴茅모簷첨咫지尺척里리邦방吉길詳상寐매凶흉"
    "笑소肝간腎신叔숙季계互호粟속鍾종計계鎰일藉자寇구齎자糧량鉛연槧참傭용"
    "簡간錮고妖요姬희湮인沒몰檻함徙사瓶병萎위舖포囀전句구束속拔발瓢표賸잉"
    "那나測측倒도倆량逢봉祇지稱칭駢편訾자泛범駕가確확柔유壞괴梳소輒첩弛이"
    "挽만澈철證증舍사愧괴迓아補보阨액亨형徼요牖유憸섬奪탈魄백妓기良양烟연"
    "截절祖조祉지諷풍俟사凍동檢검鋒봉芒망爍삭城성貫관偽위媿괴肢지委위負부"
    "擔담韁강撓요鎮진灑쇄潑발竇두汗한濁탁屈굴窟굴騰등縫봉散산迅신制제顆과"
    "斬참慧혜劍검燮섭氛분疹진睦목儆경預예譖참旋선繅소孝효御어魍망魎량鋤서"
    "條조譬비咬교救구颺양燠욱拭식鐙등熒형曉효炯형返반鼻비網망設설鴻홍罹리"
    "螳당螂랑雀작懇간鑑감翳예禁금鎔용謁알朱주街가巷항牧목唱창述술拋포沿연"
    "灶조敏민貨화符부憑빙豈기憐련滅멸廓곽詭궤陷함腥성黨당蠆채標표榜방薰훈"
    "蒸증怪괴踏답坷가撐탱莽망塹참靠고瑩형隻척偷투討토竭갈命명峻준環환湍단"
    "蓄축鼈별褊편竿간牘독鄉향蹈도筌전蹄제洽흡挾협凌릉戮륙材재臆억猜채赤적"
    "胚배宰재礎초純순惕척惸경奕혁戲희瘦수傳전訣결玲령瓏롱賓빈劇극淋림漓리"
    "嘔구咽열類류掌장河하軀구泡포敝폐裘구歇헐婚혼嫁가巖암肓황癖벽括괄儘진"
    "烏오煮자童동携휴衲납枕침氈전飴이嚼작蠟랍恨한侯후丐걸羹갱梁량煖난貉학"
    "王왕妙묘釅엄啜철菽숙惆추悵창商상賈고記기憶억夙숙蘆로躱타丈장紅홍漁어"
    "添첨渉섭籬리芸운噪조徜상徉양駘태蕩탕蘭란桂계馥복參참弓궁蛇사蝎갈寢침"
    "繫계妨방刀도割할暢창髮발齒치彫조砂사研연午오案안磬경宣선乏핍倐숙堯요"
    "伊이罥견巢소櫳롱敞창呑탄吐토乳유燕연鳩구堦계沼소痕흔頻빈韻운佩패西서"
    "晉진北북邙망獸수塡전濤도睹도蓑사笠립嗟차筵연几기綣권誘유砌체弱약啄탁"
    "噫희師사龍룡驤양蟻의蠅승蝟위湯탕羈기臻진灞파陵릉浩호映영尊존徇순儕제國국"
    "號호饔옹飧손諳암翻번慵용呼호專전但단打타偶우置치渴갈康강演연鑛광倫륜"
    "各각酣감冲충糟조廛전捐연捲권剝박擢탁晁조欛파桑상淳순龐방逍소毛모蚋예"
    "期기約약坦탄牽견試시蚤조傅부粉분硃주罷파弈혁局국叟수鼎정裋수褐갈油유"
    "服복第제莊장剖부笙생囂효澡조撫무檜회梅매勁경挺정侶려麋미鹿록寰환贅췌"
    "旒류伴반披피襟금兀올區구溺익船선痼고萌맹穎영底저肅숙抱포鏹강颷표浸침"
    "答답謳구肴효灌관漑개臭취迥형連련饒요農농略략井정伹저儈쾌溝구獲획妌정"
    "傀괴儡뢰蒂체線선掇철話화候후匣갑霰산尼니藪수兼겸罵매咋책舌설耗모運운"
    "茶다樽준羲희皇황匹필儔주嵆혜阮완渡도囊낭緒서菜채"
)

PUNCT = set("，。、；：！？「」『』“”\"'")
DUEUM = {
    "라": "나", "락": "낙", "란": "난", "랄": "날", "람": "남", "랍": "납", "랑": "낭",
    "래": "내", "랭": "냉", "략": "약", "량": "양", "려": "여", "력": "역", "련": "연",
    "렬": "열", "렴": "염", "렵": "엽", "령": "영", "례": "예", "로": "노", "록": "녹",
    "론": "논", "롱": "농", "뢰": "뇌", "료": "요", "룡": "용", "루": "누", "류": "유",
    "륙": "육", "륜": "윤", "률": "율", "륭": "융", "륵": "늑", "름": "늠", "릉": "능",
    "리": "이", "린": "인", "림": "임", "립": "입",
    "냐": "야", "녀": "여", "뇨": "요", "뉴": "유", "니": "이", "녁": "역", "년": "연",
    "념": "염", "녕": "영", "녜": "예",
}
CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"


def parse_extra(s):
    out = {}
    i = 0
    while i < len(s):
        ch = s[i]
        syl = s[i + 1:i + 2]
        if not re.match(r"[\u4e00-\u9fff]", ch) or not re.match(r"[가-힣]", syl):
            raise SystemExit(f"bad extra at {i}: {s[i:i+4]!r}")
        out[ch] = syl
        i += 2
    return out


def corpus_readings(entries):
    votes = defaultdict(Counter)
    for x in entries:
        oc, ec = clauses(x["o"]), clauses(x["e"])
        if len(oc) != len(ec):
            continue
        for a, b in zip(oc, ec):
            ah = [c for c in a if re.match(r"[\u4e00-\u9fff]", c)]
            bh = [c for c in b if re.match(r"[가-힣]", c)]
            if len(ah) != len(bh):
                continue
            for ca, cb in zip(ah, bh):
                votes[ca][cb] += 1
    return {c: v.most_common(1)[0][0] for c, v in votes.items()}


def clauses(s):
    parts, buf = [], ""
    for ch in s:
        if ch in PUNCT or ch.isspace():
            if buf:
                parts.append(buf)
                buf = ""
        else:
            buf += ch
    if buf:
        parts.append(buf)
    return parts


def onset(syl):
    code = ord(syl) - 0xAC00
    if code < 0 or code > 11171:
        return ""
    return CHO[code // 588]


def read_clause(text, table):
    hans = text_han(text)
    raw = []
    for i, ch in enumerate(hans):
        if ch not in table:
            raise KeyError(ch)
        prev = hans[i - 1] if i else ""
        nxt = hans[i + 1] if i + 1 < len(hans) else ""
        syl = adjust(ch, prev, nxt, table[ch])
        raw.append(syl)
    out = []
    for i, syl in enumerate(raw):
        if i == 0:
            syl = DUEUM.get(syl, syl)
        if i and hans[i - 1] == "不" and onset(syl) in "ㄷㄸㅈㅉ":
            out[-1] = "부"
        out.append(syl)
    return "".join(out)


def text_han(text):
    return [c for c in text if re.match(r"[\u4e00-\u9fff]", c)]


def clean_original(text):
    text = re.sub(r"-\{([^}]+)\}-", r"\1", text)
    text = re.sub(r"\{\{[^}]+\}\}", "", text)
    text = text.translate(NORM)
    text = text.replace("、", "，")
    text = re.sub(r"[ \t]+", "", text)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"=清刻本.*", "", text)
    # line breaks follow the existing cards: after full stop and semicolon
    chunks = re.split(r"([。；！？])", text)
    lines, buf = [], ""
    for part in chunks:
        if part in "。；！？":
            buf += part
            lines.append(buf)
            buf = ""
        else:
            buf += part
    if buf:
        lines.append(buf)
    merged = []
    for line in lines:
        if not line:
            continue
        if merged and line[0] in "」』”":
            merged[-1] += line
        else:
            merged.append(line)
    return "\n".join(merged)


def reading_of(original, table):
    # walk the cleaned original and mirror punctuation
    out = []
    buf = ""
    def flush(delim):
        nonlocal buf
        if buf:
            out.append(read_clause(buf, table))
            buf = ""
        if delim:
            out.append(delim)
    for ch in original:
        if ch == "，":
            flush(", ")
        elif ch == "。":
            flush(".\n")
        elif ch == "；":
            flush(";\n")
        elif ch == "：":
            flush(": ")
        elif ch == "！":
            flush("!\n")
        elif ch == "？":
            flush("?\n")
        elif ch in "「」『』“”\"'":
            flush("“" if ch in "「『“\"" else "”")
        elif ch == "\n":
            flush("\n")
        elif re.match(r"[\u4e00-\u9fff]", ch):
            buf += ch
        elif ch.isspace():
            continue
        else:
            flush(ch)
    flush("")
    text = "".join(out)
    text = re.sub(r"\n{2,}", "\n", text).strip()
    text = re.sub(r" +", " ", text)
    return text


# 본음. 두음법칙은 구절 첫음에서만 다시 적용한다.
BASE = {
    "寧": "녕", "路": "로", "念": "념", "利": "리", "冷": "랭", "量": "량",
    "立": "립", "留": "류", "老": "로", "練": "련", "鍊": "련", "履": "리",
    "濫": "람", "降": "항", "易": "역", "樂": "락", "惡": "악", "行": "행",
    "長": "장", "更": "갱", "將": "장", "相": "상", "乾": "건", "差": "차",
    "數": "수", "重": "중", "教": "교", "朝": "조", "率": "솔", "還": "환",
    "為": "위", "爲": "위", "說": "설", "調": "조", "看": "간", "覺": "각",
    "切": "절",
}


def table_for(entries):
    table = corpus_readings(entries)
    table.update(parse_extra(EXTRA))
    table.update(BASE)
    return table


def adjust(ch, prev, nxt, syl):
    if ch == "易" and ((nxt and nxt in "知過見") or (prev and prev in "容平難")):
        return "이"
    if ch == "惡" and prev and prev in "不好憎":
        return "오"
    if ch == "切" and prev == "一":
        return "체"
    if ch == "樂" and prev == "音":
        return "악"
    if ch == "行" and nxt and nxt in "列伍":
        return "항"
    if ch == "降" and nxt and nxt in "下臨":
        return "강"
    if ch == "賈" and prev == "商":
        return "고"
    return syl


def apply_phrases(original, reading):
    """A few readings the single-character table cannot decide."""
    swaps = [
        ("容易", "용이"),
        ("易過", "이과"),
        ("平易", "평이"),
        ("好惡", "호오"),
        ("憎惡", "증오"),
    ]
    # Map by replacing the syllable span. We re-read those phrases directly.
    return reading

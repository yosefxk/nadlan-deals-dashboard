import re
import sqlite3
from pathlib import Path
from typing import Optional, List, Tuple

_db_settlements: set[str] = set()
_norm_map: dict[str, list[str]] = {}
_initialized: bool = False

COMMON_ALIASES: dict[str, list[str]] = {
    'תל אביב': ['תל אביב -יפו'],
    'תל אביב יפו': ['תל אביב -יפו'],
    'תל-אביב': ['תל אביב -יפו'],
    'ת"א': ['תל אביב -יפו'],
    'תא': ['תל אביב -יפו'],
    'פתח תקוה': ['פתח תקווה'],
    'פ"ת': ['פתח תקווה'],
    'פת': ['פתח תקווה'],
    'הרצליה': ['הרצלייה'],
    'מודיעין': ['מודיעין-מכבים-רעות', 'מודיעין עילית'],
    'מודיעין מכבים רעות': ['מודיעין-מכבים-רעות'],
    'מכבים רעות': ['מודיעין-מכבים-רעות'],
    'מכבים': ['מודיעין-מכבים-רעות'],
    'רעות': ['מודיעין-מכבים-רעות'],
    'פרדס חנה': ['פרדס חנה-כרכור'],
    'כרכור': ['פרדס חנה-כרכור'],
    'ראשון לציון': ['ראשון לציון'],
    'ראשל"צ': ['ראשון לציון'],
    'ראשלצ': ['ראשון לציון'],
    'באר שבע': ['באר שבע'],
    'ב"ש': ['באר שבע'],
    'בש': ['באר שבע'],
    'יהוד': ['יהוד-מונוסון', 'יהוד'],
    'נווה מונוסון': ['יהוד-מונוסון'],
    'מונוסון': ['יהוד-מונוסון'],
    'נוף הגליל': ['נוף הגליל'],
    'נצרת עילית': ['נוף הגליל'],
    'רמת השרון': ['רמת השרון'],
    'רמה"ש': ['רמת השרון'],
    'הוד השרון': ['הוד השרון'],
    'הודה"ש': ['הוד השרון'],
}

def normalize_settlement(s: str) -> str:
    s = s.strip()
    s = s.replace('יי', 'י').replace('וו', 'ו')
    s = s.replace('קריית', 'קרית')
    s = re.sub(r'[\"\'\-]', ' ', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def _init_settlements():
    global _db_settlements, _norm_map, _initialized
    if _initialized:
        return
    try:
        db_path = Path(__file__).resolve().parent.parent / "data" / "deals.db"
        if db_path.exists():
            conn = sqlite3.connect(str(db_path))
            cur = conn.cursor()
            try:
                cur.execute("SELECT settlement FROM settlements_summary WHERE settlement IS NOT NULL AND settlement != ''")
                rows = cur.fetchall()
            except Exception:
                cur.execute("SELECT DISTINCT settlement FROM deals WHERE settlement IS NOT NULL LIMIT 2000")
                rows = cur.fetchall()
            conn.close()

            _db_settlements = {r[0] for r in rows if r[0]}
            for s in _db_settlements:
                n = normalize_settlement(s)
                if n not in _norm_map:
                    _norm_map[n] = []
                _norm_map[n].append(s)
            _initialized = True
    except Exception:
        pass

def get_city_variants(city: str) -> list[str]:
    """
    Returns all valid variants and canonical database spellings for a given city name.
    Prioritizes actual settlement names stored in the database.
    """
    if not city:
        return []
    _init_settlements()
    raw = city.strip()
    if not raw:
        return []

    variants: set[str] = set()
    variants.add(raw)

    # 1. Direct alias dictionary lookup
    if raw in COMMON_ALIASES:
        variants.update(COMMON_ALIASES[raw])

    # 2. Normalized alias & normalized match against known settlements
    n_in = normalize_settlement(raw)
    if n_in in COMMON_ALIASES:
        variants.update(COMMON_ALIASES[n_in])
    if n_in in _norm_map:
        variants.update(_norm_map[n_in])

    # 3. Hebrew orthographic & phonetic variations
    synonyms = [raw]
    if 'יי' in raw:
        synonyms.append(raw.replace('יי', 'י'))
    if 'י' in raw:
        synonyms.append(raw.replace('י', 'יי'))
    if 'וו' in raw:
        synonyms.append(raw.replace('וו', 'ו'))
    if 'ו' in raw:
        synonyms.append(raw.replace('ו', 'וו'))
    if 'קרית ' in raw:
        synonyms.append(raw.replace('קרית ', 'קריית '))
    if 'קריית ' in raw:
        synonyms.append(raw.replace('קריית ', 'קרית '))
    if ' - ' in raw:
        synonyms.extend([raw.replace(' - ', ' -'), raw.replace(' - ', '-'), raw.replace(' - ', ' ')])
    elif ' -' in raw:
        synonyms.extend([raw.replace(' -', ' - '), raw.replace(' -', '-'), raw.replace(' -', ' ')])
    elif '-' in raw:
        synonyms.extend([raw.replace('-', ' - '), raw.replace('-', ' -'), raw.replace('-', ' ')])

    for syn in synonyms:
        variants.add(syn)
        if syn in _db_settlements:
            variants.add(syn)
        n_syn = normalize_settlement(syn)
        if n_syn in _norm_map:
            variants.update(_norm_map[n_syn])

    # 4. Composite / prefix matches against known settlements (e.g. 'תל אביב' -> 'תל אביב -יפו')
    if len(raw) >= 3 and _db_settlements:
        for s in _db_settlements:
            if s.startswith(raw + '-') or s.startswith(raw + ' -') or s.startswith(raw + ' '):
                variants.add(s)
            elif n_in and normalize_settlement(s).startswith(n_in + ' '):
                variants.add(s)

    # Order results: priority to actual db settlements, followed by other variants
    db_matches = [v for v in variants if v in _db_settlements]
    other_matches = [v for v in variants if v not in _db_settlements]
    return db_matches + other_matches

def resolve_canonical_settlement(city: str) -> str:
    """
    Given any user city spelling (e.g. 'הרצליה', 'תל אביב', 'פתח תקוה'),
    returns the exact canonical spelling in the database ('הרצלייה', 'תל אביב -יפו', 'פתח תקווה').
    """
    variants = get_city_variants(city)
    return variants[0] if variants else city

def clean_street_and_house(street_in: Optional[str], house_in: Optional[str] = None) -> Tuple[str, Optional[str]]:
    """
    Parses street name and house number from raw inputs:
    - Strips leading 'רחוב ' or 'רח' '
    - Automatically extracts trailing house numbers if house wasn't provided separately
      (e.g., 'מכבי 22' -> street='מכבי', house='22')
    """
    if not street_in:
        return '', house_in

    s = street_in.strip()
    h = house_in.strip() if house_in else None

    # Strip leading רחוב or רח'
    s = re.sub(r'^(רחוב|רח\'?)\s+', '', s).strip()

    # If house number was not provided separately, check if street ends with house number
    if not h:
        m = re.match(r'^(.*?)\s+(\d+[\s\w]*)$', s)
        if m:
            s_cand = m.group(1).strip()
            h_cand = m.group(2).strip()
            if len(s_cand) >= 2:
                s = s_cand
                h = h_cand

    return s, h

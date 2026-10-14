"""Build data.js from source/rich.json (public sources gathered 2026-10-11).

Collapses the 15 fine-grained tags into 7 site topics, marks first/last-author papers,
and writes the profile text. Usage: python3 build-data.py
"""
import json
from pathlib import Path

HERE = Path(__file__).parent
src = json.loads((HERE / "source/rich.json").read_text())

TOPICS = [
    ("econ", "Costs & economic evaluation",
     "What infections, chronic disease and new programs cost, and whether they are worth it."),
    ("hai", "Infections & antimicrobial resistance",
     "The burden of MRSA, C. difficile and resistant organisms, and the value of infection prevention."),
    ("home", "Homelessness & housing",
     "How SSVF, rapid rehousing and financial assistance change veterans' housing and health."),
    ("sub", "Social needs & substance use",
     "Food insecurity, alcohol and opioid use disorder, and access to treatment."),
    ("covid", "COVID-19",
     "Policy and economics of the pandemic response, from schools to vaccination."),
    ("vet", "Clinical care & outcomes",
     "Collaborations in surgery, oncology, pediatrics and chronic disease care."),
    ("meth", "Methods",
     "Methods for cost estimation, matching and evaluation with observational data."),
]
TAG_MAP = {
    "cost-effectiveness": "econ", "healthcare costs / utilization": "econ",
    "infection control / AMR": "hai", "antimicrobial stewardship": "hai",
    "homelessness / housing": "home",
    "social needs / food insecurity": "sub", "opioids / substance use": "sub",
    "COVID-19": "covid",
    "chronic disease": "vet", "surgery / orthopedics": "vet", "oncology": "vet",
    "maternal / child health": "vet", "telehealth / rural health": "vet",
    "methods": "meth",
}


def is_nelson(a):
    a = a.strip()
    return a in ("Nelson RE", "Nelson R", "RE Nelson", "R Nelson", "RE Nelson Jr")


def lead(authors):
    names = [a.strip() for a in authors.split(",")]
    return is_nelson(names[0]) or (names[-1] not in ("...", "…") and is_nelson(names[-1]))


pubs = []
for p in src["papers"]:
    topics = []
    for t in p["topics"]:
        m = TAG_MAP.get(t)
        if m and m not in topics:
            topics.append(m)
    if not topics:  # tagged only "veterans health"
        topics = ["vet"]
    pubs.append({
        "title": p["title"], "authors": p["authors"], "year": p["year"], "venue": p.get("venue") or "",
        "citations": p.get("citations"), "url": p.get("url") or "", "topics": topics, "lead": lead(p["authors"]),
    })
pubs.sort(key=lambda p: (-p["year"], -(p["citations"] or 0)))

grants = [{
    "title": g["title"], "years": g["years"].replace("-", "–"),
    "funder": f'{g["funder"]} {g["number"]}', "role": g["role"],
} for g in src["grants"]]

# Research timeline: grants plus the most-cited paper from each stretch of years.
career = [{"kind": "grant", "start": int(g["years"][:4]), "end": int(g["years"][-4:]),
           "title": g["title"], "where": f'{g["funder"]} · {g["role"]}'} for g in src["grants"]]
for lo, hi in [(2008, 2012), (2013, 2016), (2017, 2019), (2020, 2022), (2023, 2026)]:
    ps = [p for p in pubs if lo <= p["year"] <= hi and p["citations"]]
    if ps:
        top = max(ps, key=lambda p: p["citations"])
        career.append({"kind": "paper", "start": top["year"], "end": top["year"], "title": top["title"],
                       "where": f'{top["venue"]} · {top["citations"]:,} citations'})
first_home = min((p for p in pubs if "home" in p["topics"]), key=lambda p: p["year"])
career.append({"kind": "paper", "start": first_home["year"], "end": first_home["year"], "title": first_home["title"],
               "where": f'{first_home["venue"]} · first paper on homelessness'})

s = src["scholar"]
profile = {
    "name": "Richard E. Nelson, PhD",
    "kicker": "Health economics · Veterans health",
    "lede": "Health economist studying what infections and chronic disease cost, and how housing "
            "programs change the health of veterans.",
    "roles": [
        "Professor of Internal Medicine (Epidemiology), University of Utah",
        "Investigator, IDEAS Center, VA Salt Lake City Health Care System",
        "Co-Director, Health Economics Core, Utah CTSI",
    ],
    "links": [
        {"label": "Email", "url": "mailto:" + src["email"]},
        {"label": "Google Scholar", "url": s["profile_url"]},
        {"label": "University of Utah", "url": "https://medicine.utah.edu/faculty/richard-e-nelson"},
        {"label": "PubMed", "url": "https://pubmed.ncbi.nlm.nih.gov/?term=Nelson+RE%5BAuthor%5D+AND+%28Salt+Lake+City%5BAffiliation%5D+OR+Utah%5BAffiliation%5D%29"},
    ],
    "stats": [
        {"value": f'{s["citations_all"]:,}', "label": "citations"},
        {"value": str(s["h_index_all"]), "label": "h-index"},
        {"value": f'{src["pubmed"]["count"]}+', "label": "publications"},
        {"value": str(len(src["grants"])), "label": "grants as PI"},
    ],
    "bio": [
        "Richard Nelson is a health economist and Professor of Internal Medicine at the University of Utah, "
        "where he co-directs the Health Economics Core of the Clinical and Translational Science Institute. "
        "He is also an investigator at the IDEAS Center at the VA Salt Lake City Health Care System.",
        "His early work, including a VA HSR&D Career Development Award, measured the costs and consequences of "
        "healthcare-associated infections such as MRSA, C. difficile and multidrug-resistant organisms, and the "
        "value of programs that prevent them.",
        "His recent work centers on health-related social needs. He leads VA-funded evaluations of the Supportive "
        "Services for Veteran Families (SSVF) program and two NIAAA-funded R01s on rapid rehousing and "
        "alcohol-related harms. In addition, he leads projects funded by The Rockefeller Foundation to implement "
        "and evaluate Food Is Medicine interventions to address food insecurity. Finally, he has received VA "
        "funding to evaluate efforts to improve access to treatment for opioid use disorder.",
    ],
    # Majors confirmed by Rich (not in source/rich.json).
    "education": [
        {"degree": "PhD", "major": "Economics", "institution": "University of Virginia"},
        {"degree": "MA", "major": "Economics", "institution": "University of Virginia"},
        {"degree": "MS", "major": "Clinical Investigation", "institution": "University of Utah"},
        {"degree": "BS", "major": "Mathematics/Economics", "institution": "Westminster College"},
    ],
    "contact": [
        f'<a href="mailto:{src["email"]}">{src["email"]}</a>',
        "Division of Epidemiology, Department of Internal Medicine<br>University of Utah, Salt Lake City, UT",
    ],
    "footer": "Draft built from public sources (University of Utah, Google Scholar, PubMed, NIH RePORTER), "
              "October 2026. Paper list and topic tags are a first pass.",
    "reviewer": "alec.chapman@hsc.utah.edu",
}

out = "// Generated by build-data.py from source/rich.json. Do not edit by hand.\n"
for name, val in [("PROFILE", profile), ("TOPICS", [{"id": i, "label": l, "blurb": b} for i, l, b in TOPICS]),
                  ("PUBS", pubs), ("GRANTS", grants), ("CAREER", career)]:
    out += f"window.{name} = {json.dumps(val, ensure_ascii=False, indent=1)};\n"
(HERE / "data.js").write_text(out)
print(len(pubs), "papers;", sum(p["lead"] for p in pubs), "lead;", len(career), "timeline items")

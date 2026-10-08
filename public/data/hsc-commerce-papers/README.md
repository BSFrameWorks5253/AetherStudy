# 📚 HSC Commerce Board Papers Archive (2014 – 2026)
Source: [Target Publications](https://targetpublications.org/download/hsc-commerce-board-papers)

This directory contains the complete set of Maharashtra State Board HSC (Std 12) Commerce Question Papers, organized systematically by year and subject, cleanly renamed with standardized nomenclature, and audited for answer key separation.

---

## 📁 Directory Structure

```text
data/hsc-commerce-papers/
├── Questions/
│   ├── 2026/   (15 papers — March & July sessions)
│   ├── 2025/   (15 papers — March & July sessions)
│   ├── 2024/   (16 papers — March & July sessions)
│   ├── 2023/   (15 papers — March & July sessions)
│   ├── 2022/   (13 papers — March & July sessions)
│   ├── 2021/   ( 2 papers — October session)
│   ├── 2020/   ( 8 papers — March session)
│   ├── 2019/   ( 6 papers — March session)
│   ├── 2018/   (11 papers — March & July sessions)
│   ├── 2017/   (11 papers — March & July sessions)
│   ├── 2016/   (11 papers — March & July sessions)
│   ├── 2015/   (10 papers — March & October sessions)
│   └── 2014/   (11 papers — March & October sessions)
├── Solutions/
│   └── (Dedicated folder for answer keys and model solution sheets)
├── catalog_index.json    (Full JSON catalog with byte sizes and file paths)
├── manifest.json         (Scrape & download audit manifest)
└── README.md
```

---

## 🏷️ Standardized Naming Convention

Every file follows a clean, predictable naming format:

```text
HSC_Commerce_{Year}_{Session}_{Subject}_QP.pdf
```

### 🧮 Mathematics & Statistics Unification
- **Modern Years (2020–2026)**: Standardized as `HSC_Commerce_{Year}_{Session}_Mathematics_and_Statistics_QP.pdf`.
- **Legacy Years (2014–2019)**: Formerly split into separate 40-mark Part 1 & Part 2 booklets, both parts have been merged into a single, unified examination document `HSC_Commerce_{Year}_{Session}_Mathematics_and_Statistics_QP.pdf` across all sessions.

---

## 📑 Core Subjects

1. **Book Keeping & Accountancy (BK)**
2. **Economics**
3. **Organisation of Commerce & Management (OCM)**
4. **Secretarial Practice (SP)**
5. **Mathematics & Statistics** (unified Part 1 & Part 2)
6. **English**
7. **Hindi**
8. **Marathi**

---

## 🔍 Answer Keys & Solutions Separation Audit

- **Audit Result**: Target Publications' free online download library contains **only the official question papers** for board examinations.
- Solutions are published separately by Target Publications in printed books ("Smart Notes" and "Model Question Papers with Solutions").
- Any future answer key additions should be placed into `data/hsc-commerce-papers/Solutions/{Year}/` with suffix `_Solution.pdf` to keep them cleanly separated from Question Papers.
